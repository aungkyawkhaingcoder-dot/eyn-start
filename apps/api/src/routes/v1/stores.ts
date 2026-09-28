import { Router } from "express";
import { listOrders, updateOrder } from "../../controller/orderController";
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
router.get("/:storeId/orders", listOrders);
router.patch("/:storeId/orders/:id", updateOrder);
router.put("/:storeId", updateStore);
router.get("/:storeId/products", listStoreProducts);
router.post("/:storeId/products", createStoreProduct);
router.put("/:storeId/products/:id", updateStoreProduct);
router.delete("/:storeId/products/:id", deleteStoreProduct);

export default router;
