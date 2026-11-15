import { expect } from "@playwright/test";
import { test } from "./helpers";

test("démo : depuis l’accueil, une partie complète au clavier, sans aucun appel au serveur de jeu", async ({
  page,
}) => {
  const api: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/")) api.push(r.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("link", { name: /Joue une partie d’essai/ }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByText("MODE DÉMO")).toBeVisible();
  await expect(page.getByText(/joueurs fictifs/).first()).toBeVisible();

  await page.getByLabel("Pseudo (facultatif)").fill("Alex");
  await page.getByLabel(/Sans chrono/).click();
  await page.getByRole("button", { name: "Lancer la démo" }).click();

  // 1. Vrai ou faux: the right answer, chosen with the keyboard; the title of the step has the focus.
  await expect(page.getByRole("heading", { name: /Grande Muraille/ })).toBeFocused();
  await page.getByRole("button", { name: /Faux/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Bien joué !")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Classement" })).toBeVisible();
  await expect(page.getByText("Alex (vous)")).toBeVisible();

  // 2. Quiz with a picture.
  await page.getByRole("button", { name: "Question suivante" }).click();
  await page.getByRole("button", { name: /Saturne/ }).click();
  await expect(page.getByText("Bien joué !")).toBeVisible();

  // 3. Slider: a typed value.
  await page.getByRole("button", { name: "Question suivante" }).click();
  await page.getByLabel("Valeur précise").fill("390000");
  await page.getByRole("button", { name: "Valider ma valeur" }).click();
  await expect(page.getByText("Bien joué !")).toBeVisible();

  // 4. Puzzle, sent as shown (shuffled): a wrong answer is corrected too.
  await page.getByRole("button", { name: "Question suivante" }).click();
  await page.getByRole("button", { name: "Valider cet ordre" }).click();
  await expect(page.getByText("Raté !")).toBeVisible();

  // 5. Poll: no right answer.
  await page.getByRole("button", { name: "Question suivante" }).click();
  await page.getByRole("button", { name: /Thé/ }).click();
  await expect(page.getByText("Réponse notée !")).toBeVisible();

  await page.getByRole("button", { name: "Voir le podium" }).click();
  await expect(page.getByText("FIN DE LA DÉMO")).toBeVisible();
  await expect(page.getByText(/3 \/ 4 bonnes réponses/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Créer mon espace gratuit" })).toHaveAttribute(
    "href",
    "/inscription",
  );
  expect(api).toEqual([]);
});

test("accueil : la carte « T’es dans la partie ? » mène toujours à la partie", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Code de la partie").fill("123456");
  await page.getByRole("button", { name: "Rejoindre la partie" }).click();
  await expect(page).toHaveURL(/\/jouer\?code=123456$/);
});
