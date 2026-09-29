import { test, expect } from "@playwright/test";
for (const width of [390, 1440])
  for (const name of [
    "Everyday wardrobe — clothing and accessories for the whole family",
    "မင်္ဂလာပါ အိမ်ချက်စားသောက်ကုန်နှင့် ဒေသထွက်ပစ္စည်းအရောင်းဆိုင်",
    "HomeAndEverydayEssentials".repeat(5),
  ]) {
    test(`catalog ${width} ${name.slice(0, 18)}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.route("**/broken-*", (r) =>
        r.fulfill({ status: 404, body: "" }),
      );
      await page.route("**/api/v1/storefront/sample", (r) =>
        r.fulfill({
          json: {
            id: 900,
            name,
            slug: "sample",
            description: name.repeat(3),
            currency: "MMK",
            theme: "eyn-light",
            logoUrl: "https://example.com/broken-logo",
            coverUrl: "https://example.com/broken-cover",
            bestSellerIds: [],
            products: [
              {
                id: 1,
                name,
                description: name,
                price: "12000",
                inventory: 3,
                imageUrl: "https://example.com/broken-product",
                category: { id: 1, name },
                taggables: [],
              },
            ],
          },
        }),
      );
      await page.goto("/shop/sample");
      await expect(page.locator(".sf-hero-placeholder")).toBeVisible();
      await expect(page.locator(".sf-monogram")).toBeVisible();
      await expect(page.locator(".sf-product-image svg")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page
        .getByRole("searchbox", { name: "Search products" })
        .fill("no-match-xyz");
      await expect(page.getByText("Nothing matches just yet.")).toBeVisible();
      await page.getByRole("button", { name: "Clear filters" }).click();
      await expect(page.locator(".sf-product")).toHaveCount(1);
    });
  }
test("empty catalog omits filters and fabricated merchandising", async ({
  page,
}) => {
  await page.route("**/api/v1/storefront/empty", (r) =>
    r.fulfill({
      json: {
        id: 901,
        name: "New shop",
        slug: "empty",
        description: "",
        currency: "MMK",
        theme: "eyn-light",
        products: [],
        bestSellerIds: [],
      },
    }),
  );
  await page.goto("/shop/empty");
  await expect(page.getByText("Something good is coming.")).toBeVisible();
  await expect(page.getByRole("searchbox")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Best sellers", exact: true }),
  ).toHaveCount(0);
});
