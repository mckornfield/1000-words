import { test, expect } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/dashboard/);
}

test.describe("Spanish study session", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: /Study Spanish/i }).click();
    // Wait for cards to load (loading spinner disappears)
    await expect(page.locator(".study-header")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".flashcard")).toBeVisible();
  });

  test("shows a flashcard with a Spanish word on the front", async ({ page }) => {
    // Front face visible, not flipped
    const front = page.locator(".flashcard-front");
    await expect(front).toBeVisible();
    const wordText = await page.locator(".flashcard-word").first().innerText();
    expect(wordText.trim().length).toBeGreaterThan(0);
    // Should not be "Word N" fallback
    expect(wordText).not.toMatch(/^Word \d+$/);
  });

  test("flips card with Space key and shows translation", async ({ page }) => {
    await page.keyboard.press("Space");
    const back = page.locator(".flashcard-back");
    await expect(back).toBeVisible();
    // Translation should appear (different element or color)
    const translation = page.locator(".flashcard-translation");
    await expect(translation).toBeVisible();
    const text = await translation.innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test("1–4 keyboard shortcuts advance the card", async ({ page }) => {
    const getCounter = () => page.locator(".study-header div:last-child").innerText();
    const before = await getCounter();
    expect(before).toMatch(/^1\s*\/\s*\d+/);

    // Flip then rate Good (3)
    await page.keyboard.press("Space");
    await expect(page.locator(".flashcard-back")).toBeVisible();
    await page.keyboard.press("3");

    // Card should advance to position 2
    await expect(page.locator(".study-header div:last-child")).toHaveText(/^2\s*\/\s*\d+/);
  });

  test("clicking rating buttons advances the card", async ({ page }) => {
    // Flip
    await page.locator(".flashcard-wrapper").click();
    await expect(page.locator(".study-rating-row")).toBeVisible();
    await page.getByRole("button", { name: /Good/i }).click();
    await expect(page.locator(".study-header div:last-child")).toHaveText(/^2\s*\/\s*\d+/);
  });

  test("Esc exits the study session back to dashboard", async ({ page }) => {
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/dashboard/);
  });

  test("completing all cards shows session complete screen", async ({ page }) => {
    // Rate every card as Easy to finish quickly
    const maxCards = 20;
    for (let i = 0; i < maxCards; i++) {
      const isDone = await page.locator(".session-complete").isVisible().catch(() => false);
      if (isDone) break;
      await page.keyboard.press("Space");
      await expect(page.locator(".flashcard-back")).toBeVisible({ timeout: 5_000 });
      await page.keyboard.press("4"); // Easy
    }
    await expect(page.locator(".session-complete")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".session-stat-label", { hasText: "Cards" })).toBeVisible();
    await expect(page.locator(".session-stat-label", { hasText: "Accuracy" })).toBeVisible();
    await expect(page.locator(".session-stat-label", { hasText: "XP Earned" })).toBeVisible();
  });

  test("session complete screen has Home and Study Again buttons", async ({ page }) => {
    const maxCards = 20;
    for (let i = 0; i < maxCards; i++) {
      const isDone = await page.locator(".session-complete").isVisible().catch(() => false);
      if (isDone) break;
      await page.keyboard.press("Space");
      await expect(page.locator(".flashcard-back")).toBeVisible({ timeout: 5_000 });
      await page.keyboard.press("4");
    }
    await expect(page.locator(".session-complete")).toBeVisible();
    await expect(page.getByRole("button", { name: /Home/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Study Again/i })).toBeVisible();
  });
});

test.describe("Mandarin study session", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: /Study Mandarin/i }).click();
    await expect(page.locator(".study-header")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".flashcard")).toBeVisible();
  });

  test("shows a Mandarin word on the card front", async ({ page }) => {
    const word = await page.locator(".flashcard-word").first().innerText();
    expect(word.trim().length).toBeGreaterThan(0);
    expect(word).not.toMatch(/^Word \d+$/);
  });

  test("shows pinyin pronunciation on the card back", async ({ page }) => {
    await page.keyboard.press("Space");
    await expect(page.locator(".flashcard-back")).toBeVisible();
    // Pronunciation div (italic, secondary color) should be present and non-empty
    const pronunciation = page.locator(".flashcard-back [style*='italic']");
    await expect(pronunciation).toBeVisible();
    const text = await pronunciation.innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test("header shows session title 'Mandarin'", async ({ page }) => {
    await expect(page.locator(".study-header")).toContainText("Mandarin");
  });
});
