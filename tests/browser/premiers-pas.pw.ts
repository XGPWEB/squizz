import { expect, type APIRequestContext } from "@playwright/test";
import { newAccount, signIn, test } from "./helpers";

const GUIDE = { name: "Votre première partie en 3 étapes" };

async function game(request: APIRequestContext, data: Record<string, unknown>) {
  const res = await request.post("/api/game", { data });
  expect(res.ok(), `${data.action} : ${await res.text()}`).toBe(true);
  return res.json();
}

test("premiers pas : le guide reste pour une salle créée ou une partie commencée, part après une partie terminée", async ({
  page,
  request,
}) => {
  const account = await newAccount(request);
  await signIn(page, account);
  await expect(page.getByRole("heading", GUIDE)).toBeVisible();

  // Free plan: its only quiz is used. Launching an example stays possible, customising does not.
  const { quiz } = await game(page.request, {
    action: "save",
    quiz: {
      title: "Une question",
      questions: [{ text: "Deux plus deux ?", options: ["3", "4"], correct: 1 }],
    },
    clientKey: `premiers-pas-${Date.now()}`,
  });
  await page.reload();
  await expect(page.getByRole("heading", GUIDE)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Personnaliser une copie de « Brise-glace/ }),
  ).toBeDisabled();
  await expect(page.getByText(/quiz sont utilisés : lancer un exemple reste possible/)).toBeVisible();

  // 1. A room created from the guide, nobody in it: the guide stays, also after a reload.
  await page.getByRole("button", { name: "Lancer « Brise-glace de réunion »" }).click();
  await page.getByRole("button", { name: "Ouvrir la salle d’attente" }).click();
  await expect(page).toHaveURL(/\/partie\/\d{6}$/);
  await page.goto("/app");
  await expect(page.getByRole("heading", GUIDE)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", GUIDE)).toBeVisible();

  // 2. A game started: still there.
  const { code } = await game(page.request, {
    action: "create",
    quizId: quiz.id,
    clientKey: `pp-${Date.now()}`,
  });
  // One player, from another device (its own cookies): a game cannot start empty.
  await game(request, { action: "join", code, name: "Capitaine Curieux" });
  await game(page.request, { action: "start", code });
  await page.goto("/app");
  await expect(page.getByRole("heading", GUIDE)).toBeVisible();

  // Hidden on purpose: gone after a reload too; this browser only.
  await page.getByRole("button", { name: "Masquer le guide" }).click();
  await expect(page.getByRole("heading", GUIDE)).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", GUIDE)).toHaveCount(0);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole("heading", GUIDE)).toBeVisible();

  // 3. The same game played to its end: the guide goes away by itself.
  await expect(async () => {
    await page.request.post("/api/game", { data: { action: "close", code, question: 0 } });
    await game(page.request, { action: "next", code, question: 0 });
  }).toPass({ timeout: 15_000 });
  const state = await (await page.request.get(`/api/game?action=state&code=${code}`)).json();
  expect(state.phase).toBe("finished");
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: /^Bonjour/ })).toBeVisible();
  await expect(page.getByRole("heading", GUIDE)).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", GUIDE)).toHaveCount(0);
});
