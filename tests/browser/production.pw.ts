import { expect, type Page } from "@playwright/test";
import { PAYMENT_PAGE, fakeStripePages, newAccount, signIn, sql, test } from "./helpers";

/**
 * Leaving for Stripe from a production build: only there does the router preload the pages in view, which is
 * what made the departure fail on the real site. Stripe cannot be replaced by the fake one in a production
 * build, so the answer of the payment request is given here, in the browser; what is under test is what the
 * page does with it.
 */
const answer = (page: Page, path: string, url: string) =>
  page.route(`**${path}`, (route) => route.fulfill({ json: { url } }));

test("production : « Acheter le pack » puis « Choisir Pro » partent vers Stripe", async ({
  page,
  request,
}) => {
  await fakeStripePages(page);
  await answer(page, "/api/billing/checkout", "https://checkout.mock/pay/essai-production");
  const account = await newAccount(request);
  await signIn(page, account);
  await page.waitForURL(/\/app$/);

  await page.goto("/app/abonnement");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Acheter le pack" }).click();
  await page.waitForURL(PAYMENT_PAGE, { timeout: 20_000 });

  // Back with the browser's button: the page is usable again, and the next click leaves too.
  await page.goBack();
  await expect(page).toHaveURL(/\/app\/abonnement$/);
  await expect(page.getByRole("button", { name: "Choisir Pro" })).toBeEnabled();
  await page.getByRole("button", { name: "Choisir Pro" }).click();
  await page.waitForURL(PAYMENT_PAGE, { timeout: 20_000 });
});

test("production : « Factures et moyen de paiement » part vers le portail Stripe", async ({
  page,
  request,
}) => {
  await fakeStripePages(page);
  await answer(page, "/api/billing/portal", "https://billing.mock/p/session/essai-production");
  const account = await newAccount(request);
  // The button shows for an organisation known to Stripe.
  sql(
    `UPDATE "Organization" SET "stripeCustomerId" = 'cus_essai_${Date.now()}' WHERE name = '${account.organization}'`,
  );
  await signIn(page, account);
  await page.waitForURL(/\/app$/);

  await page.goto("/app/abonnement");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Factures et moyen de paiement" }).click();
  await page.waitForURL(/^https:\/\/billing\.mock\//, { timeout: 20_000 });
});

test("production : offre choisie avant l’inscription, la première connexion part vers sa page de paiement", async ({
  page,
  request,
}) => {
  await fakeStripePages(page);
  await answer(page, "/api/billing/checkout", "https://checkout.mock/pay/essai-production");
  const account = await newAccount(request, "/app/abonnement?offre=PRO");
  await signIn(page, account);
  await page.waitForURL(PAYMENT_PAGE, { timeout: 30_000 });
});
