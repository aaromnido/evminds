import { test, expect } from "@playwright/test";

/**
 * Video detail flow: enter a video FROM the /videos listing. Videos use the
 * same card markup as news but link to /video/[slug]. Assert the player (YouTube
 * embed) or hero plus the title render.
 */
test.describe("video detail", () => {
  test("opens a video from the listing and renders the detail", async ({ page }) => {
    await page.goto("/videos");

    const firstVideoLink = page.locator("a.article-card__title-link").first();
    await expect(firstVideoLink).toBeVisible();
    await firstVideoLink.click();

    await expect(page).toHaveURL(/\/video\/.+/);
    await expect(page.locator("main.video-detail")).toBeVisible();

    const title = page.locator("h1.video-detail__title");
    await expect(title).toBeVisible();
    await expect(title).not.toBeEmpty();

    // Either the YouTube embed or the hero image fallback must be present.
    const player = page.locator(".video-detail__player iframe");
    const hero = page.locator(".video-detail__hero-image");
    expect((await player.count()) + (await hero.count())).toBeGreaterThan(0);
  });
});
