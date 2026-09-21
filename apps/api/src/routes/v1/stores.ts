import { Router } from "express";
import {
  listStores,
  createStore,
  getStore,
  updateStore,
  listStoreProducts,
  createStoreProduct,
  updateStoreProduct,
  deleteStoreProduct,
} from "../../controller/storeController";
import { storeRequestMiddleware } from "../../middleware/storeRequest";

const router = Router();
router.use(storeRequestMiddleware);

router.get("/", listStores);
router.post("/", createStore);
router.get("/:storeId", getStore);
router.put("/:storeId", updateStore);
router.get("/:storeId/products", listStoreProducts);
router.post("/:storeId/products", createStoreProduct);
router.put("/:storeId/products/:id", updateStoreProduct);
router.delete("/:storeId/products/:id", deleteStoreProduct);

export default router;
