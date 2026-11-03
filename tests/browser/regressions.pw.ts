import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { newAccount, plainHttp, signIn, test } from "./helpers";

test.use({ actionTimeout: 15_000 });

const question = { text: "Question de départ ?", options: ["Oui", "Non"], correct: 0, duration: 30 };

async function hostQuiz(page: Page, request: APIRequestContext, questions: unknown[] = [question]) {
  const account = await newAccount(request);
  await signIn(page, account);
  await page.waitForURL(/\/app$/);
  const saved = await page.request.post("/api/game", {
    data: { action: "save", quiz: { title: "Quiz de régression", questions } },
  });
  expect(saved.ok()).toBe(true);
  return (await saved.json()).quiz as { id: string };
}

test("autonomie : le chrono révèle la correction, l’extrait est disponible et une panne reste récupérable", async ({
  page,
  request,
  browser,
}) => {
  const quiz = await hostQuiz(page, request, [
    { ...question, duration: 5 },
    {
      type: "blindtest",
      text: "Quel titre ?",
      accepted: ["La Bohème"],
      duration: 60,
      media: [{ kind: "audio", url: "https://example.test/extrait.mp3", caption: "La Bohème" }],
    },
  ]);
  const response = await page.request.post("/api/game", {
    data: { action: "solo", quizId: quiz.id, days: 1 },
  });
  expect(response.ok()).toBe(true);
  const { id } = await response.json();
  const phone = await browser.newContext({ baseURL: new URL(page.url()).origin, locale: "fr-FR" });
  await plainHttp(phone);
  const player = await phone.newPage();
  await player.route("https://example.test/**", (route) =>
    route.fulfill({ contentType: "audio/mpeg", body: "ID3" }),
  );
  await player.goto(`/solo/${id}`);
  await expect(player.getByRole("region", { name: "Cookies", exact: true })).toBeHidden();
  await player.getByLabel("Ton pseudo").fill("Joueur autonome");
  await player.getByRole("button", { name: "C’est parti" }).click();
  // No answer: the server's grace period must not leave the screen stuck at zero.
  await expect(player.getByRole("button", { name: "Question suivante" })).toBeVisible({ timeout: 12_000 });
  await player.getByRole("button", { name: "Question suivante" }).click();
  await expect(player.getByLabel("Extrait à deviner")).toBeVisible();
  await expect(player.getByText("La Bohème", { exact: true })).toBeHidden();

  let attempts = 0;
  const fail = async (route: import("@playwright/test").Route) => {
    attempts++;
    await route.abort("internetdisconnected");
  };
  await player.route("**/api/solo", fail);
  await player.reload();
  const retry = player.getByRole("button", { name: "Réessayer", exact: true });
  await expect(retry).toBeEnabled();
  const stoppedAt = attempts;
  expect(stoppedAt).toBeGreaterThan(0);
  // A persistent failure stops; no recursive state loop continues behind the error.
  await player.waitForTimeout(700);
  expect(attempts).toBe(stoppedAt);
  await player.unroute("**/api/solo", fail);
  await retry.click();
  await expect(player.getByLabel("Extrait à deviner")).toBeVisible();
  await expect(retry).toBeHidden();
  await phone.close();
});

test("éditeur : une étape non ajoutée est restaurée après rechargement puis enregistrée une seule fois", async ({
  page,
  request,
}) => {
  const quiz = await hostQuiz(page, request);
  await page.goto(`/app/quiz/${quiz.id}`);
  const open = page.getByRole("button", { name: "Ajouter une étape" });
  const wizard = page.getByRole("dialog");
  await open.click();
  await wizard.getByRole("button", { name: /^Quiz/ }).click();
  await wizard.getByLabel("Votre question").fill("Capitale à conserver ?");
  await wizard.getByLabel("Réponse 1", { exact: true }).fill("Paris");
  await wizard.getByLabel("Réponse 2", { exact: true }).fill("Nantes");
  await wizard.getByLabel("Réponse 3", { exact: true }).fill("Lyon");
  await wizard.getByLabel("Réponse 4", { exact: true }).fill("Lille");
  await page.keyboard.press("Escape");
  await expect(page.locator(".save-status.dirty")).toContainText("Brouillon gardé");
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expect(page.getByRole("button", { name: "Restaurer le brouillon" })).toBeVisible();
  // Offering a draft must not erase it before the person decides to restore it.
  await page.reload();
  await page.getByRole("button", { name: "Restaurer le brouillon" }).click();
  // Saving cannot silently throw away a step still waiting in the wizard.
  await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
  await expect(wizard.getByLabel("Votre question")).toHaveValue("Capitale à conserver ?");
  await expect(wizard.getByLabel("Réponse 2", { exact: true })).toHaveValue("Nantes");
  await wizard.getByRole("button", { name: "Suivant", exact: true }).click();
  await wizard.getByRole("button", { name: "Ajouter au quiz", exact: true }).click();
  await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
  await expect(page).toHaveURL(/\/app\?ok=modifie$/);
  const { quizzes } = await (await page.request.get("/api/game?action=list")).json();
  const stored = quizzes.find((q: { id: string }) => q.id === quiz.id);
  expect(stored.questions).toHaveLength(2);
  expect(stored.questions[1].text).toBe("Capitale à conserver ?");
});

test("questions du public : un refus garde le texte et ne confirme jamais l’envoi", async ({
  page,
  request,
  browser,
}) => {
  const quiz = await hostQuiz(page, request);
  const created = await page.request.post("/api/game", { data: { action: "create", quizId: quiz.id } });
  const { code } = await created.json();
  expect(
    (
      await page.request.post("/api/game", {
        data: { action: "qa-settings", code, open: true, moderated: false },
      })
    ).ok(),
  ).toBe(true);
  const phone = await browser.newContext({ baseURL: new URL(page.url()).origin, locale: "fr-FR" });
  await plainHttp(phone);
  expect(
    (await phone.request.post("/api/game", { data: { action: "join", code, name: "Curieux" } })).ok(),
  ).toBe(true);
  for (let i = 1; i <= 5; i++) {
    expect(
      (
        await phone.request.post("/api/game", { data: { action: "qa-ask", code, text: `Question ${i} ?` } })
      ).ok(),
    ).toBe(true);
  }
  const player = await phone.newPage();
  await player.goto(`/partie/${code}`);
  await player.getByRole("button", { name: "Poser une question" }).click();
  const wall = player.getByRole("dialog");
  const input = wall.getByLabel("Ta question pour l’animateur");
  await input.fill("Ma sixième question à conserver ?");
  await wall.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(wall.getByRole("alert")).toContainText("déjà posé 5 questions");
  await expect(input).toHaveValue("Ma sixième question à conserver ?");
  await expect(wall.getByText("Envoyée, merci !", { exact: true })).toBeHidden();
  await player.waitForTimeout(1700); // the background polling must not remove the modal's error
  await expect(wall.getByRole("alert")).toContainText("déjà posé 5 questions");
  await expect(wall.locator(".qa-row")).toHaveCount(5);
  await phone.close();
});

test("IA : après un échec de sauvegarde, reprendre le même quiz sans nouvelle génération", async ({
  page,
  request,
}) => {
  const account = await newAccount(request);
  await signIn(page, account);
  await page.waitForURL(/\/app$/);
  await page.route("**/api/org/ai", (route) =>
    route.fulfill({
      json: {
        ready: true,
        provider: "openai",
        hint: "test",
        model: null,
        defaults: { openai: "test", anthropic: "test" },
        canEdit: true,
      },
    }),
  );
  let generations = 0;
  await page.route("**/api/ai/generate", (route) => {
    generations++;
    return route.fulfill({ json: { title: "Quiz généré à conserver", questions: [question], dropped: 0 } });
  });
  const keys: string[] = [];
  await page.route("**/api/game", (route) => {
    const body = route.request().postDataJSON();
    if (body?.action !== "save") return route.continue();
    keys.push(body.clientKey);
    if (keys.length === 1)
      return route.fulfill({ status: 503, json: { error: "Sauvegarde temporairement indisponible" } });
    return route.continue();
  });
  await page.getByRole("button", { name: "Créer avec l’IA" }).click();
  await page.getByLabel("Le contenu").fill("Un document source fictif.");
  await page.getByRole("button", { name: "Générer le quiz", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Sauvegarde temporairement indisponible",
  );
  // Closing and reopening the dialog must retain the generated result too.
  await page.getByRole("dialog").getByRole("button", { name: "Fermer", exact: true }).click();
  await page.getByRole("button", { name: "Créer avec l’IA" }).click();
  await expect(page.getByRole("dialog")).toContainText("Quiz généré à conserver");
  await page.getByRole("button", { name: "Réessayer l’enregistrement" }).click();
  await expect(page).toHaveURL(/\/app\/quiz\/[^/?]+\?ok=ia$/);
  expect(generations).toBe(1);
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBeTruthy();
  expect(keys[1]).toBe(keys[0]);
  await expect(page.getByLabel("Titre du quiz")).toHaveValue("Quiz généré à conserver");
});
