import { Request, Response } from "express";
import { positiveId } from "../services/store/validation";
import * as storeService from "../services/store/storeServices";

// authMiddleware sets userId before private store handlers run.
function owner(req: Request): number {
  return Number((req as Request & { userId: number }).userId);
}

export async function listStoresHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await storeService.listStores(owner(req));
  res.status(200).json(result);
}

export async function createStoreHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await storeService.saveStore(owner(req), req.body);
  res.status(201).json(result);
}

export async function getStoreHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await storeService.ownedStore(
    owner(req),
    positiveId(req.params.storeId),
  );
  res.status(200).json(result);
}

export async function updateStoreHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await storeService.saveStore(
    owner(req),
    req.body,
    positiveId(req.params.storeId),
  );
  res.status(200).json(result);
}

export async function listStoreProductsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await storeService.listProducts(
    owner(req),
    positiveId(req.params.storeId),
  );
  res.status(200).json(result);
}

export async function createStoreProductHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await storeService.saveProduct(
    owner(req),
    positiveId(req.params.storeId),
    req.body,
  );
  res.status(201).json(result);
}

export async function updateStoreProductHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await storeService.saveProduct(
    owner(req),
    positiveId(req.params.storeId),
    req.body,
    positiveId(req.params.id),
  );
  res.status(200).json(result);
}

export async function deleteStoreProductHandler(
  req: Request,
  res: Response,
): Promise<void> {
  await storeService.deleteProduct(
    owner(req),
    positiveId(req.params.storeId),
    positiveId(req.params.id),
  );
  res.status(204).end();
}

export async function getPublicStoreHandler(
  req: Request,
  res: Response,
): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  const result = await storeService.publicStore(req.params.slug as string);
  res.status(200).json(result);
}
