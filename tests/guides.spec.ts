import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { AUDIENCES } from "@/lib/audiences";
import { GUIDES, guidesFor } from "@/lib/guides";
import { questionTypes } from "@/lib/question";
import { demos } from "@/lib/quizzes";
import { demoDays, slotLabel } from "@/components/site/demo-slots";
import sitemap from "@/app/sitemap";

test("guides : quiz, usages et types de questions qui existent", () => {
  const types = new Set<string>([...questionTypes.map((t) => t.label), "Questions du public"]);
  const slugs = new Set(AUDIENCES.map((a) => a.slug));
  expect(new Set(GUIDES.map((g) => g.slug)).size).toBe(GUIDES.length);
  for (const g of GUIDES) {
    expect(g.title.length, g.slug).toBeLessThanOrEqual(70);
    expect(g.description.length, g.slug).toBeLessThanOrEqual(170);
    expect(g.faq.length, g.slug).toBeGreaterThanOrEqual(2);
    for (const a of g.audiences) expect(slugs.has(a), `${g.slug} : ${a}`).toBe(true);
    for (const s of g.steps) {
      if (s.quiz)
        expect(
          demos.some((q) => q.id === s.quiz),
          `${g.slug} : ${s.quiz}`,
        ).toBe(true);
      for (const t of s.types ?? []) expect(types.has(t), `${g.slug} : ${t}`).toBe(true);
      expect(s.note.length, `${g.slug} : ${s.note}`).toBeLessThanOrEqual(26);
    }
  }
});

test("guides : chaque guide est relié depuis au moins une page par usage, le pied de page et le sitemap", () => {
  for (const g of GUIDES) expect(AUDIENCES.some((a) => guidesFor(a.slug).includes(g))).toBe(true);
  const urls = sitemap().map((p) => p.url);
  for (const g of GUIDES) expect(urls).toContain(`https://www.squizz.fun/guides/${g.slug}`);
  expect(urls).toContain("https://www.squizz.fun/demo-visio");
  expect(readFileSync("components/site/footer.tsx", "utf8")).toContain('"/guides"');
});

test("démo en visio : jours ouvrés à partir du lendemain, sans week-end ni jour férié fixe", () => {
  // Thursday 24 December 2026: Friday 25 is Christmas, then the weekend.
  const days = demoDays(new Date(2026, 11, 24), 3);
  expect(days.map((d) => d.toDateString())).toEqual([
    new Date(2026, 11, 28).toDateString(),
    new Date(2026, 11, 29).toDateString(),
    new Date(2026, 11, 30).toDateString(),
  ]);
  expect(slotLabel(new Date(2026, 11, 28), "10 h")).toBe("lundi 28 décembre à 10 h");
  expect(slotLabel(new Date(2026, 11, 1), "14 h")).toBe("mardi 1er décembre à 14 h");
});
