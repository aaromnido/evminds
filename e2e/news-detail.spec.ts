import { test, expect } from "@playwright/test";

/**
 * News detail flow: enter a news article FROM the home (real navigation, not a
 * hardcoded slug — the DB is production-real and slugs change). Assert the
 * detail structure renders. AI summary / related are optional per-article, so
 * they're asserted conditionally.
 */
test.describe("news detail", () => {
  test("opens a news article from the home and renders the detail", async ({ page }) => {
    await page.goto("/");

    const firstNewsLink = page.locator("#articles-grid a.article-card__title-link").first();
    await expect(firstNewsLink).toBeVisible();
    await firstNewsLink.click();

    await expect(page).toHaveURL(/\/noticia\/.+/);
    await expect(page.locator("main.article-detail")).toBeVisible();

    const title = page.locator("h1.article-detail__title");
    await expect(title).toBeVisible();
    await expect(title).not.toBeEmpty();

    // The original-source CTA is always present on a news detail.
    await expect(page.locator("a.article-detail__cta")).toBeVisible();
  });

  test("renders the AI summary section when the article has one", async ({ page }) => {
    await page.goto("/");
    await page.locator("#articles-grid a.article-card__title-link").first().click();
    await expect(page).toHaveURL(/\/noticia\/.+/);

    // Optional per-article: only assert structure when present (no failure if absent).
    const aiSummary = page.locator("section.article-detail__ai-summary");
    if (await aiSummary.count()) {
      await expect(aiSummary).toBeVisible();
      await expect(page.locator("#ai-summary-heading")).toBeVisible();
    }
  });
});
