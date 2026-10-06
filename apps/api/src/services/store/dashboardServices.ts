import { prisma } from "../../lib/prisma";
import { createError } from "../../utils";
export async function storeDashboard(ownerId: number, storeId: number) {
  return prisma.$transaction(
    async (tx) => {
      const store = await tx.store.findFirst({
        where: { id: storeId, ownerId },
        select: { id: true },
      });
      if (!store) throw createError("Store not found.", 404, "Error_NotFound");
      const where = { storeId, store: { ownerId } };
      const [counts, values, recentOrders] = await Promise.all([
        tx.order.groupBy({ by: ["status"], where, _count: { _all: true } }),
        tx.order.groupBy({
          by: ["currency"],
          where: { ...where, status: "COMPLETED" },
          _sum: { totalPrice: true },
        }),
        tx.order.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 5,
          select: {
            id: true,
            code: true,
            status: true,
            currency: true,
            totalPrice: true,
            createdAt: true,
          },
        }),
      ]);
      return {
        totalOrders: counts.reduce((sum, row) => sum + row._count._all, 0),
        pendingOrders:
          counts.find((row) => row.status === "PENDING")?._count._all || 0,
        completedOrders:
          counts.find((row) => row.status === "COMPLETED")?._count._all || 0,
        completedValue: values.map((row) => ({
          currency: row.currency,
          amount: row._sum.totalPrice?.toString() || "0",
        })),
        recentOrders: recentOrders.map((row) => ({
          ...row,
          totalPrice: row.totalPrice.toString(),
        })),
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
