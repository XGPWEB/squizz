import { expect } from "@playwright/test";
import { newAccount, plainHttp, signIn, test } from "./helpers";

test("une partie complète : l’animateur lance, un joueur rejoint sur téléphone, répond, podium", async ({
  page,
  request,
  browser,
}) => {
  const account = await newAccount(request);
  await signIn(page, account);
  await page.waitForURL(/\/app$/);
  const question = (text: string, correct: number) => ({
    text,
    options: ["Paris", "Lyon"],
    correct,
    duration: 20,
  });
  await page.request.post("/api/game", {
    data: {
      action: "save",
      quiz: {
        title: "Quiz de salle",
        questions: [question("Capitale de la France ?", 0), question("Capitale des Gaules ?", 1)],
      },
    },
  });

  // Host: launches the game from the library, the code is on screen.
  await page.goto("/app");
  await page.getByRole("button", { name: "Lancer Quiz de salle" }).click();
  const code = ((await page.locator(".host-code").getAttribute("aria-label")) ?? "").replace(/\D/g, "");
  expect(code).toMatch(/^\d{6}$/);

  // Player: another browser, phone-sized, no account.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
  await plainHttp(phone);
  const player = await phone.newPage();
  await player.goto("/jouer");
  await player.getByLabel("Code de la partie").fill(code);
  await player.getByLabel("Ton pseudo").fill("Capitaine Curieux");
  await player.getByRole("button", { name: "C’est parti !" }).click();
  await expect(page.getByText("Capitaine Curieux")).toBeVisible();

  await page.getByRole("button", { name: "Lancer le quiz" }).click();
  await expect(page.getByRole("heading", { name: "Capitale de la France ?" })).toBeVisible();
  await player.getByRole("button", { name: /Paris/ }).click();
  await page.getByRole("button", { name: "Question suivante" }).click();
  await expect(page.getByRole("heading", { name: "Capitale des Gaules ?" })).toBeVisible();
  await player.getByRole("button", { name: /Lyon/ }).click();
  await page.getByRole("button", { name: "Voir le podium" }).click();

  await expect(page.getByLabel("Podium final")).toContainText("Capitaine Curieux");
  await expect(player.getByLabel("Podium final")).toContainText("Capitaine Curieux");
  await phone.close();
});
