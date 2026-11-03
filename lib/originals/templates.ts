import { newQuestion, type Question, type QuestionType, type SlideLayout } from "@/lib/question";

/**
 * Templates by usage: ready-to-play sequences for a moment of working life (welcome day, meeting,
 * training, team review, end-of-year party). Mostly opinion steps, so they need no fact of their own;
 * the few knowledge questions are common knowledge. Copied, they are adapted in the editor.
 */
export const USAGES = [
  ["accueil", "Accueil"],
  ["reunion", "Réunion"],
  ["formation", "Formation"],
  ["bilan", "Bilan d’équipe"],
  ["fete", "Convivialité"],
] as const;
export type Usage = (typeof USAGES)[number][0];

const q = (type: QuestionType, fields: Partial<Question>): Question => ({ ...newQuestion(type), ...fields });
const slide = (layout: SlideLayout, text: string, body = "") =>
  q("slide", { ...newQuestion("slide", layout), text, body, duration: 20 });
const poll = (text: string, options: string[], duration = 20) =>
  q("poll", { text, options, order: options.map((_, i) => i), duration });
const scale = (text: string, minLabel = "Pas du tout d’accord", maxLabel = "Tout à fait d’accord") =>
  q("scale", { text, max: 5, minLabel, maxLabel, duration: 20 });
const choice = (text: string, options: string[], correct: number, explanation: string) =>
  q("quiz", {
    text,
    options,
    order: options.map((_, i) => i),
    correct,
    correctAnswers: [correct],
    explanation,
  });

export const welcome: Question[] = [
  slide("title", "Bienvenue dans l’équipe !", "Quelques minutes pour faire connaissance, téléphone en main."),
  q("wordcloud", { text: "En un mot, comment vous sentez-vous pour ce premier jour ?", duration: 30 }),
  poll("Pour bien démarrer la journée, c’est plutôt…", ["Café", "Thé", "Jus de fruits", "Rien, merci !"]),
  q("wheel", { text: "Qui se présente en premier ? Prénom, poste et une passion en une phrase" }),
  scale("Je sais à qui m’adresser si j’ai une question."),
  q("brainstorm", {
    text: "Qu’aimeriez-vous découvrir en priorité dans vos premières semaines ?",
    duration: 60,
  }),
  q("open", { text: "Une chose que l’équipe devrait savoir sur vous ?", duration: 60 }),
  slide(
    "titletext",
    "Merci et bonne arrivée !",
    "Vos réponses aident l’équipe à préparer la suite de votre accueil.",
  ),
];

export const meeting: Question[] = [
  q("wordcloud", { text: "La météo du jour : comment arrivez-vous à cette réunion ?", duration: 30 }),
  scale("Votre niveau d’énergie ce matin ?", "À plat", "Plein d’énergie"),
  poll("Votre format de réunion préféré ?", [
    "Debout, 15 minutes",
    "Autour d’une table",
    "En visio",
    "En marchant",
  ]),
  q("brainstorm", { text: "Une bonne nouvelle de votre semaine, pro ou perso ?", duration: 60 }),
  q("wheel", { text: "Qui ouvre le tour de table ?" }),
  poll("De quoi doit-on parler en priorité aujourd’hui ?", [
    "Les projets en cours",
    "L’organisation",
    "Les idées nouvelles",
    "Les difficultés du moment",
  ]),
];

export const training: Question[] = [
  slide(
    "title",
    "Votre avis sur la formation",
    "Cinq minutes, en toute franchise : les réponses sont anonymes.",
  ),
  scale("Les objectifs de la formation étaient clairs."),
  scale("Le contenu correspondait à mes besoins."),
  scale("Je pourrai appliquer ce que j’ai appris dans mon travail."),
  poll("Le rythme de la formation était…", ["Trop lent", "Adapté", "Trop rapide"]),
  q("nps", { text: "Recommanderiez-vous cette formation à un collègue ?", duration: 20 }),
  q("wordcloud", { text: "Ce que je retiens, en un ou deux mots", duration: 45 }),
  q("open", { text: "Ce que je vais mettre en pratique dès la semaine prochaine", duration: 90 }),
  q("open", { text: "Une suggestion pour améliorer la formation ?", duration: 60 }),
].map((s) => (s.type === "slide" ? s : { ...s, anonymous: true }));

export const retro: Question[] = [
  slide("title", "Rétrospective d’équipe", "Regarder la période écoulée pour mieux préparer la suivante."),
  q("wordcloud", { text: "La période écoulée en un mot", duration: 30 }),
  q("brainstorm", { text: "Ce qui a bien fonctionné", duration: 90 }),
  q("brainstorm", { text: "Ce qui nous a freinés", duration: 90 }),
  scale("Je me sens écouté(e) dans l’équipe."),
  scale("Ma charge de travail est soutenable.", "Pas du tout", "Tout à fait"),
  poll("Le chantier prioritaire pour la suite ?", [
    "La communication",
    "L’organisation",
    "Les outils",
    "La charge de travail",
    "La reconnaissance",
  ]),
  q("open", { text: "Une action concrète que nous pourrions lancer dès demain ?", duration: 90 }),
].map((s) => (s.type === "slide" ? s : { ...s, anonymous: true }));

export const yearEnd: Question[] = [
  slide("title", "Spécial fin d’année", "Un petit quiz entre collègues avant les fêtes !"),
  choice(
    "Combien de jours compte une année bissextile ?",
    ["364", "365", "366", "367"],
    2,
    "Une année bissextile compte 366 jours : février y gagne un 29e jour.",
  ),
  choice(
    "Quelle fête célèbre-t-on traditionnellement en mangeant la galette des rois ?",
    ["La Chandeleur", "L’Épiphanie", "Mardi gras", "La Saint-Sylvestre"],
    1,
    "La galette des rois se partage à l’Épiphanie, fêtée le 6 janvier ou, en France, le dimanche entre le 2 et le 8 janvier.",
  ),
  q("truefalse", {
    text: "Dans l’hémisphère Sud, Noël tombe en plein été.",
    correct: 0,
    correctAnswers: [0],
    duration: 15,
    explanation: "Vrai : en décembre, c’est l’été en Australie, en Argentine ou à La Réunion.",
  }),
  poll("La bûche idéale, c’est…", [
    "Chocolat",
    "Praliné",
    "Fruits rouges",
    "Glacée",
    "Pas de bûche pour moi",
  ]),
  q("wordcloud", { text: "Votre vœu pour l’équipe l’année prochaine, en un mot", duration: 45 }),
  q("wheel", { text: "Tirage au sort : qui repart avec le cadeau ?" }),
];
