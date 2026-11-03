import { expect } from "@playwright/test";
import { newAccount, plainHttp, signIn, test } from "./helpers";

test("thème sobre : le joueur est vouvoyé, du lobby à son résultat", async ({ page, request, browser }) => {
  const account = await newAccount(request);
  await signIn(page, account);
  await page.waitForURL(/\/app$/);
  const theme = await page.request.patch("/api/org/appearance", {
    data: { theme: "sober", accent: "#1F4E8C", logo: null, credit: true },
  });
  expect(theme.ok()).toBe(true);
  await page.request.post("/api/game", {
    data: {
      action: "save",
      quiz: {
        title: "Quiz sobre",
        questions: [
          { text: "Capitale de la France ?", options: ["Paris", "Lyon"], correct: 0, duration: 20 },
        ],
      },
    },
  });

  await page.goto("/app");
  await page.getByRole("button", { name: "Lancer Quiz sobre" }).click();
  const code = ((await page.locator(".host-code").getAttribute("aria-label")) ?? "").replace(/\D/g, "");

  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
  await plainHttp(phone);
  const player = await phone.newPage();
  await player.goto("/jouer");
  await player.getByLabel("Code de la partie").fill(code);
  await player.getByLabel("Ton pseudo").fill("Camille");
  await player.getByRole("button", { name: "C’est parti !" }).click();
  await expect(player.getByText("Vous êtes bien inscrit·e à la partie.")).toBeVisible();
  await expect(player.getByText("Vous êtes le premier joueur arrivé.")).toBeVisible();

  await page.getByRole("button", { name: "Lancer le quiz" }).click();
  await expect(player.getByText("Sélectionnez une réponse.")).toBeVisible();
  await player.getByRole("button", { name: /Paris/ }).click();
  await page
    .getByRole("button", { name: /Voir le podium|Afficher la réponse|Question suivante/ })
    .first()
    .click();
  await expect(
    player.getByText(/VOTRE RÉSULTAT|Vous êtes en tête|Vous ouvrez le classement/).first(),
  ).toBeVisible();
  await expect(player.getByText(/\btu\b|\bton\b|\bta\b|\btoi\b/i)).toHaveCount(0);
  await phone.close();
});
