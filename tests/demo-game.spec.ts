import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import {
  DEMO_BOTS,
  DEMO_PLAYER,
  DEMO_STEPS,
  botAnswers,
  demoAggregate,
  demoName,
  demoRanking,
  prepareDemoStep,
  scoreDemoAnswer,
} from "@/lib/demo-game";
import { evaluateAnswer, speedPoints, validateQuestion } from "@/lib/question";

describe("démo jouable", () => {
  test("cinq étapes valides, tirées des Originals, avec leur explication", () => {
    expect(DEMO_STEPS).toHaveLength(5);
    for (const step of DEMO_STEPS) {
      expect(() => validateQuestion(step)).not.toThrow();
      if (step.type !== "poll") expect(step.explanation.length).toBeGreaterThan(20);
    }
  });

  test("le puzzle n’est jamais montré dans l’ordre de la solution, et reste soluble", () => {
    const puzzle = DEMO_STEPS.find((s) => s.type === "puzzle")!;
    const shown = prepareDemoStep(puzzle);
    expect(shown.options).not.toEqual(puzzle.options);
    expect([...shown.options].sort()).toEqual([...puzzle.options].sort());
    // The solution order, read through the shuffled options, gives back the original order.
    expect(shown.order.map((i) => shown.options[i])).toEqual(puzzle.order.map((i) => puzzle.options[i]));
    expect(evaluateAnswer(shown, { order: shown.order }).correct).toBe(true);
  });

  test("les joueurs fictifs donnent des réponses valides, mêlant bonnes et mauvaises", () => {
    const steps = DEMO_STEPS.map(prepareDemoStep);
    const all = steps.map((q, i) => botAnswers(q, i));
    expect(all.every((step) => step.length === DEMO_BOTS.length)).toBe(true);
    const scored = all.flat().filter((a) => a.correct !== null);
    expect(scored.some((a) => a.correct)).toBe(true);
    expect(scored.some((a) => !a.correct)).toBe(true);
    // Same answers on every run: a reload never changes what the fictional players did.
    expect(steps.map((q, i) => botAnswers(q, i))).toEqual(all);
  });

  test("les points suivent la règle des vraies parties", () => {
    const tf = DEMO_STEPS[0];
    const right = tf.correctAnswers[0];
    expect(scoreDemoAnswer(tf, { choices: [right] }, 0).points).toBe(1000);
    expect(scoreDemoAnswer(tf, { choices: [right] }, tf.duration * 1000).points).toBe(500);
    expect(scoreDemoAnswer(tf, { choices: [1 - right] }, 0).points).toBe(0);
    expect(speedPoints({ points: "double", duration: 10 }, true, 5000)).toBe(1500);
    expect(speedPoints({ points: "none", duration: 10 }, true, 0)).toBe(0);
    expect(() => scoreDemoAnswer(tf, { choices: [7] }, 0)).toThrow();
  });

  test("classement avec le visiteur, évolution des places et chiffres de la correction", () => {
    const steps = DEMO_STEPS.map(prepareDemoStep);
    const history = steps.map((q, i) => {
      const mine = { player: DEMO_PLAYER, ...scoreDemoAnswer(q, botAnswersFor(q, i), 1000) };
      return [mine, ...botAnswers(q, i)];
    });
    const first = demoRanking(history, 0, "Alex");
    expect(first).toHaveLength(DEMO_BOTS.length + 1);
    expect(first.every((p) => p.movement === null)).toBe(true);
    const final = demoRanking(history, steps.length - 1, "Alex");
    const me = final.find((p) => p.me)!;
    expect(me.name).toBe("Alex");
    expect(final.every((p) => p.movement !== null)).toBe(true);
    expect(final.map((p) => p.score)).toEqual([...final.map((p) => p.score)].sort((a, b) => b - a));
    expect(demoAggregate(steps[0], history[0]).responses).toBe(DEMO_BOTS.length + 1);
  });

  test("pseudo nettoyé, « Vous » par défaut", () => {
    expect(demoName("  ")).toBe("Vous");
    expect(demoName("  Capitaine   Curieux ")).toBe("Capitaine Curieux");
    expect(demoName("x".repeat(40))).toHaveLength(24);
  });

  test("la démo n’appelle aucune API : rien n’est créé côté serveur", () => {
    for (const file of ["lib/demo-game.ts", "components/squizz/demo-play.tsx", "app/(jeu)/demo/page.tsx"]) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/fetch\(|postJson|gameApi|getJson|\/api\//);
      expect(source).not.toMatch(/prisma|server-only/);
    }
  });
});

/** The visitor answers like the first fictional player would, to get a mix of results. */
function botAnswersFor(q: (typeof DEMO_STEPS)[number], i: number) {
  return botAnswers(q, i)[1].payload;
}
