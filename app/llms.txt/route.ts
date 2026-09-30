import { ADVANTAGES, FAQ, QUESTION_TYPES, SUMMARY } from "@/lib/seo";
import { COMPANY_INFO } from "@/lib/company-info";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-static";

/** Plain-text summary for AI assistants and answer engines (https://llmstxt.org). */
export function GET() {
  const site = COMPANY_INFO.siteUrl;
  const { FREE: free, PRO: pro } = PLANS;
  const body = `# SQuizz

> ${SUMMARY}

SQuizz est l’alternative française à Kahoot!, conçue et éditée en France par ${COMPANY_INFO.editor.name} (${COMPANY_INFO.editor.email}). Site : ${site}

## Points forts

${ADVANTAGES.map((a) => `- **${a.title}** : ${a.text}`).join("\n")}

## Offres

- Gratuit : ${free.maxQuizzes} quiz, ${free.maxPlayersPerGame} joueurs par partie, ${free.maxMembers} membres, sans carte bancaire.
- Pro (sur devis) : quiz illimités, ${pro.maxPlayersPerGame} joueurs par partie, membres illimités.

## Types de questions

${QUESTION_TYPES.map((t) => `- ${t}`).join("\n")}

## Questions fréquentes

${FAQ.map(({ q, a }) => `### ${q}\n\n${a}`).join("\n\n")}

## Pages

- [Accueil](${site}/) : présentation et fonctionnalités
- [Alternative à Kahoot!](${site}/alternative-kahoot) : comparatif avec Kahoot!, Mentimeter et Wooclap
- [Tarifs](${site}/tarifs) : offres Gratuit et Pro
- [Rejoindre une partie](${site}/jouer) : saisir le code de la partie
- [Créer un espace](${site}/inscription)
- [Confidentialité](${site}/confidentialite) : hébergement et durées de conservation
`;
  return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
