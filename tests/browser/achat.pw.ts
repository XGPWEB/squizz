import { expect, test } from "@playwright/test";
import {
  PAYMENT_PAGE,
  checkoutPages,
  confirm,
  cutRefreshes,
  fakeStripePages,
  mock,
  newAccount,
  newIdentity,
  signIn,
} from "./helpers";

test("offre choisie sur la page Tarifs : compte, connexion, puis directement la page de paiement", async ({
  page,
  request,
}) => {
  await fakeStripePages(page);
  const account = newIdentity();

  await page.goto("/tarifs");
  await page.getByRole("link", { name: "Choisir Pro" }).click();
  await expect(page).toHaveURL(/\/inscription\?suite=/);
  await expect(page.getByText("OFFRE PRO · 30 € / MOIS")).toBeVisible();

  await page.getByLabel("Nom de l’organisation").fill(account.organization);
  await page.getByLabel("Votre nom").fill("Admin Test");
  await page.getByLabel("Email professionnel").fill(account.email);
  await page.locator('input[name="password"]').fill(account.password);
  await page.locator('input[name="confirm"]').fill(account.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Créer mon espace" }).click();
  await expect(page.getByText("Vérifiez votre boîte mail")).toBeVisible();
  const link = await page.getByRole("link", { name: "ouvrir le lien de confirmation" }).getAttribute("href");
  await confirm(request, link!);

  // The plain sign-in page, not the emailed link: the choice is kept with the organisation.
  await signIn(page, account);
  await page.waitForURL(PAYMENT_PAGE, { timeout: 20_000 });
  const pages = await checkoutPages(account.email);
  expect(pages.map((s) => [s.status, s.mode, s.metadata.plan])).toEqual([["open", "subscription", "PRO"]]);
  expect(page.url()).toBe(pages[0].url);

  // Back from Stripe: an ordinary visit of the subscription page, usable, and no second departure.
  await page.goBack();
  await expect(page).toHaveURL(/\/app\/abonnement\?offre=PRO$/);
  await expect(page.getByRole("button", { name: "Choisir Pro" })).toBeEnabled();
  await page.waitForTimeout(2000);
  await expect(page).toHaveURL(/\/app\/abonnement\?offre=PRO$/);
  expect(await checkoutPages(account.email)).toHaveLength(1);
});

test("Pack Événement : le bouton part vers Stripe, et le pack est actif au retour du paiement", async ({
  page,
  request,
}) => {
  await fakeStripePages(page);
  const account = await newAccount(request);
  await signIn(page, account);
  await page.waitForURL(/\/app$/);

  await page.goto("/app/abonnement");
  await expect(page.getByText("Offre actuelle")).toBeVisible();
  // The click must leave for Stripe: the page once refreshed itself instead, cancelling the departure.
  await cutRefreshes(page);
  await page.getByRole("button", { name: "Acheter le pack" }).click();
  await page.waitForURL(PAYMENT_PAGE, { timeout: 20_000 });
  await page.unroute(/[?&]_rsc=/);
  const [checkout] = await checkoutPages(account.email);
  expect([checkout.status, checkout.mode, checkout.metadata.kind]).toEqual(["open", "payment", "event-pass"]);

  // Paid at (the fake) Stripe, then back on the address Stripe sends the buyer to.
  await mock("complete", { session: checkout.id });
  await page.goto("/app/abonnement?paiement=pack");
  await expect(page.getByText("Pack Événement actif")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ajouter 7 jours" })).toBeVisible();
});

test("« Factures et moyen de paiement » ouvre le portail Stripe", async ({ page, request }) => {
  await fakeStripePages(page);
  const account = await newAccount(request);
  await signIn(page, account);
  await page.waitForURL(/\/app$/);
  // The button appears once the organisation is known to Stripe: after a first payment page.
  await page.goto("/app/abonnement");
  await page.getByRole("button", { name: "Choisir Essentiel" }).click();
  await page.waitForURL(PAYMENT_PAGE, { timeout: 20_000 });
  await page.goto("/app/abonnement");
  await cutRefreshes(page);
  await page.getByRole("button", { name: "Factures et moyen de paiement" }).click();
  await page.waitForURL(/^https:\/\/billing\.mock\//, { timeout: 20_000 });
});
