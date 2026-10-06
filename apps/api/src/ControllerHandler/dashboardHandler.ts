import type { Request, Response } from "express";
import { positiveId } from "../services/store/validation";
import { storeDashboard } from "../services/store/dashboardServices";
export async function dashboardHandler(req: Request, res: Response) {
  const ownerId = Number((req as Request & { userId: number }).userId);
  res.json(await storeDashboard(ownerId, positiveId(req.params.storeId)));
}
