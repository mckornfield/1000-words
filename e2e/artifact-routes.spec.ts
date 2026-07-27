import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, gotoApp, signInDemo } from "./helpers/app";

test.describe("production artifact routes", () => {
  test.beforeEach(async ({ page }) => {
    await signInDemo(page);
  });

  for (const route of [
    { path: "/dashboard", heading: "1000 Words" },
    { path: "/study/en-es", locator: ".flashcard" },
    { path: "/profile/settings", heading: "Settings" },
  ] as const) {
    test(`loads and reloads ${route.path} under the deployment base`, async ({ page }) => {
      const response = await gotoApp(page, route.path);
      expect(response?.ok(), `static response for ${route.path}`).toBe(true);
      if ("heading" in route) {
        await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
      } else {
        await expect(page.locator(route.locator)).toBeVisible({ timeout: 10_000 });
      }
      await page.reload();
      if ("heading" in route) {
        await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
      } else {
        await expect(page.locator(route.locator)).toBeVisible({ timeout: 10_000 });
      }
      await expectNoHorizontalScroll(page);
    });
  }

  test("serves every shipped deck and a representative audio asset from dist", async ({ request }) => {
    for (const [deck, audio] of [
      ["en-es", "es/es-0001.mp3"],
      ["en-zh", "zh/zh-0001.mp3"],
      ["en-ko", "ko/ko-0001.mp3"],
      ["en-ja", "ja/ja-0001.mp3"],
    ]) {
      const deckResponse = await request.get(`assets/data/${deck}.json`);
      expect(deckResponse.ok(), `${deck} deck`).toBe(true);
      expect((await deckResponse.json()).length).toBeGreaterThan(0);
      const audioResponse = await request.get(`assets/audio/${audio}`);
      expect(audioResponse.ok(), `${deck} audio`).toBe(true);
    }
  });
});
