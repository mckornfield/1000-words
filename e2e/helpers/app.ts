import { expect, test, type Page } from "@playwright/test";

export function appUrl(_page: Page, route = "/"): string {
  const baseURL = test.info().project.use.baseURL;
  if (typeof baseURL !== "string") throw new Error("Playwright baseURL is required");
  const base = new URL(baseURL.endsWith("/") ? baseURL : `${baseURL}/`);
  return new URL(route.replace(/^\//, ""), base).toString();
}

export async function gotoApp(page: Page, route = "/") {
  return page.goto(appUrl(page, route));
}

export async function signInDemo(page: Page) {
  await gotoApp(page, "/login");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/dashboard\/?$/);
}

export async function expectNoHorizontalScroll(page: Page) {
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
}
