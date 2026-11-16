import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { AUDIENCES } from "@/lib/audiences";
import { demos } from "@/lib/quizzes";
import { PLANS } from "@/lib/plans";
import sitemap from "@/app/sitemap";

test("pages par usage : huit usages, chacun avec des quiz qui existent et une réponse courte pour les moteurs IA", () => {
  expect(AUDIENCES.map((a) => a.slug)).toEqual([
    "entreprises",
    "collectivites",
    "associations",
    "services-jeunesse",
    "formateurs",
    "petites-equipes",
    "particuliers",
    "agences-evenementielles",
  ]);
  for (const a of AUDIENCES) {
    expect(a.quizzes.length, a.slug).toBe(6);
    expect(a.quizHeading, a.slug).toMatch(/^Six quiz /);
    for (const [id, note] of a.quizzes) {
      expect(
        demos.some((q) => q.id === id),
        `${a.slug} : ${id}`,
      ).toBe(true);
      expect(note.length, `${a.slug} : ${id}`).toBeLessThanOrEqual(30);
    }
    expect(new Set(a.quizzes.map(([id]) => id)).size, a.slug).toBe(6);
    // Long-tail questions for search and answer engines, on top of the short answer.
    expect(a.faq.length, a.slug).toBeGreaterThanOrEqual(4);
    expect(a.title.length, a.slug).toBeLessThanOrEqual(70);
    expect(a.description.length, a.slug).toBeLessThanOrEqual(170);
    expect(a.points).toHaveLength(3);
    // GEO: a self-contained factual answer, naming SQuizz and the European hosting.
    expect(a.summary, a.slug).toMatch(/^SQuizz est une plateforme française/);
    expect(a.summary.length, a.slug).toBeLessThanOrEqual(600);
  }
});

test("pages par usage : chaque page a au moins un quiz fait pour elle, qui n’apparaît pas partout", () => {
  const uses = new Map<string, number>();
  for (const a of AUDIENCES) for (const [id] of a.quizzes) uses.set(id, (uses.get(id) ?? 0) + 1);
  for (const a of AUDIENCES)
    expect(
      a.quizzes.some(([id]) => (uses.get(id) ?? 0) <= 2),
      a.slug,
    ).toBe(true);
});

test("pages par usage : les chiffres viennent de lib/plans.ts, jamais écrits à la main", () => {
  const src = readFileSync("lib/audiences.ts", "utf8");
  for (const n of [PLANS.PREMIUM.maxPlayersPerGame, PLANS.PRO.maxPlayersPerGame, PLANS.STARTER.price])
    expect(src).not.toMatch(new RegExp(`\\b${n}\\b`));
});

test("pages par usage : dans le sitemap et dans le pied de page de toutes les pages", () => {
  const urls = sitemap().map((p) => p.url);
  for (const a of AUDIENCES) expect(urls).toContain(`https://www.squizz.fun/pour/${a.slug}`);
  expect(readFileSync("components/site/footer.tsx", "utf8")).toContain("AUDIENCES.map");
});

test("pages par usage : décrites dans /llms.txt pour les assistants IA", async () => {
  const { GET } = await import("@/app/llms.txt/route");
  const text = await GET().text();
  for (const a of AUDIENCES) {
    expect(text).toContain(`https://www.squizz.fun/pour/${a.slug}`);
    expect(text).toContain(a.summary);
  }
});
