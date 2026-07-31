import { expect, test } from "@playwright/test";
import { expectNoSeriousAxeViolations } from "./helpers/a11y";
import { gotoApp, signInDemo } from "./helpers/app";

test.describe("primary-state accessibility", () => {
  test("login", async ({ page }) => {
    await gotoApp(page, "/login");
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    await expectNoSeriousAxeViolations(page, "login");
  });

  for (const route of [
    { path: "/dashboard", heading: "1000 Words", state: "dashboard and pre-session" },
    { path: "/profile/settings", heading: "Settings", state: "settings" },
    { path: "/shop", heading: "Rewards Shop", state: "shop" },
  ] as const) {
    test(route.state, async ({ page }) => {
      await signInDemo(page);
      await gotoApp(page, route.path);
      await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
      await expectNoSeriousAxeViolations(page, route.state);
    });
  }

  test("active, revealed, and completed study", async ({ page }) => {
    await signInDemo(page);
    await gotoApp(page, "/study/en-es");
    await expect(page.locator(".flashcard-front")).toBeVisible({ timeout: 10_000 });
    await expectNoSeriousAxeViolations(page, "active study card");

    await page.keyboard.press("Space");
    await expect(page.locator(".flashcard-back")).toBeVisible();
    await expectNoSeriousAxeViolations(page, "revealed study card");

    for (let index = 0; index < 20; index += 1) {
      if (await page.locator(".session-complete").isVisible().catch(() => false)) break;
      const easyRating = page.getByRole("button", { name: "Rate as easy" });
      if (!await easyRating.isVisible().catch(() => false)) {
        await page.keyboard.press("Space");
        await expect(easyRating).toBeVisible();
      }
      const counterBefore = await page.locator(".study-header div:last-child").innerText();
      await easyRating.click();
      await expect.poll(async () => (
        await page.locator(".session-complete").isVisible().catch(() => false)
        || await page.locator(".study-header div:last-child").innerText().catch(() => counterBefore) !== counterBefore
      )).toBe(true);
    }
    await expect(page.locator(".session-complete")).toBeVisible({ timeout: 10_000 });
    await expectNoSeriousAxeViolations(page, "study completion");
  });
});
