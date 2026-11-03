import { describe, expect, it } from "vitest";
import { asksNothing, newQuestion, validateQuestion } from "@/lib/question";
import { angleAt, drawSpin, finalAngle, SPIN_MS, wheelEntries } from "@/lib/wheel";

/** The entry under the pointer (at the top) once the wheel is turned by `angle` degrees. */
const under = (entries: string[], angle: number) => {
  const segment = 360 / entries.length;
  const top = (((-angle % 360) + 360) % 360) / segment;
  return entries[Math.floor(top)];
};

describe("roue de tirage au sort", () => {
  it("s’arrête toujours sur l’entrée tirée", () => {
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let n = 2; n <= 30; n++) {
      const entries = Array.from({ length: n }, (_, i) => `E${i}`);
      for (let k = 0; k < 20; k++) {
        const spin = drawSpin(entries, random, 0);
        expect(under(entries, finalAngle(spin))).toBe(entries[spin.winner]);
        expect(angleAt(spin, SPIN_MS)).toBeCloseTo(finalAngle(spin));
        expect(spin.turns).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it("ralentit jusqu’à l’arrêt", () => {
    const spin = drawSpin(["a", "b", "c"], () => 0.5, 0);
    const steps = [0, 1000, 2000, 3000, 4000, 5000].map((t) => angleAt(spin, t));
    const speeds = steps.slice(1).map((a, i) => a - steps[i]);
    expect(steps[0]).toBe(0);
    speeds.slice(1).forEach((s, i) => expect(s).toBeLessThan(speeds[i]));
  });

  it("prend les joueurs par ordre alphabétique quand il n’y a pas de liste", () => {
    expect(wheelEntries([], ["Zoé", "Ana", "Éloi"])).toEqual(["Ana", "Éloi", "Zoé"]);
    expect(wheelEntries(["Gage 1", "Gage 2"], ["Ana"])).toEqual(["Gage 1", "Gage 2"]);
  });

  it("valide la liste : vide ou de 2 à 30 entrées", () => {
    const wheel = { ...newQuestion("wheel"), text: "Qui commence ?" };
    expect(asksNothing("wheel")).toBe(true);
    expect(validateQuestion(wheel).options).toEqual([]);
    expect(validateQuestion({ ...wheel, options: [" A ", "B"] }).options).toEqual(["A", "B"]);
    expect(() => validateQuestion({ ...wheel, options: ["Seul"] })).toThrow(/2 à 30/);
    expect(() => validateQuestion({ ...wheel, options: ["A", ""] })).toThrow(/2 à 30/);
    expect(validateQuestion({ ...wheel, explanation: "x", points: "double" })).toMatchObject({
      explanation: "",
      points: "none",
    });
  });
});
