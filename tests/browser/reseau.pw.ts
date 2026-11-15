import { expect, type APIRequestContext } from "@playwright/test";
import { newAccount, plainHttp, signIn, test } from "./helpers";

async function host(request: APIRequestContext, data: Record<string, unknown>) {
  const res = await request.post("/api/game", { data });
  expect(res.ok(), `${data.action} : ${await res.text()}`).toBe(true);
  return res.json();
}
const state = async (request: APIRequestContext, code: string) =>
  (await request.get(`/api/game?action=state&code=${code}`)).json();

test("réseau du joueur : réponse perdue puis coupure et retour, une seule réponse comptée à chaque question", async ({
  page,
  request,
  browser,
}) => {
  const account = await newAccount(request);
  await signIn(page, account);
  await page.waitForURL(/\/app$/);
  const ask = (text: string, correct: number) => ({
    text,
    options: ["Paris", "Lyon"],
    correct,
    duration: 60,
  });
  const { quiz } = await host(page.request, {
    action: "save",
    quiz: {
      title: "Réseau",
      questions: [ask("Capitale de la France ?", 0), ask("Capitale des Gaules ?", 1)],
    },
  });
  const { code } = await host(page.request, {
    action: "create",
    quizId: quiz.id,
    clientKey: `net-${Date.now()}`,
  });

  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
  await plainHttp(phone);
  const player = await phone.newPage();
  await player.goto("/jouer");
  await player.getByLabel("Code de la partie").fill(code);
  await player.getByLabel("Ton pseudo").fill("Capitaine Curieux");
  await player.getByRole("button", { name: "C’est parti !" }).click();
  await expect.poll(async () => (await state(page.request, code)).players?.length).toBe(1);
  await host(page.request, { action: "start", code });

  // 1. The answer reaches the server, its response is lost on the way back: the phone re-reads the game,
  //    finds its answer, shows no error and sends nothing twice.
  await expect(player.getByRole("button", { name: /Paris/ })).toBeEnabled({ timeout: 15_000 });
  let answers = 0;
  await player.route("**/api/game", async (route) => {
    if (route.request().method() === "POST" && route.request().postDataJSON()?.action === "answer") {
      answers++;
      await route.fetch();
      return route.abort("connectionreset");
    }
    return route.fallback();
  });
  await player.getByRole("button", { name: /Paris/ }).click();
  await expect(player.getByRole("button", { name: /Paris/ })).toHaveAttribute("aria-pressed", "true");
  await expect(player.locator(".error[role=alert]")).toHaveCount(0);
  await player.unroute("**/api/game");
  expect(answers).toBe(1);
  expect((await state(page.request, code)).answered).toBe(1);

  // To question 2.
  await host(page.request, { action: "close", code, question: 0 });
  await host(page.request, { action: "next", code, question: 0 });

  // 2. The phone loses the network during the question: the game says so, the answer cannot leave.
  await expect(player.getByRole("button", { name: /Lyon/ })).toBeEnabled({ timeout: 15_000 });
  await phone.setOffline(true);
  await expect(player.getByText("Connexion perdue, reconnexion…")).toBeVisible({ timeout: 10_000 });
  await player.getByRole("button", { name: /Lyon/ }).click();
  expect((await state(page.request, code)).answered).toBe(0);

  // Back online: the game resumes on the same question, the answer goes through once.
  await phone.setOffline(false);
  await expect(player.getByText("Connexion perdue, reconnexion…")).toHaveCount(0, { timeout: 10_000 });
  await expect(player.getByRole("button", { name: /Lyon/ })).toBeEnabled();
  await player.getByRole("button", { name: /Lyon/ }).click();
  await expect(player.getByRole("button", { name: /Lyon/ })).toHaveAttribute("aria-pressed", "true");
  // A second tap after it is in changes nothing.
  await player.getByRole("button", { name: /Lyon/ }).click({ force: true });
  await expect.poll(async () => (await state(page.request, code)).answered).toBe(1);

  // End of the game: two right answers, scored once each (500 to 1 000 points per answer).
  await host(page.request, { action: "close", code, question: 1 });
  await host(page.request, { action: "next", code, question: 1 });
  const end = await state(page.request, code);
  expect(end.phase).toBe("finished");
  const me = end.players.find((p: { name: string }) => p.name === "Capitaine Curieux");
  expect(me.correctCount).toBe(2);
  expect(me.score).toBeGreaterThanOrEqual(1000);
  expect(me.score).toBeLessThanOrEqual(2000);
  await expect(player.getByLabel("Podium final")).toContainText("Capitaine Curieux");
  await phone.close();
});
