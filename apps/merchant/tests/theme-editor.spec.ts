import { test, expect } from "@playwright/test";

test("theme edits preview immediately, restore as a draft and save their seed", async ({
  page,
}) => {
  let saved: Record<string, string | boolean> | undefined;
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
  const chooseTheme = async (name: string) => {
    await page
      .getByRole("button", { name: "Theme preset", exact: true })
      .click();
    await page
      .getByRole("button", { name: `Use ${name} theme`, exact: true })
      .click();
    await page.keyboard.press("Escape");
  };
  await page.goto("/stores/1/editor");
  const canvas = page
    .frameLocator('iframe[title="Live storefront preview"]')
    .locator(".sf");
  await expect(
    page.getByRole("button", { name: "Apply to storefront", exact: true }),
  ).toBeDisabled();
  await chooseTheme("Mint");
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
  await page
    .getByRole("button", { name: "Choose storefront design", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Design styles" }).locator("button"),
  ).toHaveCount(5);
  await page
    .getByRole("button", { name: "Use Glassmorphism design", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-design", "glassmorphism");
  await chooseTheme("Lavender");
  await expect
    .poll(() =>
      canvas.evaluate((n) =>
        (n as HTMLElement).style.getPropertyValue("--sf-button"),
      ),
    )
    .toBe("#c79ef7");
  await page
    .getByRole("button", { name: "Use dark theme", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Local draft saved" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Theme preset", exact: true }),
  ).toHaveAttribute("data-preset", "Lavender");
  await expect(
    page.getByRole("button", { name: "Use light theme", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Apply to storefront", exact: true })
    .click();
  await expect.poll(() => saved?.themeBase).toBe("0.0015");
  await expect.poll(() => saved?.designStyle).toBe("glassmorphism");
  await expect(canvas).toHaveAttribute("data-design", "glassmorphism");
  await expect.poll(() => saved?.themeHue).toBe("305");
  await expect(
    page.getByRole("status").filter({ hasText: "Saved version" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Apply to storefront", exact: true }),
  ).toBeDisabled();
  const tracks = page
    .locator(".theme-quick-toolbar > .theme-quick-control")
    .locator(".theme-slider-row .slider__track");
  await expect
    .poll(async () => {
      const accent = await tracks.nth(0).boundingBox();
      const base = await tracks.nth(1).boundingBox();
      return Math.abs((accent?.width || 0) - (base?.width || 0));
    })
    .toBeLessThan(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Theme preset")).toBeVisible();
  await page
    .getByRole("button", { name: "Choose font family", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Suggested fonts" }).locator("button"),
  ).toHaveCount(9);
  await page
    .locator(".theme-font-popover")
    .screenshot({ path: "/tmp/eyn-font-picker.png" });
  await page
    .getByRole("button", { name: "Use Figtree font", exact: true })
    .click();
  await expect
    .poll(() =>
      canvas.evaluate((n) =>
        (n as HTMLElement).style.getPropertyValue("--sf-font"),
      ),
    )
    .toContain("Figtree");
  await expect(page.getByLabel("Form radius", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Choose radius", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Radius options" }).locator("button"),
  ).toHaveCount(5);
  await page
    .locator(".theme-radius-popover")
    .screenshot({ path: "/tmp/eyn-radius-picker.png" });
  await page
    .getByRole("button", { name: "Use Medium radius", exact: true })
    .click();
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
  await expect(
    page
      .getByRole("group", { name: "Accent swatches" })
      .locator(".accent-swatch"),
  ).toHaveCount(8);
  await expect(page.locator(".accent-swatch").first()).toHaveCSS(
    "border-radius",
    "50%",
  );
  await expect(page.locator(".theme-accent-popover")).toHaveCSS(
    "width",
    "272px",
  );
  await page.getByRole("button", { name: "Next colors", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Use accent #5278f5", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Use accent #5278f5", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Accent hex", exact: true }),
  ).toHaveValue(/5278f5/i);
  await page
    .locator(".theme-accent-popover")
    .screenshot({ path: "/tmp/eyn-accent-picker.png" });
  await expect(page.locator(".accent-swatch").first()).toHaveCSS(
    "width",
    "16px",
  );
  await expect(page.locator(".accent-hue-row > button")).toHaveCSS(
    "height",
    "30px",
  );
  await page.locator(".accent-advanced summary").click();
  await page.setViewportSize({ width: 390, height: 480 });
  await expect
    .poll(async () => {
      const bounds = await page.locator(".theme-accent-popover").boundingBox();
      return !!bounds && bounds.y >= 0 && bounds.y + bounds.height <= 480;
    })
    .toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });

  await expect(page.locator(".theme-accent-popover")).toHaveCSS(
    "overflow-y",
    "auto",
  );
  await page
    .locator(".theme-accent-popover")
    .screenshot({ path: "/tmp/eyn-accent-fine-tune.png" });
  await expect(
    page.locator(".accent-advanced .slider__track").first(),
  ).toHaveCSS("background-origin", "border-box");
  await expect(
    page
      .locator(".theme-quick-toolbar > .theme-quick-control")
      .nth(1)
      .locator(".slider__track"),
  ).toHaveCSS("background-image", "none");
  const gradientBefore = await page
    .locator(".theme-quick-toolbar > .theme-quick-control")
    .first()
    .locator(".slider__track")
    .evaluate((n) => (n as HTMLElement).style.backgroundImage);
  await page
    .getByRole("slider", { name: "Accent lightness", exact: true })
    .focus();
  await page.keyboard.press("Home");
  await expect
    .poll(() =>
      page
        .locator(".theme-quick-toolbar > .theme-quick-control")
        .first()
        .locator(".slider__track")
        .evaluate((n) => (n as HTMLElement).style.backgroundImage),
    )
    .not.toBe(gradientBefore);
  await page.keyboard.press("Escape");
  await chooseTheme("Mint");
  const primaryBeforeBase = await canvas.evaluate((n) =>
    (n as HTMLElement).style.getPropertyValue("--sf-button"),
  );
  const backgroundBeforeBase = await canvas.evaluate((n) =>
    (n as HTMLElement).style.getPropertyValue("--sf-bg"),
  );
  await page.getByRole("slider", { name: "Base tint", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("slider", { name: "Base tint", exact: true }),
  ).toHaveValue("0.02");
  await expect
    .poll(() =>
      canvas.evaluate((n) =>
        (n as HTMLElement).style.getPropertyValue("--sf-button"),
      ),
    )
    .toBe(primaryBeforeBase);
  await expect
    .poll(() =>
      canvas.evaluate((n) =>
        (n as HTMLElement).style.getPropertyValue("--sf-bg"),
      ),
    )
    .not.toBe(backgroundBeforeBase);
  await page.getByRole("button", { name: "Theme preset", exact: true }).click();
  await expect(
    page.getByRole("group", { name: "Theme presets" }).getByRole("button"),
  ).toHaveCount(11);
  await expect(page.locator(".theme-preset-popover")).toBeVisible();
  await page.waitForTimeout(250);
  await page.screenshot({
    path: "/tmp/eyn-theme-preset-mobile.png",
    fullPage: true,
  });
  await page
    .locator(".theme-vibrant-switch [data-slot=switch-control]")
    .click();
  await expect(
    page.getByRole("switch", { name: "Vibrant palette" }),
  ).toBeChecked();
  const primaryBeforeRandom = await canvas.evaluate((n) =>
    (n as HTMLElement).style.getPropertyValue("--sf-button"),
  );
  await page.keyboard.press("t");
  await expect
    .poll(() =>
      canvas.evaluate((n) =>
        (n as HTMLElement).style.getPropertyValue("--sf-button"),
      ),
    )
    .not.toBe(primaryBeforeRandom);
  await expect(
    page.getByRole("button", { name: "Theme preset", exact: true }),
  ).toHaveAttribute("data-preset", "Custom");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Apply to storefront", exact: true })
    .click();
  await expect.poll(() => saved?.themeVibrant).toBe(true);
  await expect.poll(() => saved?.fontFamily).toBe("figtree");

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
