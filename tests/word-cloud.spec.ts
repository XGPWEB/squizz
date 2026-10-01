import { expect, test } from "vitest";
import { CLOUD, layoutCloud, wordSize } from "@/lib/word-cloud";

// Rough metrics of the display font: about half the font size per character; accents rise above the
// capitals and « g, p, q, y » fall below the baseline.
const measure = (text: string, size: number) => ({
  width: text.length * size * 0.5,
  ascent: size * (/[àâéèêëîïôùûç]/i.test(text) ? 1 : 0.8),
  descent: size * (/[gjpqy]/.test(text) ? 0.25 : 0.02),
});

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
    expect(w.y - w.height / 2).toBeGreaterThanOrEqual(0);
    expect(w.y + w.height / 2).toBeLessThanOrEqual(CLOUD.height);
  }
  for (let i = 0; i < placed.length; i++)
    for (let j = i + 1; j < placed.length; j++) {
      const [a, b] = [placed[i], placed[j]];
      const apart =
        Math.abs(a.x - b.x) * 2 >= a.width + b.width || Math.abs(a.y - b.y) * 2 >= a.height + b.height;
      expect(apart, `${a.label} / ${b.label}`).toBe(true);
    }
  expect(layoutCloud([], measure)).toEqual([]);
});

test("peu de mots : le nuage s’agrandit pour remplir le cadre, sans changer les proportions", () => {
  const placed = layoutCloud(
    [
      { label: "amour", count: 10 },
      { label: "passion", count: 6 },
      { label: "tendresse", count: 5 },
      { label: "joie", count: 2 },
    ],
    measure,
  );
  const left = Math.min(...placed.map((w) => w.x - w.width / 2));
  const right = Math.max(...placed.map((w) => w.x + w.width / 2));
  const top = Math.min(...placed.map((w) => w.y - w.height / 2));
  const bottom = Math.max(...placed.map((w) => w.y + w.height / 2));
  // Filled in width or in height (room is kept for accents and tails), or the largest word is at its ceiling.
  const filled =
    right - left > CLOUD.width * 0.9 || bottom - top > CLOUD.height * 0.7 || placed[0].size >= 319;
  expect(filled).toBe(true);
  expect(left).toBeGreaterThanOrEqual(0);
  expect(right).toBeLessThanOrEqual(CLOUD.width);
  expect(top).toBeGreaterThanOrEqual(0);
  expect(bottom).toBeLessThanOrEqual(CLOUD.height);
  const size = Object.fromEntries(placed.map((w) => [w.label, w.size]));
  expect(size.passion / size.amour).toBeCloseTo(0.6, 1);
  expect(size.tendresse / size.amour).toBeCloseTo(0.5, 1);
  // The text is drawn inside its box.
  for (const w of placed) {
    expect(w.baseline).toBeGreaterThan(w.y - w.height / 2);
    expect(w.baseline).toBeLessThanOrEqual(w.y + w.height / 2);
  }
});
