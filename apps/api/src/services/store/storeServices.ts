import { prisma } from "../../lib/prisma";
import { createError } from "../../utils";
import { storeInput, productInput } from "./validation";
const notFound = () =>
  createError("Store or product not found.", 404, "Error_NotFound");
export const listStores = (ownerId: number) =>
  prisma.store.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true } } },
  });
export async function ownedStore(ownerId: number, id: number) {
  const store = await prisma.store.findFirst({
    where: { id, ownerId },
    include: { _count: { select: { products: true } } },
  });
  if (!store) throw notFound();
  return store;
}
export async function saveStore(ownerId: number, input: unknown, id?: number) {
  const data = storeInput(input);
  try {
    if (id === undefined)
      return await prisma.store.create({ data: { ...data, ownerId } });
    // Ownership is part of the write predicate, not a client-provided field.
    return await prisma.store.update({ where: { id, ownerId }, data });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002")
      throw createError(
        "That store URL is already taken.",
        409,
        "Error_SlugTaken",
      );
    if (code === "P2025") throw notFound();
    throw error;
  }
}
export async function listProducts(ownerId: number, storeId: number) {
  await ownedStore(ownerId, storeId);
  return prisma.storeProduct.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
  });
}
export async function saveProduct(
  ownerId: number,
  storeId: number,
  input: unknown,
  id?: number,
) {
  const data = productInput(input);
  return prisma.$transaction(async (tx) => {
    if (!(await tx.store.findFirst({ where: { id: storeId, ownerId } })))
      throw notFound();
    if (id === undefined)
      return tx.storeProduct.create({ data: { ...data, storeId } });
    const updated = await tx.storeProduct.updateMany({
      where: { id, storeId, store: { ownerId } },
      data,
    });
    if (updated.count !== 1) throw notFound();
    return tx.storeProduct.findUniqueOrThrow({ where: { id } });
  });
}
export async function deleteProduct(
  ownerId: number,
  storeId: number,
  id: number,
) {
  const deleted = await prisma.storeProduct.deleteMany({
    where: { id, storeId, store: { ownerId } },
  });
  if (deleted.count !== 1) throw notFound();
}
export async function publicStore(slug: string) {
  const store = await prisma.store.findFirst({
    where: { slug, published: true, owner: { status: "ACTIVE" } },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      currency: true,
      products: {
        where: { published: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          inventory: true,
          imageUrl: true,
        },
      },
    },
  });
  if (!store) throw notFound();
  return store;
}
