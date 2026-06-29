import { test, expect } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/dashboard/);
}

async function getFirstCardWord(page: import("@playwright/test").Page): Promise<string> {
  await page.getByRole("button", { name: /Study Spanish/i }).click();
  await expect(page.locator(".flashcard")).toBeVisible({ timeout: 10_000 });
  return page.locator(".flashcard-word").first().innerText();
}

test.describe("FSRS progress persistence", () => {
  test("FSRS state is saved to localStorage after rating", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: /Study Spanish/i }).click();
    await expect(page.locator(".flashcard")).toBeVisible({ timeout: 10_000 });

    // Flip and rate the first card
    await page.keyboard.press("Space");
    await expect(page.locator(".flashcard-back")).toBeVisible();
    await page.keyboard.press("4"); // Easy

    // Check localStorage has FSRS state for en-es
    const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("1000w:progress:")));
    expect(keys.length).toBeGreaterThan(0);
    const stored = await page.evaluate((key) => localStorage.getItem(key), keys[0]);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(Object.keys(parsed).length).toBeGreaterThan(0);
  });

  test("rated cards persist across page reload", async ({ page }) => {
    await signIn(page);

    // Complete the full session with all-Easy ratings so FSRS advances all due dates
    await page.getByRole("button", { name: /Study Spanish/i }).click();
    await expect(page.locator(".flashcard")).toBeVisible({ timeout: 10_000 });

    // Get first card's word before we start
    const firstWord = await page.locator(".flashcard-word").first().innerText();

    const maxCards = 20;
    for (let i = 0; i < maxCards; i++) {
      const isDone = await page.locator(".session-complete").isVisible().catch(() => false);
      if (isDone) break;
      await page.keyboard.press("Space");
      await expect(page.locator(".flashcard-back")).toBeVisible({ timeout: 5_000 });
      await page.keyboard.press("4"); // Easy — pushes next due date far out
    }
    await expect(page.locator(".session-complete")).toBeVisible({ timeout: 10_000 });

    // Navigate home then reload
    await page.getByRole("button", { name: /Home/i }).click();
    await expect(page).toHaveURL(/dashboard/);
    await page.reload();

    // Sign in again (reload clears React state but not localStorage)
    await expect(page.getByRole("heading", { name: "Sign In" }).or(page.getByRole("button", { name: /Study Spanish/i }))).toBeVisible();
    const onDashboard = await page.getByRole("button", { name: /Study Spanish/i }).isVisible().catch(() => false);
    if (!onDashboard) {
      await page.getByRole("button", { name: "Sign In" }).click();
      await expect(page).toHaveURL(/dashboard/);
    }

    // Start a new session — since we rated all cards Easy, the session should
    // introduce NEW cards (different first word) rather than replay the same ones
    const secondWord = await getFirstCardWord(page);

    // The first card in the new session should differ — Easy-rated cards are
    // scheduled far in the future so the engine serves new/different cards
    expect(secondWord).not.toBe(firstWord);
  });

  test("localStorage persists through navigation (no Supabase required)", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: /Study Spanish/i }).click();
    await expect(page.locator(".flashcard")).toBeVisible({ timeout: 10_000 });

    // Rate a few cards
    for (let i = 0; i < 3; i++) {
      const isDone = await page.locator(".session-complete").isVisible().catch(() => false);
      if (isDone) break;
      await page.keyboard.press("Space");
      await expect(page.locator(".flashcard-back")).toBeVisible({ timeout: 5_000 });
      await page.keyboard.press("3"); // Good
    }

    // Navigate to dashboard and back
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/dashboard/);

    // localStorage should still have progress
    const keys = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("1000w:progress:"))
    );
    expect(keys.length).toBeGreaterThan(0);

    // Start another session — progress retained (counter should show "3 correct" was logged)
    await page.getByRole("button", { name: /Study Spanish/i }).click();
    await expect(page.locator(".flashcard")).toBeVisible({ timeout: 10_000 });
    // Session loads successfully (no fallback "Word N" words)
    const word = await page.locator(".flashcard-word").first().innerText();
    expect(word).not.toMatch(/^Word \d+$/);
  });
});
