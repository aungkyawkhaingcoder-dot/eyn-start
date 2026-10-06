const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { Prisma } = require("../src/generated/prisma/client.ts");
const {
  checkoutInput,
  requestKey,
} = require("../src/services/store/checkoutValidation.ts");
const input = {
  customerName: "Customer",
  phone: "0912345678",
  address: "12 Sample Street",
  notes: "",
  items: [{ productId: 1, quantity: 2 }],
};
let state;
beforeEach(() => {
  state = { stock: 5, orders: [], published: true };
});
const prisma = {
  $transaction: async (fn) => {
    const draft = JSON.parse(JSON.stringify(state));
    const tx = {
      store: {
        findFirst: async ({ where }) =>
          draft.published && where.slug === "shop-a"
            ? { id: 10, currency: "MMK", ownerId: 7 }
            : null,
      },
      product: {
        findMany: async ({ where }) =>
          where.storeId === 10 && where.id.in.includes(1)
            ? [{ id: 1, name: "Tea", price: new Prisma.Decimal("10.15") }]
            : [],
        updateMany: async ({ where, data }) => {
          if (draft.stock < where.inventory.gte) return { count: 0 };
          draft.stock -= data.inventory.decrement;
          return { count: 1 };
        },
        update: async ({ data }) => {
          draft.stock += data.inventory.increment;
        },
      },
      order: {
        findUnique: async ({ where }) =>
          draft.orders.find(
            (o) => o.requestKey === where.storeId_requestKey.requestKey,
          ) || null,
        create: async ({ data }) => {
          const { products, ...row } = data;
          const order = {
            ...row,
            totalPrice: row.totalPrice.toString(),
            id: draft.orders.length + 1,
            status: "PENDING",
            products: products.create,
          };
          draft.orders.push(order);
          return order;
        },
        findFirst: async ({ where }) =>
          where.store.ownerId === 7 && where.storeId === 10
            ? draft.orders.find((o) => o.id === where.id) || null
            : null,
        updateMany: async ({ where, data }) => {
          const row = draft.orders.find(
            (o) => o.id === where.id && o.status === where.status,
          );
          if (!row) return { count: 0 };
          row.status = data.status;
          return { count: 1 };
        },
      },
    };
    const result = await fn(tx);
    state = draft;
    return result;
  },
};
const id = require.resolve("../src/lib/prisma.ts");
require.cache[id] = { id, filename: id, loaded: true, exports: { prisma } };
const {
  createOrder,
  changeOrderStatus,
} = require("../src/services/store/orderServices.ts");
test("checkout whitelists fields and rejects duplicate, fractional and oversized quantities", () => {
  assert.equal(
    checkoutInput({ ...input, totalPrice: "0", storeId: 999 }).totalPrice,
    undefined,
  );
  for (const items of [
    [],
    [{ productId: 1, quantity: 0 }],
    [{ productId: 1, quantity: 1.5 }],
    [{ productId: 1, quantity: 1000 }],
    [
      { productId: 1, quantity: 1 },
      { productId: 1, quantity: 1 },
    ],
  ])
    assert.throws(() => checkoutInput({ ...input, items }));
  for (const key of ["", null, "x", "with spaces in the key"])
    assert.throws(() => requestKey(key));
});
test("checkout computes decimal total and captures price/name snapshots", async () => {
  const result = await createOrder(
    "shop-a",
    { ...input, totalPrice: "0" },
    "checkout-key-0001",
  );
  assert.equal(result.totalPrice, "20.3");
  assert.equal(state.stock, 3);
  assert.equal(state.orders[0].products[0].productName, "Tea");
  assert.equal(state.orders[0].products[0].unitPrice.toString(), "10.15");
});
test("same key retry creates one order and decrements inventory once", async () => {
  const first = await createOrder("shop-a", input, "checkout-key-0001");
  const retry = await createOrder("shop-a", input, "checkout-key-0001");
  assert.equal(retry.code, first.code);
  assert.equal(state.orders.length, 1);
  assert.equal(state.stock, 3);
  await assert.rejects(
    createOrder(
      "shop-a",
      { ...input, address: "Changed address" },
      "checkout-key-0001",
    ),
    (e) => e.status === 409,
  );
});
test("insufficient inventory and products from another store cannot create orders", async () => {
  await assert.rejects(
    createOrder(
      "shop-a",
      { ...input, items: [{ productId: 1, quantity: 6 }] },
      "checkout-key-0001",
    ),
    (e) => e.code === "Error_Stock",
  );
  await assert.rejects(
    createOrder(
      "shop-a",
      {
        ...input,
        items: [
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 1 },
        ],
      },
      "checkout-key-0001",
    ),
    (e) => e.code === "Error_ProductUnavailable",
  );
  assert.equal(state.stock, 5);
  assert.equal(state.orders.length, 0);
  state.published = false;
  await assert.rejects(
    createOrder("shop-a", input, "checkout-key-0001"),
    (e) => e.status === 404,
  );
});
test("cancel restores stock once; terminal order cannot be reopened", async () => {
  await createOrder("shop-a", input, "checkout-key-0001");
  await assert.rejects(
    changeOrderStatus(8, 10, 1, "CANCELLED"),
    (e) => e.status === 404,
  );
  await changeOrderStatus(7, 10, 1, "CANCELLED");
  await changeOrderStatus(7, 10, 1, "CANCELLED");
  assert.equal(state.stock, 5);
  await assert.rejects(
    changeOrderStatus(7, 10, 1, "CONFIRMED"),
    (e) => e.status === 409,
  );
});
test("completed orders require confirmation and cannot be cancelled", async () => {
  await createOrder("shop-a", input, "checkout-key-0001");
  await assert.rejects(
    changeOrderStatus(7, 10, 1, "COMPLETED"),
    (e) => e.status === 409,
  );
  await changeOrderStatus(7, 10, 1, "CONFIRMED");
  await changeOrderStatus(7, 10, 1, "COMPLETED");
  await assert.rejects(
    changeOrderStatus(7, 10, 1, "CANCELLED"),
    (e) => e.status === 409,
  );
  assert.equal(state.stock, 3);
});

test("owner checkout is rejected before stock writes and even for an existing retry key", async () => {
  await assert.rejects(createOrder("shop-a", input, "owner-checkout-key", 7), e => e.status === 403 && e.code === "Error_OwnerCheckout");
  assert.equal(state.stock, 5);
  assert.equal(state.orders.length, 0);
  await createOrder("shop-a", input, "other-buyer-key-0001", 8);
  await assert.rejects(createOrder("shop-a", input, "other-buyer-key-0001", 7), e => e.status === 403);
  assert.equal(state.orders.length, 1);
  assert.equal(state.stock, 3);
});
