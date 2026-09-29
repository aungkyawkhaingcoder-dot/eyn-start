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
  return prisma.product.findMany({
    where: { storeId },
    include: { category: true, taggables: { include: { tag: true } } },
    orderBy: { createdAt: "desc" },
  });
}
export async function saveProduct(
  ownerId: number,
  storeId: number,
  input: unknown,
  id?: number,
) {
  const { categoryName, tags, ...data } = productInput(input);
  return prisma.$transaction(async (tx) => {
    if (!(await tx.store.findFirst({ where: { id: storeId, ownerId } })))
      throw notFound();
    if (
      id !== undefined &&
      !(await tx.product.findFirst({ where: { id, storeId } }))
    )
      throw notFound();
    const category = categoryName
      ? await tx.category.upsert({
          where: { storeId_name: { storeId, name: categoryName } },
          create: { storeId, name: categoryName },
          update: {},
        })
      : null;
    const values = {
      ...data,
      ...(categoryName !== undefined
        ? { categoryId: category?.id ?? null }
        : {}),
    };
    const product =
      id === undefined
        ? await tx.product.create({ data: { ...values, storeId } })
        : await tx.product.update({ where: { id, storeId }, data: values });
    if (tags !== undefined) {
      await tx.taggable.deleteMany({ where: { productId: product.id } });
      for (const name of tags) {
        const tag = await tx.tag.upsert({
          where: { storeId_name: { storeId, name } },
          create: { storeId, name },
          update: {},
        });
        await tx.taggable.create({
          data: {
            tagId: tag.id,
            productId: product.id,
            type: "product",
            typeId: product.id,
          },
        });
      }
    }
    return product;
  });
}
export async function deleteProduct(
  ownerId: number,
  storeId: number,
  id: number,
) {
  try {
    const deleted = await prisma.product.deleteMany({
      where: { id, storeId, store: { ownerId } },
    });
    if (deleted.count !== 1) throw notFound();
  } catch (error) {
    if ((error as { code?: string }).code === "P2003")
      throw createError(
        "This product has order history. Unpublish it instead.",
        409,
        "Error_ProductInUse",
      );
    throw error;
  }
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
      logoUrl: true,
      coverUrl: true,
      theme: true,
      storefrontConfig: true,
      products: {
        where: { published: true, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          inventory: true,
          imageUrl: true,
          category: { select: { id: true, name: true } },
          taggables: { select: { tag: { select: { name: true } } } },
        },
      },
    },
  });
  if (!store) throw notFound();
  const sales = await prisma.productsOnOrder.groupBy({
    by: ["productId"],
    where: {
      order: { storeId: store.id, status: "COMPLETED" },
      product: { storeId: store.id, published: true, status: "ACTIVE" },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 8,
  });
  return {
    ...store,
    bestSellerIds: sales.map((s) => (s as { productId: number }).productId),
  };
}
