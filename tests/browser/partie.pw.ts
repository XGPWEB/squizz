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
  // The launch window: everyone for themselves by default, then the waiting room opens.
  await expect(page.getByRole("radio", { name: /Chacun pour soi/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Ouvrir la salle d’attente" }).click();
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

  // Full screen for the projected screen, where the browser can do it: the game goes on in it.
  const fullscreen = page.getByRole("button", { name: "Plein écran", exact: true });
  if (await fullscreen.isVisible()) {
    await fullscreen.click();
    await expect(page.getByRole("button", { name: "Quitter le plein écran" })).toBeVisible();
    expect(await page.evaluate(() => document.fullscreenElement === document.documentElement)).toBe(true);
  }

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

test("lancement en équipes : une erreur s’affiche dans la fenêtre, les choix restent, le nouvel essai ouvre la salle", async ({
  page,
  request,
  browser,
}) => {
  const account = await newAccount(request);
  await signIn(page, account);
  await page.waitForURL(/\/app$/);
  await page.request.post("/api/game", {
    data: {
      action: "save",
      quiz: {
        title: "Quiz d’équipes",
        questions: [
          { text: "Capitale de la France ?", options: ["Paris", "Lyon"], correct: 0, duration: 20 },
        ],
      },
    },
  });

  await page.goto("/app");
  await page.getByRole("button", { name: "Lancer Quiz d’équipes" }).click();
  const dialog = page.getByRole("dialog", { name: "Lancer « Quiz d’équipes »" });
  await dialog.getByRole("radio", { name: /En équipes/ }).click();
  await dialog
    .getByRole("radiogroup", { name: "Nombre d’équipes" })
    .getByRole("radio", { name: "3" })
    .click();
  await dialog.getByLabel("Nom de l’équipe 1").fill("Hiboux du test");
  await dialog.getByLabel("Nom de l’équipe 2").fill("Loutres du test");
  const third = await dialog.getByLabel("Nom de l’équipe 3").inputValue();
  expect(third.length).toBeGreaterThan(0);

  // The first try fails (refused by the server): the message is in the window, which stays open as it was.
  let refused = 0;
  await page.route("**/api/game", async (route) => {
    if (route.request().method() === "POST" && route.request().postDataJSON()?.action === "create") {
      refused++;
      return route.fulfill({ status: 400, json: { error: "Le serveur refuse cette partie pour le test." } });
    }
    return route.fallback();
  });
  await dialog.getByRole("button", { name: "Ouvrir la salle d’attente" }).click();
  const alert = dialog.getByRole("alert");
  await expect(alert).toContainText("La salle d’attente n’a pas pu s’ouvrir.");
  await expect(alert).toContainText("Le serveur refuse cette partie pour le test.");
  await expect(alert).toBeFocused();
  expect(refused).toBe(1);
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/app$/);
  await expect(dialog.getByRole("radio", { name: /En équipes/ })).toHaveAttribute("aria-checked", "true");
  await expect(dialog.getByRole("radio", { name: "3" })).toHaveAttribute("aria-checked", "true");
  await expect(dialog.getByLabel("Nom de l’équipe 1")).toHaveValue("Hiboux du test");
  await expect(dialog.getByLabel("Nom de l’équipe 2")).toHaveValue("Loutres du test");
  await expect(dialog.getByLabel("Nom de l’équipe 3")).toHaveValue(third);

  // Another try, the server accepts: the waiting room opens with the three teams and their names.
  await page.unroute("**/api/game");
  await dialog.getByRole("button", { name: "Réessayer" }).click();
  await page.waitForURL(/\/partie\/\d{6}$/);
  const code = ((await page.locator(".host-code").getAttribute("aria-label")) ?? "").replace(/\D/g, "");
  expect(code).toMatch(/^\d{6}$/);
  await expect(page.getByRole("group", { name: "Équipes" })).toContainText("3 ÉQUIPES");
  for (const name of ["Hiboux du test", "Loutres du test", third])
    await expect(page.locator(".team-column .team-tag").getByText(name, { exact: true })).toBeVisible();

  // A player sees the same names on their phone and joins one.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
  await plainHttp(phone);
  const player = await phone.newPage();
  await player.goto("/jouer");
  await player.getByLabel("Code de la partie").fill(code);
  await player.getByLabel("Ton pseudo").fill("Hulotte");
  await player.getByRole("button", { name: "C’est parti !" }).click();
  const picker = player.getByRole("region", { name: "Choisis ton équipe" });
  await picker.getByRole("button", { name: /Hiboux du test/ }).click();
  await expect(picker.getByRole("button", { name: /Hiboux du test/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".team-column", { hasText: "Hiboux du test" })).toContainText("Hulotte");
  await phone.close();
});
