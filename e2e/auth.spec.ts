import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("shows sign-in page at root", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    await expect(page.getByText("Demo credentials pre-filled")).toBeVisible();
  });

  test("signs in with demo credentials and lands on dashboard", async ({ page }) => {
    await page.goto("/login");
    // Demo mode pre-fills credentials — just submit
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText("1000 Words")).toBeVisible();
  });

  test("dashboard shows both study buttons after sign-in", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByRole("button", { name: /Study Spanish/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Study Mandarin/i })).toBeVisible();
  });

  test("redirects unauthenticated user from dashboard to login", async ({ page }) => {
    // Clear any existing demo session
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
  });
});
