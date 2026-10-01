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

test("les accents et les jambages comptent : deux mots voisins ne se touchent pas", () => {
  // The case seen on screen: the « q » of « numérique » ran into the « à » of « Primàbord ».
  const placed = layoutCloud(
    [
      { label: "Primàbord", count: 9 },
      { label: "pédagogique", count: 7 },
      { label: "numérique", count: 5 },
      { label: "valoriser", count: 4 },
    ],
    measure,
  );
  // What is drawn for a word: from its baseline, up by its ascent and down by its descent.
  const ink = (w: (typeof placed)[number]) => {
    const m = measure(w.label, w.size);
    return {
      top: w.baseline - m.ascent,
      bottom: w.baseline + m.descent,
      left: w.x - m.width / 2,
      right: w.x + m.width / 2,
    };
  };
  for (let i = 0; i < placed.length; i++)
    for (let j = i + 1; j < placed.length; j++) {
      const [a, b] = [ink(placed[i]), ink(placed[j])];
      const apart = a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
      expect(apart, `${placed[i].label} / ${placed[j].label}`).toBe(true);
    }
  // A word with an accent and a descender takes more room than its font size.
  const tall = placed.find((w) => w.label === "pédagogique")!;
  expect(tall.height).toBeGreaterThan(tall.size);
});
