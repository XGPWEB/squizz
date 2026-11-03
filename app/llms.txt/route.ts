import { ADVANTAGES, FAQ, FEATURES, QUESTION_COUNT, TYPE_DETAILS, TYPE_FAMILIES, SUMMARY } from "@/lib/seo";
import { COMPANY_INFO } from "@/lib/company-info";
import { PLAN_KEYS, PLANS, limitsSummary, priceLabel } from "@/lib/plans";

export const dynamic = "force-static";

/** Plain-text summary for AI assistants and answer engines (https://llmstxt.org). */
export function GET() {
  const site = COMPANY_INFO.siteUrl;
  const body = `# SQuizz

> ${SUMMARY}

SQuizz est l’alternative française à Kahoot!, conçue et éditée en France par ${COMPANY_INFO.editor.name} (${COMPANY_INFO.editor.email}). Site : ${site}

## Points forts

${ADVANTAGES.map((a) => `- **${a.title}** : ${a.text}`).join("\n")}

## Offres

${PLAN_KEYS.map((k) => `- ${PLANS[k].label} (${priceLabel(PLANS[k])}) : ${limitsSummary(PLANS[k])}.`).join("\n")}

Offres payantes sans engagement, résiliables à tout moment. TVA non applicable, art. 293 B du CGI.

## Types de questions

${QUESTION_COUNT} types de questions, des diapos et une roue de tirage au sort.

${TYPE_FAMILIES.map(
  (f) =>
    `### ${f.label} (${f.tag.toLowerCase()})\n\n${f.types.map((t) => `- **${t.label}** : ${TYPE_DETAILS[t.id]}`).join("\n")}`,
).join("\n\n")}

## Fonctionnalités

${FEATURES.map(
  (g) => `### ${g.label}\n\n${g.items.map((i) => `- **${i.title}** : ${i.text}`).join("\n")}`,
).join("\n\n")}

## Questions fréquentes

${FAQ.map(({ q, a }) => `### ${q}\n\n${a}`).join("\n\n")}

## Pages

- [Accueil](${site}/) : présentation, types de questions et fonctionnalités
- [Alternative à Kahoot!](${site}/alternative-kahoot) : comparatif avec Kahoot!, Mentimeter et Wooclap
- [Tarifs](${site}/tarifs) : offres Gratuit, Essentiel, Pro et Premium annuel
- [Rejoindre une partie](${site}/jouer) : saisir le code de la partie
- [Créer un espace](${site}/inscription)
- [Confidentialité](${site}/confidentialite) : hébergement et durées de conservation
`;
  return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
