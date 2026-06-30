import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for the PUBLIC site flows (Tarea 2).
 *
 * - Local only: NOT wired into CI yet (E2E in CI needs a server + secrets and is
 *   slow/flaky; added later). Run on demand with `pnpm e2e`.
 * - The Netlify adapter does not support `astro preview`, so Playwright spins up
 *   its own `astro dev` on a DEDICATED port (4329) — never 4321, so it can't clash
 *   with Fer's own dev server. `reuseExistingServer: false` guarantees a fresh,
 *   isolated instance that Playwright tears down when the run ends.
 * - The dev server reads from the REAL remote Supabase (read-only in these flows);
 *   there is no staging DB. That's why the admin (writes) stays out — see the plan.
 * - Uses the system Google Chrome (`channel: 'chrome'`) instead of a downloaded
 *   browser binary.
 */

const PORT = 4329;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: {
    command: `pnpm exec astro dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
