import { opinion, poll, scale, slide } from "./kit";

/**
 * Template « Séminaire : ouverture et clôture » (2026-11), for companies and event agencies: opinion steps
 * only (no fact to check), answered anonymously, and the wheel for the closing prize draw. The organiser
 * adapts the programme slide in the editor.
 */
export const seminar = [
  slide("title", "Bienvenue au séminaire !", "Quelques minutes pour se mettre en route, téléphone en main."),
  opinion("wordcloud", "En un mot, qu’attendez-vous de cette journée ?", { anonymous: true }),
  poll(
    "Pour vous, une journée réussie, c’est surtout…",
    ["Des décisions", "Des idées neuves", "Du temps ensemble", "Y voir plus clair"],
    { anonymous: true },
  ),
  scale("Votre niveau d’énergie en ce début de journée ?", "À plat", "Plein d’énergie", { anonymous: true }),
  slide(
    "bullets",
    "Le programme",
    "Ouverture\nAteliers en petits groupes\nPause et échanges\nRestitution et clôture",
  ),
  opinion("brainstorm", "Une idée ou une question à poser avant de commencer ?", { anonymous: true }),
  slide("title", "Place à la clôture", "Trois questions pour finir, et un tirage au sort."),
  opinion("nps", "Recommanderiez-vous ce séminaire à un collègue ?", { anonymous: true }),
  opinion("open", "Ce que vous retenez de la journée, en une phrase ?", { anonymous: true }),
  opinion("wheel", "Qui repart avec le lot surprise ?"),
  slide("titletext", "Merci à toutes et à tous !", "Vos réponses aident à préparer le prochain rendez-vous."),
];
