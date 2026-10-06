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

for (const width of [390, 1440]) {
  test(`design styles remain shoppable at ${width}px in light and dark`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const styles = [
      "liquid-glass", "glassmorphism",
      "neumorphism",
      "claymorphism",
      "flat",
    ];
    let style = "flat",
      theme = "eyn-light",
      backgroundEffect = "theme";
    await page.route("**/api/v1/storefront/designs", (route) =>
      route.fulfill({
        json: {
          id: 903,
          name: "Everyday Studio",
          slug: "designs",
          description: "Considered essentials for your everyday.",
          currency: "MMK",
          theme,
          storefrontConfig: { designStyle: style, backgroundEffect },
          bestSellerIds: [],
          products: Array.from({ length: 4 }, (_, i) => ({
            id: i + 1,
            name: [
              "Everyday carry",
              "Ceramic cup",
              "Linen essential",
              "Desk companion",
            ][i],
            description: "A useful everyday favourite",
            price: "18000",
            inventory: 5,
            imageUrl: "",
            category: { id: 1, name: "Everyday" },
            taggables: [],
          })),
        },
      }),
    );
    for (backgroundEffect of ["theme", "blobs", "mesh"])
    for (theme of ["eyn-light", "eyn-dark"])
      for (style of styles) {
        await page.goto("/shop/designs");
        await expect(page.locator(".sf")).toHaveAttribute("data-design", style);
        await expect(page.locator(".sf-product")).toHaveCount(4);
        await expect(page.locator(".sf-product-open").first()).toHaveCSS("border-top-width", "0px");
        await expect(page.locator(".sf-product-open").first()).toHaveCSS("box-shadow", "none");
        if (["liquid-glass", "glassmorphism"].includes(style)) {
          for (const selector of [".sf-product", ".sf-spotlight"]) {
            await expect(page.locator(selector).first()).toHaveCSS("border-top-width", "0px");
            await expect(page.locator(selector).first()).toHaveCSS("border-bottom-width", "0px");
          }
        }
        if (theme === "eyn-light" && backgroundEffect === "theme" && ["claymorphism", "glassmorphism"].includes(style)) {
          if (style === "glassmorphism") {
            await expect(page.locator(".sf-hero")).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
            await expect(page.locator(".sf-hero")).toHaveCSS("backdrop-filter", theme === "eyn-light" ? "none" : "blur(8px)");
          } else await expect(page.locator(".sf-hero")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
          await page.screenshot({path:`/tmp/eyn-light-theme-${style}-${width}.png`});
        }
        if (theme === "eyn-dark" && backgroundEffect === "theme") {
          await expect(page.locator(".sf-header")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
          if (style === "glassmorphism") {
            await expect(page.locator(".sf-hero")).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
            await expect(page.locator(".sf-hero")).toHaveCSS("backdrop-filter", theme === "eyn-light" ? "none" : "blur(8px)");
          } else await expect(page.locator(".sf-hero")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
          await page.screenshot({path:`/tmp/eyn-dark-theme-${style}-${width}.png`});
        }
        if (style === "liquid-glass") {
          const card = page.locator(".sf-spotlight");
          await expect(card).toHaveCSS("backdrop-filter", "blur(20px) saturate(1.7)");
          await expect(card).toHaveCSS("background-image", /radial-gradient/);
          await page.screenshot({ path: `/tmp/eyn-liquid-${theme}-${backgroundEffect}-${width}.png` });
        }
        if (["glassmorphism", "flat"].includes(style) && backgroundEffect === "mesh")
          await page.screenshot({path:`/tmp/eyn-review-${style}-${theme}-${width}.png`, fullPage:true});
        if (style === "maximalism")
          await expect(page.locator(".sf-product").first()).toHaveCSS(
            "border-top-width",
            "2px",
          );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page
          .getByRole("button", { name: "Discover Everyday carry", exact: true })
          .click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
        await page
          .getByRole("searchbox", { name: "Search products" })
          .fill("Ceramic");
        await expect(page.locator(".sf-product")).toHaveCount(1);
        await page.getByRole("searchbox", { name: "Search products" }).fill("");
        await page
          .locator(".sf-product")
          .first()
          .getByRole("button", { name: "Add to cart", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Open shopping bag", exact: true })
          .click();
        await expect(
          page.getByRole("button", {
            name: "Continue to checkout",
            exact: true,
          }),
        ).toBeEnabled();
        await page
          .getByRole("button", { name: "Remove Everyday carry", exact: true })
          .click();
        await page.keyboard.press("Escape");
        if (
          theme === "eyn-light" &&
          ["flat", "glassmorphism", "claymorphism"].includes(style)
        )
          await page.screenshot({
            path: `/tmp/eyn-design-${style}-${width}.png`,
            fullPage: true,
          });
      }
  });
}

for (const effect of ["blobs", "mesh"]) {
  test(`active category stays visible on ${effect}`, async ({ page }) => {
    await page.route("**/api/v1/storefront/filters", (route) =>
      route.fulfill({
        json: {
          id: 904,
          name: "Filters",
          slug: "filters",
          currency: "MMK",
          theme: "eyn-light",
          description: "",
          storefrontConfig: {
            backgroundEffect: effect,
            primary: "#2458cc",
            buttonText: "#ffffff",
            accent: "#2458cc",
          },
          products: [
            {
              id: 1,
              name: "Sample",
              description: "",
              price: "1000",
              inventory: 2,
              imageUrl: "",
              category: { id: 1, name: "Accessories" },
            },
          ],
          bestSellerIds: [],
        },
      }),
    );
    await page.goto("/shop/filters");
    const all = page.getByRole("button", { name: "All products", exact: true });
    const category = page.getByRole("button", {
      name: "Accessories",
      exact: true,
    });
    const activeBackground = await all.evaluate(
      (n) => getComputedStyle(n).backgroundColor,
    );
    expect(activeBackground).not.toBe("rgba(0, 0, 0, 0)");
    expect(activeBackground).not.toBe("rgb(36, 88, 204)");
    await expect(all).toHaveCSS("border-top-width", "0px");
    expect(
      await all.evaluate((n) => getComputedStyle(n, "::after").content),
    ).toBe("none");
    await category.click();
    await expect(category).toHaveAttribute("aria-pressed", "true");
    await expect(category).toHaveCSS("background-color", activeBackground);
    await expect(all).toHaveAttribute("aria-pressed", "false");
    await expect(all).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(page.locator(".sf")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );
  });
}
