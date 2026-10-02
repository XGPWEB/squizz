import { randomBytes } from "node:crypto";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

// Same guard as the Python scenarios: the isolated test server only, never development or production data.
if (process.env.NEXT_DIST_DIR !== ".next-e2e" || !process.env.SQUIZZ_URL || !process.env.STRIPE_MOCK_URL)
  throw new Error("Tests navigateur : à lancer par « bash scripts/e2e.sh browser » uniquement.");

const hex = (bytes = 4) => randomBytes(bytes).toString("hex");

export type Account = { organization: string; email: string; password: string };
export const newIdentity = (): Account => ({
  organization: `Org navigateur ${hex(3)}`,
  email: `navigateur-${hex(6)}@example.test`,
  password: `Motdepasse-${hex(4)}`,
});

/** A confirmed account on the free plan, made through the API (the sign-up form has its own test). */
export async function newAccount(request: APIRequestContext): Promise<Account> {
  const account = newIdentity();
  const signup = await request.post("/api/account/signup", {
    data: { name: "Admin Test", ...account },
  });
  expect(signup.ok()).toBe(true);
  await confirm(request, (await signup.json()).devLink);
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
