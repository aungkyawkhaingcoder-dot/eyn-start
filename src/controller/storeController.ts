import {
  listStoresHandler,
  createStoreHandler,
  getStoreHandler,
  updateStoreHandler,
  listStoreProductsHandler,
  createStoreProductHandler,
  updateStoreProductHandler,
  deleteStoreProductHandler,
  getPublicStoreHandler,
} from "../ControllerHandler/storeHandlers";

// Service validators retain the existing 422 responses and input whitelist.
// Like logout/refresh controllers, these endpoints delegate to named handlers.
export const listStores = listStoresHandler;
export const createStore = createStoreHandler;
export const getStore = getStoreHandler;
export const updateStore = updateStoreHandler;
export const listStoreProducts = listStoreProductsHandler;
export const createStoreProduct = createStoreProductHandler;
export const updateStoreProduct = updateStoreProductHandler;
export const deleteStoreProduct = deleteStoreProductHandler;
export const getPublicStore = getPublicStoreHandler;
