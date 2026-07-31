import { defineConfig, devices } from "@playwright/test";

const hostedBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const localBaseURL = "http://127.0.0.1:8080/1000-words/";
const baseURL = `${hostedBaseURL ?? localBaseURL}`.replace(/\/?$/, "/");
const isHosted = Boolean(hostedBaseURL);

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    reducedMotion: "reduce",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: /hosted-smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-320",
      testMatch: /(?:artifact-routes|a11y)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 320, height: 568 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "mobile-short",
      testMatch: /(?:artifact-routes|a11y)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 667, height: 320 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "hosted-smoke",
      testMatch: /hosted-smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: isHosted ? undefined : {
    command: "pnpm --filter @1000words/app preview",
    url: localBaseURL,
    env: { ...process.env, BASE_URL: "/1000-words/" },
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
