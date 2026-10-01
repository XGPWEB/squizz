import { expect, test } from "vitest";
import { CLOUD, layoutCloud, wordSize } from "@/lib/word-cloud";

// Rough width of the display font: about half the font size per character.
const measure = (text: string, size: number) => text.length * size * 0.5;

test("la taille d’un mot est proportionnelle au nombre de fois où il est cité", () => {
  expect(wordSize(6, 6, 120)).toBe(120);
  expect(wordSize(3, 6, 120)).toBe(60);
  expect(wordSize(2, 6, 120)).toBe(40);
  // Very small shares keep a readable size.
  expect(wordSize(1, 60, 120)).toBe(CLOUD.minSize);
  const placed = layoutCloud(
    [
      { label: "numérique", count: 3 },
      { label: "Primàbord", count: 6 },
      { label: "école", count: 2 },
    ],
    measure,
  );
  const size = Object.fromEntries(placed.map((w) => [w.label, w.size]));
  expect(placed[0].label).toBe("Primàbord");
  expect(size["numérique"] / size["Primàbord"]).toBeCloseTo(0.5, 1);
  expect(size["école"] / size["Primàbord"]).toBeCloseTo(1 / 3, 1);
});

test("tous les mots tiennent dans le nuage sans se chevaucher", () => {
  const words = Array.from({ length: 45 }, (_, i) => ({
    label: `mot${i}-${"x".repeat(i % 9)}`,
    count: 1 + (i % 7),
  }));
  const placed = layoutCloud(words, measure);
  expect(placed).toHaveLength(45);
  for (const w of placed) {
    expect(w.x - w.width / 2).toBeGreaterThanOrEqual(0);
    expect(w.x + w.width / 2).toBeLessThanOrEqual(CLOUD.width);
    expect(w.y - w.size / 2).toBeGreaterThanOrEqual(0);
    expect(w.y + w.size / 2).toBeLessThanOrEqual(CLOUD.height);
  }
  for (let i = 0; i < placed.length; i++)
    for (let j = i + 1; j < placed.length; j++) {
      const [a, b] = [placed[i], placed[j]];
      const apart =
        Math.abs(a.x - b.x) * 2 >= a.width + b.width || Math.abs(a.y - b.y) * 2 >= a.size + b.size;
      expect(apart, `${a.label} / ${b.label}`).toBe(true);
    }
  expect(layoutCloud([], measure)).toEqual([]);
});
