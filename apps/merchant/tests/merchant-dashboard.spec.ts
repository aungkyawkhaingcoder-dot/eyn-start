import { test, expect } from "@playwright/test";
test("first merchant sees onboarding and can create a draft store", async ({
  page,
}) => {
  let created: Record<string, unknown> | undefined;
  const store = {
    id: 1,
    name: "Studio",
    slug: "studio",
    description: "",
    currency: "MMK",
    published: false,
    updatedAt: "2026-10-06T00:00:00Z",
    storefrontConfig: {},
  };
  await page.route("**/api/v1/stores**", async (route) => {
    const url = route.request().url();
    if (route.request().method() === "POST") {
      created = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: { ...store, ...created } });
      return;
    }
    await route.fulfill({
      json: url.endsWith("/dashboard")
        ? {
            totalOrders: 0,
            pendingOrders: 0,
            completedOrders: 0,
            completedValue: [],
            recentOrders: [],
          }
        : url.includes("/products")
          ? []
          : url.endsWith("/stores")
            ? created
              ? [store]
              : []
            : { ...store, ...created },
    });
  });
  await page.goto("/stores");
  await expect(
    page.getByRole("heading", { name: "Let’s open your first store." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Create your first store" }).click();
  await page.getByLabel("Store name", { exact: true }).fill("Studio");
  await page.getByLabel("Store URL", { exact: true }).fill("studio");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/stores\/1$/);
  expect(created?.published).toBe(false);
  await expect(
    page.getByRole("heading", { name: "Store setup" }),
  ).toBeVisible();
  await expect(page.getByText("No completed orders yet.")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Store setup" }),
  ).toBeVisible();
});
test("dashboard shows actual order totals and supports retry", async ({
  page,
}) => {
  const store = {
    id: 1,
    name: "Studio",
    slug: "studio",
    description: "Goods",
    currency: "MMK",
    published: true,
    updatedAt: "2026-10-06T00:00:00Z",
    storefrontConfig: {},
  };
  let fail = true;
  await page.route("**/api/v1/stores**", async (route) => {
    const url = route.request().url();
    if (url.endsWith("/dashboard")) {
      await route.fulfill(
        fail
          ? { status: 503, json: { message: "Dashboard unavailable" } }
          : {
              json: {
                totalOrders: 4,
                pendingOrders: 1,
                completedOrders: 2,
                completedValue: [
                  { currency: "USD", amount: "19.99" },
                  { currency: "MMK", amount: "25000" },
                ],
                recentOrders: [
                  {
                    id: 3,
                    code: "EYN-recent",
                    status: "PENDING",
                    currency: "USD",
                    totalPrice: "12.50",
                    createdAt: "2026-10-06T00:00:00Z",
                  },
                ],
              },
            },
      );
      return;
    }
    await route.fulfill({
      json: url.includes("/products")
        ? []
        : url.endsWith("/stores")
          ? [store]
          : store,
    });
  });
  await page.goto("/stores/1");
  await expect(page.getByText("Dashboard unavailable")).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("19.99 USD", { exact: true })).toBeVisible();
  await expect(page.getByText("25000 MMK", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "EYN-recent" })).toHaveAttribute(
    "href",
    "/stores/1/orders",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
