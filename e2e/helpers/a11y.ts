import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function expectNoSeriousAxeViolations(page: Page, state: string) {
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
  });
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const violations = result.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
  expect(violations, `${state}: ${violations.map((v) => `${v.id} (${v.nodes.length})`).join(", ")}`).toEqual([]);
}
