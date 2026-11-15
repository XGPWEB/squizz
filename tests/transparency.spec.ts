import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { EVENT_PASS, PLAN_KEYS, PLANS, limitsSummary, seatsLabel } from "@/lib/plans";
import { MAX_STEPS } from "@/lib/question";
import { IMPORT_MAX_QUESTIONS } from "@/lib/sheet-import";
import { AI_PREREQUISITE } from "@/lib/ai-quiz";
import { FAQ } from "@/lib/seo";

const read = (file: string) => readFileSync(file, "utf8");

test("animateurs inclus : affichés pour chaque offre, du plus petit au plus grand", () => {
  expect(PLAN_KEYS.map((k) => seatsLabel(PLANS[k]))).toEqual([
    "1 animateur inclus",
    "2 animateurs inclus",
    "5 animateurs inclus",
    "10 animateurs inclus",
  ]);
  expect(limitsSummary(PLANS.PRO)).toContain("5 animateurs");
});

test("aucune formulation plus large que le plafond réel", () => {
  for (const k of PLAN_KEYS) expect(PLANS[k].pitch).not.toMatch(/grandes? organisations?/i);
  // The Premium pitch names its real ceiling.
  expect(PLANS.PREMIUM.pitch).toContain(String(PLANS.PREMIUM.maxPlayersPerGame));
});

test("la limite de 30 étapes est la même partout, diapos comprises", () => {
  expect(MAX_STEPS).toBe(30);
  expect(IMPORT_MAX_QUESTIONS).toBe(MAX_STEPS);
  expect(read("lib/server/quiz-store.ts")).toContain("MAX_QUESTIONS = MAX_STEPS");
  expect(read("lib/server/quiz-transfer.ts")).toContain("> MAX_STEPS");
  expect(read("app/(site)/tarifs/page.tsx")).toMatch(/étapes au plus par quiz[^"]*diapos/);
});

test("l’IA annonce sa clé API et ses frais séparés avant l’écran de configuration", () => {
  expect(AI_PREREQUISITE.long).toMatch(/clé API/);
  expect(AI_PREREQUISITE.long).toMatch(/facture chaque génération séparément/);
  expect(AI_PREREQUISITE.long).toMatch(/ChatGPT Plus ou Claude Pro ne suffit pas/);
  expect(AI_PREREQUISITE.member).toMatch(/administrateur/);
  expect(read("app/(site)/tarifs/page.tsx")).toContain("AI_PREREQUISITE");
  const aiFaq = FAQ.find((f) => f.q.includes("intelligence artificielle"));
  expect(aiFaq?.a).toMatch(/clé API/);
  expect(aiFaq?.a).toMatch(/facturée à part/);
});

test("le Pack Événement dit sa durée et qu’il part du paiement", () => {
  const tarifs = read("app/(site)/tarifs/page.tsx");
  expect(tarifs).toContain("à compter du paiement");
  expect(FAQ.find((f) => f.q.includes("seul événement"))?.a).toContain(
    `${EVENT_PASS.days} jours à compter du paiement`,
  );
});

test("les clés API ne passent jamais dans un journal ni une alerte", async () => {
  const { errorMessage, redactSecrets } = await import("@/lib/server/monitoring");
  const key = "sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";
  expect(redactSecrets(`Échec avec ${key} et sk-proj-ZYXWVUTSRQPONM987654`)).not.toMatch(/AbCdEf|ZYXWVU/);
  expect(redactSecrets("Authorization: Bearer abcdefghijklmnop1234")).toBe("Authorization: Bearer [masqué]");
  expect(errorMessage(new Error(`Clé refusée : ${key}`))).toBe("Error : Clé refusée : sk-[masquée]");
  // Words that merely look alike stay readable.
  expect(redactSecrets("sk-court et ask-me")).toBe("sk-court et ask-me");
});

test("les groupes de boutons-radio se pilotent au clavier", () => {
  const files = [
    "components/squizz/launch-dialog.tsx",
    "components/squizz/ai-dialog.tsx",
    "components/squizz/editor.tsx",
    "components/squizz/solo-link.tsx",
    "components/squizz/question-fields.tsx",
    "app/app/apparence/appearance-manager.tsx",
  ];
  for (const file of files) {
    const src = read(file);
    const groups = src.match(/role="radiogroup"/g)?.length ?? 0;
    const radios = src.match(/role="radio"\s/g)?.length ?? 0;
    expect(src.match(/onKeyDown=\{onRadioKeys\}/g)?.length, file).toBe(groups);
    expect(src.match(/tabIndex=\{.+ \? 0 : -1\}/g)?.length, file).toBe(radios);
  }
});
