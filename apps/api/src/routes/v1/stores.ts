import * as domains from "../../ControllerHandler/domainHandlers";
import { rateLimit } from "express-rate-limit";
import { dashboardHandler } from "../../ControllerHandler/dashboardHandler";
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

router.get("/:storeId/domains", domains.list);
router.post("/:storeId/domains", rateLimit({windowMs:60000,limit:10}), domains.claim);
router.post("/:storeId/domains/:id/verify", rateLimit({windowMs:60000,limit:5}), domains.verify);
router.delete("/:storeId/domains/:id", domains.remove);
router.get("/", listStores);
router.post("/", createStore);
router.get("/:storeId", getStore);
router.get("/:storeId/dashboard", dashboardHandler);
router.get("/:storeId/orders", listOrders);
router.patch("/:storeId/orders/:id", updateOrder);
router.put("/:storeId", updateStore);
router.get("/:storeId/products", listStoreProducts);
router.post("/:storeId/products", createStoreProduct);
router.put("/:storeId/products/:id", updateStoreProduct);
router.delete("/:storeId/products/:id", deleteStoreProduct);

export default router;
