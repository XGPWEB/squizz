import { expect } from "@playwright/test";
import { test } from "./helpers";

test("rejoindre : le code et le pseudo tapés avant la fin du chargement partent tels quels", async ({
  page,
}) => {
  // The page's scripts arrive late, as on a phone with a weak connection: the form is on screen and can be
  // typed in well before it is listening.
  await page.route("**/_next/static/**/*.js", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await route.fallback();
  });
  await page.goto("/jouer", { waitUntil: "commit" });
  await page.getByLabel("Code de la partie").fill("123456");
  await page.getByLabel("Ton pseudo").fill("Capitaine Curieux");

  // The button opens once the page listens; what was typed is still there and is what gets sent.
  const sent = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/api/game"));
  await page.getByRole("button", { name: "C’est parti !" }).click();
  expect((await sent).postDataJSON()).toMatchObject({
    action: "join",
    code: "123456",
    name: "Capitaine Curieux",
  });
  await expect(page.getByLabel("Ton pseudo")).toHaveValue("Capitaine Curieux");
});
