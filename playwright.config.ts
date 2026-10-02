import { defineConfig } from "@playwright/test";

/**
 * Key journeys in a real browser (Chromium): what the Python scenarios cannot see, because they talk to the
 * server without one — a click that does not leave for Stripe, a form that saves when it should not.
 * Run only through `bash scripts/e2e.sh browser`: isolated database, fake Stripe, no real email.
 */
export default defineConfig({
  testDir: "tests/browser",
  testMatch: "*.pw.ts",
  outputDir: ".playwright",
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    // By name, as a visitor would: the dev server only gives its scripts to the address it was started for.
    baseURL: process.env.SQUIZZ_URL?.replace("127.0.0.1", "localhost"),
    locale: "fr-FR",
    trace: "retain-on-failure",
  },
});
