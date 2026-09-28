import { test, expect } from "@playwright/test";
const product = {
  id: 1,
  name: "Studio cup",
  description: "Made for everyday rituals.",
  price: "12000.50",
  inventory: 4,
  imageUrl: "",
  category: { id: 1, name: "Home" },
  taggables: [{ tag: { name: "featured" } }],
};
const store = {
  id: 101,
  name: "Studio goods",
  slug: "studio-goods",
  description: "Objects for your everyday.",
  currency: "MMK",
  theme: "eyn-light",
  products: [product],
  bestSellerIds: [1],
};
test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/storefront/*", (route) =>
    route.fulfill({ json: store }),
  );
});
test("mobile cart, checkout, retry key and confirmation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const attempts: { key?: string; data: unknown }[] = [];
  await page.route("**/api/v1/storefront/*/orders", async (route) => {
    attempts.push({
      key: route.request().headers()["idempotency-key"],
      data: route.request().postDataJSON(),
    });
    if (attempts.length === 1) return route.abort("failed");
    if (attempts.length === 2)
      return route.fulfill({
        status: 429,
        json: { message: "Retry shortly." },
      });
    await route.fulfill({
      json: {
        code: "EYN-test123",
        status: "PENDING",
        currency: "MMK",
        totalPrice: "12000.50",
        createdAt: new Date().toISOString(),
      },
    });
  });
  await page.goto("/shop/studio-goods");
  await expect(
    page.getByRole("heading", { name: "The collection", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Add to cart", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Open shopping bag" }).click();
  await page.getByRole("button", { name: "Continue to checkout" }).click();
  await page.getByLabel("Full name").fill("Test Customer");
  await page.getByLabel("Phone number").fill("0912345678");
  await page.getByLabel("Delivery address").fill("12 Sample Street");
  await page.getByRole("button", { name: "Place order", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry this order" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry this order" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText("Retry shortly.");
  await page.getByRole("button", { name: "Retry this order" }).click();
  await expect(page.getByText("EYN-test123")).toBeVisible();
  expect(attempts[0].key).toBeTruthy();
  expect(attempts[1]).toEqual(attempts[0]);
  expect(attempts[2]).toEqual(attempts[0]);
  await page.getByRole("button", { name: "Continue shopping" }).click();
  await page.getByRole("button", { name: "Open shopping bag" }).click();
  await expect(
    page.getByRole("heading", { name: "Your bag is waiting." }),
  ).toBeVisible();
});
test("cart persists per store, filters and accessible product dialog work", async ({
  page,
}) => {
  await page.goto("/shop/studio-goods");
  await page
    .getByRole("button", { name: "Add to cart", exact: true })
    .first()
    .click();
  await page.reload();
  await page.getByRole("button", { name: "Open shopping bag" }).click();
  await expect(
    page.getByRole("dialog").getByText("Studio cup", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "View Studio cup", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Studio cup" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("searchbox", { name: "Search products" })
    .fill("missing");
  await expect(
    page.getByRole("heading", { name: "Nothing matches just yet." }),
  ).toBeVisible();
  await page.route("**/api/v1/storefront/other-store", (route) =>
    route.fulfill({
      json: { ...store, id: 102, slug: "other-store", theme: "eyn-dark" },
    }),
  );
  await page.goto("/shop/other-store");
  await page.getByRole("button", { name: "Open shopping bag" }).click();
  await expect(
    page.getByRole("heading", { name: "Your bag is waiting." }),
  ).toBeVisible();
});

test("pending checkout recovers after reload even when stock is now exhausted", async ({
  page,
}) => {
  await page.goto("/shop/studio-goods");
  await page.evaluate(() => {
    sessionStorage.setItem(
      "eyn-checkout:101",
      JSON.stringify({
        key: "recovered-checkout-key",
        payload: {
          customerName: "Customer",
          phone: "0912345678",
          address: "12 Sample Street",
          notes: "",
          items: [{ productId: 1, quantity: 4 }],
        },
      }),
    );
    localStorage.setItem("eyn-cart-v1:101", JSON.stringify({ 1: 4 }));
  });
  await page.route("**/api/v1/storefront/studio-goods", (route) =>
    route.fulfill({
      json: { ...store, products: [{ ...product, inventory: 0 }] },
    }),
  );
  await page.route("**/api/v1/storefront/studio-goods/orders", (route) => {
    expect(route.request().headers()["idempotency-key"]).toBe(
      "recovered-checkout-key",
    );
    return route.fulfill({
      json: {
        code: "EYN-recovered",
        totalPrice: "48002",
        currency: "MMK",
        status: "PENDING",
      },
    });
  });
  await page.reload();
  await page.getByRole("button", { name: "Open shopping bag" }).click();
  await page.getByRole("button", { name: "Retry this order" }).click();
  await expect(page.getByText("EYN-recovered")).toBeVisible();
});

test("desktop and dark mobile visual checks", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/shop/studio-goods");
  await expect(
    page.getByRole("heading", { name: "The collection", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "/private/tmp/eyn-storefront-desktop.png",
    fullPage: true,
  });
  await page.route("**/api/v1/storefront/studio-dark", (route) =>
    route.fulfill({
      json: { ...store, id: 102, slug: "studio-dark", theme: "eyn-dark" },
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop/studio-dark");
  await expect(
    page.getByRole("heading", { name: "The collection", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/private/tmp/eyn-storefront-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 720 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
