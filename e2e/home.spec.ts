import { test, expect } from "@playwright/test";

/**
 * Smoke test for the public home page. Doubles as the setup-validation spec:
 * if this passes, the whole toolchain works (astro dev on the dedicated port,
 * system Chrome via channel, SSR render reading from the real remote Supabase).
 *
 * Resilient to changing data: we assert STRUCTURE and counts > 0, never exact
 * article titles (the DB is production-real and its content changes).
 */
test.describe("home", () => {
  test("loads and renders the core layout", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);

    await expect(page.locator("header.site-header")).toBeVisible();
    await expect(page.locator('nav[aria-label="Navegación principal"]')).toBeVisible();
    await expect(page.locator("footer.site-footer")).toBeVisible();
  });

  test("renders the featured section and the news grid with content", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator('section.featured[aria-label="Noticias destacadas"]')).toBeVisible();

    const cards = page.locator("#articles-grid article.article-card");
    expect(await cards.count()).toBeGreaterThan(0);
  });
});
