import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  expect,
  test as base,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";

// Same guard as the Python scenarios: the isolated test server only, never development or production data.
if (process.env.NEXT_DIST_DIR !== ".next-e2e" || !process.env.SQUIZZ_URL || !process.env.STRIPE_MOCK_URL)
  throw new Error("Tests navigateur : à lancer par « bash scripts/e2e.sh browser » uniquement.");

const hex = (bytes = 4) => randomBytes(bytes).toString("hex");

/**
 * The server under test is a production build (`bash scripts/e2e.sh browser-prod`) rather than the dev
 * server: no confirmation link in answers, real rate limits, Stripe not replaceable by the fake one.
 */
export const PRODUCTION_BUILD = process.env.SQUIZZ_BROWSER_BUILD === "production";

/**
 * The production build tells browsers to load everything over https (« upgrade-insecure-requests »).
 * Chromium leaves localhost alone; WebKit applies it there too, even with Playwright's `bypassCSP`, and
 * the test server is plain http: no script loads and the forms stay disabled. For WebKit only, that one
 * directive is taken out of the pages' policy on their way to the browser; the rest of the policy stays.
 */
export async function plainHttp(context: BrowserContext) {
  if (!PRODUCTION_BUILD || context.browser()?.browserType().name() !== "webkit") return;
  await context.route("**/*", async (route) => {
    if (!route.request().isNavigationRequest()) return route.fallback();
    // Redirects are handed to the browser as they are, so the address bar follows them.
    const response = await route.fetch({ maxRedirects: 0 });
    const headers = response.headers();
    const policy = headers["content-security-policy"];
    if (policy) headers["content-security-policy"] = policy.replace(/;?\s*upgrade-insecure-requests/, "");
    await route.fulfill({ response, headers });
  });
}

/** `test` of the browser journeys: the page of each test goes through `plainHttp`. */
export const test = base.extend({
  context: async ({ context }, run) => {
    await plainHttp(context);
    await run(context);
  },
});

/** SQL on the isolated test database only, as tests/helpers.py does. */
export function sql(query: string) {
  const url = (process.env.DATABASE_URL ?? "").split("?")[0];
  if (!/_(e2e|test)$/.test(url) || !/(@|\/\/)(localhost|127\.0\.0\.1)[:/]/.test(url))
    throw new Error("Base isolée obligatoire.");
  return execFileSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-Atqc", query], { encoding: "utf8" }).trim();
}

export type Account = { organization: string; email: string; password: string };
export const newIdentity = (): Account => ({
  organization: `Org navigateur ${hex(3)}`,
  email: `navigateur-${hex(6)}@example.test`,
  password: `Motdepasse-${hex(4)}`,
});

/** A confirmed account on the free plan, made through the API (the sign-up form has its own test). */
export async function newAccount(request: APIRequestContext, suite?: string): Promise<Account> {
  const account = newIdentity();
  const signup = await request.post("/api/account/signup", {
    data: { name: "Admin Test", ...account, ...(suite && { suite }) },
    // Each account from its own address: a production build allows five sign-ups an hour from one.
    headers: { "X-Real-IP": `192.0.2.${1 + Math.floor(Math.random() * 250)}` },
  });
  expect(signup.ok()).toBe(true);
  const { devLink } = await signup.json();
  // A production build never hands the link out: the address is confirmed in the database instead.
  if (devLink) await confirm(request, devLink);
  else sql(`UPDATE "User" SET "emailVerifiedAt" = now() AT TIME ZONE 'UTC' WHERE email = '${account.email}'`);
  return account;
}

/** Confirms an address with the link the test server returns instead of sending an email. */
export async function confirm(request: APIRequestContext, link: string) {
  const token = link.split("/verifier-email/")[1].split("?")[0];
  expect((await request.post("/api/account/verify", { data: { token } })).ok()).toBe(true);
}

/** Signs in through the plain « Connexion » page (no link followed). */
export async function signIn(page: Page, account: Account) {
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(account.email);
  await page.locator('input[name="password"]').fill(account.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

/** The fake Stripe's test controls (tests/stripe_mock.py). */
export async function mock(path: string, body?: object) {
  const res = await fetch(`${process.env.STRIPE_MOCK_URL}/_mock/${path}`, {
    method: body ? "POST" : "GET",
    ...(body && { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }),
  });
  return res.json();
}

type MockSession = {
  id: string;
  status: string;
  mode: string;
  customer: string;
  url: string;
  metadata: Record<string, string>;
};
/** The Checkout pages created at the fake Stripe for the customer with this email. */
export async function checkoutPages(email: string): Promise<MockSession[]> {
  const state = await mock("state");
  const mine = Object.values<{ id: string; email: string }>(state.customers)
    .filter((c) => c.email === email)
    .map((c) => c.id);
  return Object.values<MockSession>(state.sessions).filter((s) => mine.includes(s.customer));
}

/**
 * Stripe's pages do not exist here: the addresses the fake Stripe hands out are answered by a blank page,
 * after a moment — as a distant site would, which leaves time for anything that could cancel the departure.
 */
export const PAYMENT_PAGE = /^https:\/\/checkout\.mock\/pay\//;
export async function fakeStripePages(page: Page) {
  await page.route(/^https:\/\/(checkout|billing)\.mock\//, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.fulfill({
      contentType: "text/html",
      body: "<title>Faux Stripe</title><h1>Fausse page Stripe</h1>",
    });
  });
}

/**
 * What happened in production: a refresh of the page started together with the departure to Stripe was cut
 * short by it, Next.js then reloaded the current page, and that reload cancelled the departure. Here every
 * refresh asked from now on is cut short, so a page that still refreshes while leaving never gets to Stripe.
 */
export const cutRefreshes = (page: Page) => page.route(/[?&]_rsc=/, (route) => route.abort());
