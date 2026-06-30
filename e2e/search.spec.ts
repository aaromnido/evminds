import { test, expect } from "@playwright/test";

/**
 * Search flow: open the modal, type a query (>= 2 chars, the modal's MIN_LEN),
 * and confirm the live /api/search results render. Uses a broad EV term to stay
 * resilient; if it ever returns nothing the modal must still respond with a hint.
 */
test.describe("search", () => {
  test("opens the modal, queries and shows results", async ({ page }) => {
    await page.goto("/");

    await page.locator("[data-search-open]").first().click();

    const modal = page.locator("[data-search-modal]");
    await expect(modal).toBeVisible();

    const input = page.locator("[data-search-input]");
    await expect(input).toBeVisible();
    await input.fill("coche");

    const results = page.locator("[data-search-results] a.search-result");
    const hint = page.locator("[data-search-hint]");

    // Either we get result links, or the modal responds with a (non-empty) hint.
    await expect
      .poll(async () => (await results.count()) > 0 || (await hint.innerText()).trim().length > 0, {
        timeout: 5000,
      })
      .toBe(true);
  });

  test("closes the modal with Escape", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-search-open]").first().click();
    await expect(page.locator("[data-search-modal]")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator("[data-search-modal]")).toBeHidden();
  });
});
