import { test, expect } from "@playwright/test";

/**
 * SSR + View Transitions (<ClientRouter />): navigating between pages must not
 * break, and the destination must render with its astro:page-load listeners
 * re-attached (here: the search modal still opens after a client-side nav).
 */
test.describe("navigation (View Transitions)", () => {
  test("navigates home → news detail → back without breaking", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("section.featured")).toBeVisible();

    await page.locator("#articles-grid a.article-card__title-link").first().click();
    await expect(page).toHaveURL(/\/noticia\/.+/);
    await expect(page.locator("main.article-detail")).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("section.featured")).toBeVisible();
  });

  test("client-side scripts re-attach after a View Transition", async ({ page }) => {
    await page.goto("/");

    // Navigate client-side to a category page via the filter.
    await page.goto("/videos");
    await expect(page.locator('section.news[aria-label="Últimos vídeos"]')).toBeVisible();

    // The search button (wired on astro:page-load) must still work after the nav.
    await page.locator("[data-search-open]").first().click();
    await expect(page.locator("[data-search-modal]")).toBeVisible();
  });
});
