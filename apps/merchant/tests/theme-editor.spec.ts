import { test, expect } from "@playwright/test";

test("theme edits preview immediately, restore as a draft and save their seed", async ({
  page,
}) => {
  let saved: Record<string, string> | undefined;
  let store = {
    id: 1,
    name: "Studio",
    slug: "studio",
    description: "Everyday essentials",
    currency: "MMK",
    published: true,
    theme: "eyn-light",
    storefrontConfig: {},
    updatedAt: "2026-09-29T00:00:00Z",
  };
  await page.route("**/api/v1/stores**", async (route) => {
    if (route.request().method() === "PUT") {
      const data = route.request().postDataJSON();
      saved = data.storefrontConfig;
      store = { ...store, ...data, updatedAt: "2026-09-29T01:00:00Z" };
    }
    await route.fulfill({
      json: route.request().url().includes("/products")
        ? []
        : route.request().url().endsWith("/stores")
          ? [store]
          : store,
    });
  });
  await page.goto("/stores/1/editor");
  const canvas = page
    .frameLocator('iframe[title="Live storefront preview"]')
    .locator(".sf");
  await expect(
    page.getByRole("button", { name: "Apply to storefront", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Theme preset").selectOption("Mint");
  await expect(
    page.getByRole("button", { name: "Apply to storefront", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Discard draft", exact: true })
    .click();
  // Wait past autosave: discarded state must not be recreated by the timer.
  await page.waitForTimeout(550);
  expect(
    await page.evaluate(() => sessionStorage.getItem("eyn-design-draft:1")),
  ).toBeNull();
  await expect(
    page.getByRole("button", { name: "Apply to storefront", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Theme preset").selectOption("Lavender");
  await expect
    .poll(() =>
      canvas.evaluate((n) =>
        (n as HTMLElement).style.getPropertyValue("--sf-button"),
      ),
    )
    .toBe("#a8abff");
  await page
    .getByRole("button", { name: "Use dark theme", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Local draft saved" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Theme preset")).toHaveValue("Lavender");
  await expect(
    page.getByRole("button", { name: "Use light theme", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Apply to storefront", exact: true })
    .click();
  await expect.poll(() => saved?.themeBase).toBe("0.016");
  await expect.poll(() => saved?.themeHue).toBe("281.6396234331059");
  await expect(
    page.getByRole("status").filter({ hasText: "Saved version" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Apply to storefront", exact: true }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Theme preset")).toBeVisible();
  await page
    .getByRole("button", { name: "Typography and shape", exact: true })
    .click();
  await page.getByLabel("Font family", { exact: true }).selectOption("arial");
  await page.getByLabel("Form radius", { exact: true }).selectOption("12");
  await page.keyboard.press("Escape");
  await expect
    .poll(() =>
      canvas.evaluate((n) =>
        (n as HTMLElement).style.getPropertyValue("--sf-form-radius"),
      ),
    )
    .toBe("12px");
  await page
    .getByRole("button", { name: "Edit accent color", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use Mint palette", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Theme preset")).toHaveValue("Mint");

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
