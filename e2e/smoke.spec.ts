import { test, expect } from "@playwright/test";

/**
 * Cheap 200-smoke for the remaining public routes + the category filter flow.
 *
 * NOTE: we run against `astro dev`, where @astrojs/sitemap's /sitemap-index.xml
 * is NOT served (that integration only emits at build time). We smoke the SSR
 * endpoints that DO exist in dev: /rss.xml and /sitemap-news.xml.
 */
test.describe("public routes smoke", () => {
  for (const path of [
    "/articulos",
    "/videos",
    "/medios-de-confianza",
    "/categoria/coches-electricos",
  ]) {
    test(`GET ${path} returns 200 and renders a header`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("header.site-header")).toBeVisible();
    });
  }

  for (const path of ["/rss.xml", "/sitemap-news.xml"]) {
    test(`GET ${path} returns 200 XML`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toContain("xml");
    });
  }
});

test.describe("category filter", () => {
  test("navigates from the home to a category page", async ({ page }) => {
    await page.goto("/");

    // CategoryFilter renders as a custom Select dropdown: open it, then pick a category.
    const filter = page.locator("nav.category-filter");
    await filter.locator("button.select__trigger").click();

    const categoryLink = filter.locator('a.select__option[href^="/categoria/"]').first();
    await expect(categoryLink).toBeVisible();
    await categoryLink.click();

    await expect(page).toHaveURL(/\/categoria\/.+/);
    // The category page shows either its news grid or an empty state — both fine.
    const grid = page.locator("section.news");
    const empty = page.locator(".empty-state");
    expect((await grid.count()) + (await empty.count())).toBeGreaterThan(0);
  });
});
