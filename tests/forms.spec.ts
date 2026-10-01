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
