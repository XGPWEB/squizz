import { expect } from "@playwright/test";
import { newAccount, signIn, test } from "./helpers";

test("répondre dans l’aperçu d’une question n’enregistre pas le quiz et ne quitte pas l’éditeur", async ({
  page,
  request,
}) => {
  const account = await newAccount(request);
  await signIn(page, account);
  await page.waitForURL(/\/app$/);
  const saved = await page.request.post("/api/game", {
    data: {
      action: "save",
      quiz: {
        title: "Quiz d’origine",
        questions: [{ type: "text", text: "Quel artiste ?", accepted: ["Aznavour"] }],
      },
    },
  });
  const { quiz } = await saved.json();
  const stored = async () => {
    const { quizzes } = await (await page.request.get("/api/game?action=list")).json();
    const { title, version } = quizzes.find((q: { id: string }) => q.id === quiz.id);
    return { title, version };
  };

  await page.goto(`/app/quiz/${quiz.id}`);
  // The fields stay closed until the editor listens: typing waits for it, nothing typed is lost.
  await page.getByLabel("Titre du quiz").fill("Quiz en brouillon");
  await expect(page.locator(".save-status.dirty")).toBeVisible();
  await page.getByRole("button", { name: "Aperçu" }).click();
  const preview = page.getByRole("dialog");
  await preview.getByLabel("Ta réponse").fill("Aznavour");
  await preview.getByRole("button", { name: "Envoyer ma réponse" }).click();
  await expect(preview.getByText("Réponse envoyée (pour de faux)")).toBeVisible();
  // Nothing was saved, nothing moved.
  await expect(page).toHaveURL(new RegExp(`/app/quiz/${quiz.id}$`));
  expect(await stored()).toEqual({ title: "Quiz d’origine", version: quiz.version });
  await expect(page.getByLabel("Titre du quiz")).toHaveValue("Quiz en brouillon");

  // The editor's own button still saves.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
  await expect(page).toHaveURL(/\/app\?ok=modifie$/);
  await expect(page.getByText("Vos modifications sont enregistrées")).toBeVisible();
  expect((await stored()).title).toBe("Quiz en brouillon");
});

test("fermer la fenêtre d’une nouvelle étape et changer de type ne perdent aucune saisie", async ({
  page,
  request,
}) => {
  const account = await newAccount(request);
  await signIn(page, account);
  await page.waitForURL(/\/app$/);
  const saved = await page.request.post("/api/game", {
    data: {
      action: "save",
      quiz: {
        title: "Quiz des capitales",
        questions: [
          {
            type: "quiz",
            text: "Capitale de la France ?",
            options: ["Lyon", "Paris", "Lille", "Bordeaux"],
            correct: 1,
            correctAnswers: [1],
          },
        ],
      },
    },
  });
  const { quiz } = await saved.json();
  await page.goto(`/app/quiz/${quiz.id}`);
  await expect(page.getByLabel("Réponse 2", { exact: true })).toHaveValue("Paris");

  // The step being written survives Escape and a click beside the window, and only giving it up empties it.
  const open = page.getByRole("button", { name: "Ajouter une étape" });
  const wizard = page.getByRole("dialog");
  await open.click();
  await wizard.getByRole("button", { name: /^Quiz/ }).click();
  await wizard.getByLabel("Réponse 1", { exact: true }).fill("Nantes");
  await page.keyboard.press("Escape");
  await expect(wizard).toBeHidden();
  await open.click();
  await expect(wizard.getByLabel("Réponse 1", { exact: true })).toHaveValue("Nantes");
  await page.mouse.click(4, 4);
  await expect(wizard).toBeHidden();
  await open.click();
  await expect(wizard.getByLabel("Réponse 1", { exact: true })).toHaveValue("Nantes");
  page.once("dialog", (d) => d.accept());
  await wizard.getByRole("button", { name: "Abandonner cette étape" }).click();
  await expect(wizard.getByRole("heading", { name: "Quel type d’étape ?" })).toBeVisible();
  await page.keyboard.press("Escape");

  // Quiz to poll keeps the answers, with nothing to announce.
  const setType = async (name: RegExp) => {
    await page.getByLabel("Type de question").click();
    await page.getByRole("option", { name }).click();
  };
  const undo = page.getByRole("button", { name: "Revenir au type précédent" });
  await setType(/^Sondage/);
  await expect(page.getByLabel("Réponse 2", { exact: true })).toHaveValue("Paris");
  await expect(undo).toBeHidden();
  await setType(/^Quiz/);
  await expect(page.getByLabel("Réponse 2 correcte")).toBeChecked();

  // A type without answers says so, and gives them back by the button or by coming back to the type.
  await setType(/^Question ouverte/);
  await expect(page.getByLabel("Réponse 2", { exact: true })).toBeHidden();
  await undo.click();
  await expect(page.getByLabel("Réponse 2", { exact: true })).toHaveValue("Paris");
  await setType(/^Question ouverte/);
  await setType(/^Quiz/);
  await expect(page.getByLabel("Réponse 2", { exact: true })).toHaveValue("Paris");
  await expect(page.getByLabel("Réponse 2 correcte")).toBeChecked();
});
