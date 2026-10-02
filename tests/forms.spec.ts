import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

/** Forms that only carry public values and are meant to be shareable addresses. */
const GET_ON_PURPOSE = ["components/site/join-box.tsx", "app/super-admin/(espace)/utilisateurs/page.tsx"];

const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sources(join(dir, e.name)) : e.name.endsWith(".tsx") ? [join(dir, e.name)] : [],
  );

test("aucun formulaire ne peut partir en GET par défaut (un mot de passe finirait dans l’adresse)", () => {
  const forgotten = ["app", "components"]
    .flatMap(sources)
    .filter((file) => !GET_ON_PURPOSE.includes(file))
    .flatMap((file) =>
      // The attributes of a form fit in the few lines after its opening (handlers contain « > »).
      [...readFileSync(file, "utf8").matchAll(/<form\b[\s\S]{0,240}/g)]
        .filter((m) => !/\bmethod="post"/.test(m[0]))
        .map((m) => `${file}: ${m[0].slice(0, 60).replace(/\s+/g, " ")}`),
    );
  expect(forgotten).toEqual([]);
});

test("un formulaire qui contient une fenêtre (portail) n’agit pas sur l’envoi d’un formulaire de cette fenêtre", () => {
  // React bubbles « submit » through portals: answering in the editor's preview used to save the quiz.
  const unguarded = ["app", "components"].flatMap(sources).filter((file) => {
    const src = readFileSync(file, "utf8");
    const form = src.match(/<form\b[\s\S]*<\/form>/)?.[0] ?? "";
    return form.includes("Dialog.Portal") && !form.includes("e.target !== e.currentTarget");
  });
  expect(unguarded).toEqual([]);
  const play = readFileSync("components/squizz/question-play.tsx", "utf8");
  const handlers = [...play.matchAll(/<form\b[\s\S]{0,240}/g)];
  expect(handlers.length).toBeGreaterThan(0);
  expect(handlers.filter((m) => !m[0].includes("e.stopPropagation()"))).toEqual([]);
});
