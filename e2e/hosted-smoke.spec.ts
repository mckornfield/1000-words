import { expect, test, type Page } from "@playwright/test";
import { appUrl, gotoApp, signInDemo } from "./helpers/app";

const failures = new WeakMap<Page, string[]>();
const assetTypes = new Set(["script", "stylesheet", "image", "media", "font"]);

function watchHostedRuntime(page: Page): void {
  const seen: string[] = [];
  failures.set(page, seen);
  page.on("pageerror", (error) => seen.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") seen.push(`console.error: ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    if (assetTypes.has(request.resourceType()) || request.url().includes("/assets/")) {
      seen.push(`asset request failed: ${request.url()} (${request.failure()?.errorText ?? "unknown"})`);
    }
  });
  page.on("response", (response) => {
    const request = response.request();
    if ((assetTypes.has(request.resourceType()) || response.url().includes("/assets/")) && response.status() >= 400) {
      seen.push(`asset response ${response.status()}: ${response.url()}`);
    }
  });
}

function expectCleanRuntime(page: Page): void {
  expect(failures.get(page) ?? [], "unexpected hosted page, console, or asset failures").toEqual([]);
}

async function expectScreen(page: Page, route: string): Promise<void> {
  await expect(page).toHaveURL(appUrl(page, route));
  if (route === "/dashboard") {
    await expect(page.getByRole("heading", { name: "1000 Words" })).toBeVisible();
  } else if (route === "/study/en-es") {
    await expect(page.locator(".flashcard")).toBeVisible({ timeout: 10_000 });
  } else {
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  }
}

test.describe("hosted Pages smoke", () => {
  test.beforeEach(async ({ page }) => watchHostedRuntime(page));
  test.afterEach(async ({ page }) => expectCleanRuntime(page));

  test("root transport, expected login screen, manifest, and compiled assets are reachable", async ({ page, request }) => {
    const response = await gotoApp(page, "/");
    expect(response?.status(), "root transport must be HTTP 200").toBe(200);
    await expect(page).toHaveURL(appUrl(page, "/"));
    await expect(page).toHaveTitle(/1000 Words/i);
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    await expect(page.getByText("Demo credentials pre-filled")).toBeVisible();

    const manifest = await request.get(appUrl(page, "/manifest.webmanifest"));
    expect(manifest.status(), "manifest transport").toBe(200);
    expect((await manifest.json()).icons.length).toBeGreaterThan(0);
  });

  test("demo sign-in reaches and retains the authenticated dashboard route", async ({ page }) => {
    await signInDemo(page);
    await expectScreen(page, "/dashboard");
    await page.reload();
    await expectScreen(page, "/dashboard");
  });

  for (const route of ["/dashboard", "/study/en-es", "/profile/settings"] as const) {
    test(`deep-link transport and SPA recovery are independently verified for ${route}`, async ({ page }) => {
      await signInDemo(page);

      const directTransport = await gotoApp(page, route);
      expect(
        [200, 404],
        `${route} document transport may be index.html (200) or the Pages fallback (404)`,
      ).toContain(directTransport?.status());
      await expectScreen(page, route);

      const reloadTransport = await page.reload();
      expect(
        [200, 404],
        `${route} reload transport may be index.html (200) or the Pages fallback (404)`,
      ).toContain(reloadTransport?.status());
      await expectScreen(page, route);
    });
  }
});
