import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { createError } from "../../utils";
import { ownedStore } from "./storeServices";
import { checkoutInput, requestKey } from "./checkoutValidation";

const receiptSelect = {
  code: true,
  status: true,
  totalPrice: true,
  currency: true,
  createdAt: true,
} as const;
export async function createOrder(slug: string, input: unknown, key: unknown, buyerId?: number) {
  const data = checkoutInput(input),
    idempotencyKey = requestKey(key);
  const hash = createHash("sha256").update(JSON.stringify(data)).digest("hex");
  // Serialize conflicting stock writes and retry serialization failures using the same key.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const store = await tx.store.findFirst({
            where: { slug, published: true, owner: { status: "ACTIVE" } },
            select: { id: true, currency: true, ownerId: true },
          });
          if (!store)
            throw createError("Store not found.", 404, "Error_NotFound");
          if (buyerId !== undefined && store.ownerId === Number(buyerId))
            throw createError(
              "You cannot check out from your own store. Use the editor to preview your store.",
              403,
              "Error_OwnerCheckout",
            );
          const existing = await tx.order.findUnique({
            where: {
              storeId_requestKey: {
                storeId: store.id,
                requestKey: idempotencyKey,
              },
            },
            select: { ...receiptSelect, requestHash: true },
          });
          if (existing) {
            if (existing.requestHash !== hash)
              throw createError(
                "This checkout key was already used for a different order.",
                409,
                "Error_IdempotencyConflict",
              );
            const { requestHash: _, ...receipt } = existing;
            return receipt;
          }
          const products = await tx.product.findMany({
            where: {
              id: { in: data.items.map((i) => i.productId) },
              storeId: store.id,
              published: true,
              status: "ACTIVE",
            },
          });
          let total = new Prisma.Decimal(0);
          const lines = [];
          for (const item of data.items) {
            const product = products.find((p) => p.id === item.productId);
            if (!product)
              throw createError(
                "A product in your cart is no longer available.",
                409,
                "Error_ProductUnavailable",
              );
            const changed = await tx.product.updateMany({
              where: {
                id: product.id,
                storeId: store.id,
                inventory: { gte: item.quantity },
                published: true,
                status: "ACTIVE",
              },
              data: { inventory: { decrement: item.quantity } },
            });
            if (changed.count !== 1)
              throw createError(
                `Not enough stock for ${product.name}.`,
                409,
                "Error_Stock",
              );
            total = total.add(product.price.mul(item.quantity));
            lines.push({
              productId: product.id,
              quantity: item.quantity,
              productName: product.name,
              unitPrice: product.price,
            });
          }
          const { items: _, ...customer } = data;
          if (total.gte("100000000000000"))
            throw createError(
              "Order total exceeds the supported limit.",
              422,
              "Error_OrderTotal",
            );
          return tx.order.create({
            data: {
              ...customer,
              storeId: store.id,
              currency: store.currency,
              totalPrice: total,
              requestKey: idempotencyKey,
              requestHash: hash,
              code: `EYN-${randomUUID().replace(/-/g, "").slice(0, 16)}`,
              products: { create: lines },
            },
            select: receiptSelect,
          });
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (
        ["P2034", "P2002"].includes((error as { code?: string }).code || "")
      ) {
        if (attempt < 2) continue;
        throw createError(
          "Checkout is busy. Retry this order.",
          503,
          "Error_CheckoutBusy",
        );
      }
      throw error;
    }
  }
  throw createError(
    "Checkout is busy. Retry with the same checkout key.",
    503,
    "Error_CheckoutBusy",
  );
}

export async function listOrders(
  ownerId: number,
  storeId: number,
  page: number,
) {
  await ownedStore(ownerId, storeId);
  return prisma.order.findMany({
    where: { storeId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 30,
    skip: (page - 1) * 30,
    select: {
      ...receiptSelect,
      id: true,
      customerName: true,
      phone: true,
      address: true,
      notes: true,
      products: {
        select: {
          productId: true,
          productName: true,
          quantity: true,
          unitPrice: true,
        },
      },
    },
  });
}

export async function changeOrderStatus(
  ownerId: number,
  storeId: number,
  id: number,
  status: unknown,
) {
  if (!["CONFIRMED", "COMPLETED", "CANCELLED"].includes(String(status)))
    throw createError("Invalid order status.", 422, "Error_Validation");
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id, storeId, store: { ownerId } },
      include: { products: true },
    });
    if (!order) throw createError("Order not found.", 404, "Error_NotFound");
    if (order.status === status) return { id, status };
    const allowed =
      order.status === "PENDING"
        ? ["CONFIRMED", "CANCELLED"]
        : order.status === "CONFIRMED"
          ? ["COMPLETED", "CANCELLED"]
          : [];
    if (!allowed.includes(String(status)))
      throw createError(
        "That order status change is not allowed.",
        409,
        "Error_OrderStatus",
      );
    const changed = await tx.order.updateMany({
      where: { id, storeId, status: order.status },
      data: { status: status as "CONFIRMED" | "COMPLETED" | "CANCELLED" },
    });
    if (changed.count !== 1)
      throw createError(
        "Order changed. Refresh and try again.",
        409,
        "Error_OrderConflict",
      );
    if (status === "CANCELLED") {
      for (const line of order.products)
        await tx.product.update({
          where: { id: line.productId, storeId },
          data: { inventory: { increment: line.quantity } },
        });
    }
    return { id, status };
  });
}
