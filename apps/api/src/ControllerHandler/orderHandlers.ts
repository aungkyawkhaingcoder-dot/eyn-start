import { Request, Response } from "express";
import * as orders from "../services/store/orderServices";
import { positiveId } from "../services/store/validation";
export async function checkoutHandler(req: Request, res: Response) {
  if (!req.is("application/json"))
    return res.status(415).json({ message: "Use application/json." });
  const result = await orders.createOrder(
    String(req.params.slug),
    req.body,
    req.headers["idempotency-key"],
  );
  res.setHeader("Cache-Control", "no-store");
  return res.status(201).json(result);
}
export async function listOrdersHandler(req: Request, res: Response) {
  const ownerId = Number((req as Request & { userId: number }).userId);
  res.json(
    await orders.listOrders(
      ownerId,
      positiveId(req.params.storeId),
      positiveId(req.query.page ?? "1"),
    ),
  );
}
export async function updateOrderHandler(req: Request, res: Response) {
  const ownerId = Number((req as Request & { userId: number }).userId);
  res.json(
    await orders.changeOrderStatus(
      ownerId,
      positiveId(req.params.storeId),
      positiveId(req.params.id),
      req.body?.status,
    ),
  );
}
