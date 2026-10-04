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
  // Typed again until the editor has taken it: what is typed before the page's script has started is put
  // back to the saved title when it starts (seen with WebKit on a slow dev server).
  await expect(async () => {
    await page.getByLabel("Titre du quiz").fill("Quiz en brouillon");
    await expect(page.locator(".save-status.dirty")).toBeVisible({ timeout: 1_000 });
  }).toPass();
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
