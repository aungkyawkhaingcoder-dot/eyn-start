import { test, expect } from "@playwright/test";
test("landing entry, preview and mobile layout", async ({ page }) => {
  await page.goto("http://localhost:3101");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "what you sell",
  );
  await expect(
    page.getByRole("link", { name: "Create your store" }).first(),
  ).toHaveAttribute("href", "http://localhost:3000/login");
  await expect(page.getByText("Illustrative storefront preview")).toBeVisible();
  await page.screenshot({
    path:
      "/tmp/eyn-phase2-" +
      (page.url().includes("3101") ? "landing" : "admin") +
      ".png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("admin denies an unauthenticated session and a non-admin login", async ({
  page,
}) => {
  await page.route("**/api/v1/admin/session", (route) =>
    route.fulfill({
      status: 403,
      json: { message: "An active administrator account is required." },
    }),
  );
  await page.route("**/api/v1/email/login", (route) =>
    route.fulfill({ json: { message: "Signed in" } }),
  );
  await page.goto("http://localhost:3102");
  await expect(
    page.getByRole("heading", { name: "Administrator sign in" }),
  ).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("merchant@example.com");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "administrator" }),
  ).toContainText("administrator");
  await expect(
    page.getByRole("heading", { name: "Administration", exact: true }),
  ).toHaveCount(0);
});
test("admin session opens foundation and sign out removes it", async ({
  page,
}) => {
  await page.route("**/api/v1/admin/session", (route) =>
    route.fulfill({
      json: { admin: { id: 7, role: "ADMIN", status: "ACTIVE" } },
    }),
  );
  await page.route("**/api/v1/logout", (route) =>
    route.fulfill({ json: { message: "Signed out" } }),
  );
  await page.goto("http://localhost:3102");
  await expect(
    page.getByRole("heading", { name: "Administration", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Coming next", { exact: true })).toHaveCount(6);
  await page.screenshot({
    path:
      "/tmp/eyn-phase2-" +
      (page.url().includes("3101") ? "landing" : "admin") +
      ".png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("heading", { name: "Administrator sign in" }),
  ).toBeVisible();
});
