import type { Question } from "@/lib/question";
import { media, opinion, poll, scale, slide } from "./kit";

/**
 * Templates for the pages by usage (2026-11): a public meeting (local authorities), a general assembly
 * (associations), the opening of a training (trainers) and a wedding (private parties). Opinion steps only,
 * so they need no fact of their own; names and places in brackets are meant to be replaced in the editor.
 * Illustrations are drawn for SQuizz in public/originals/modeles.
 */
const m = media("modeles");
const france = {
  kind: "image" as const,
  url: "/originals/gastronomie/carte.webp",
  caption: "Carte : Superbenjamin · CC BY-SA 4.0",
};

export const publicMeeting: Question[] = [
  slide(
    "title",
    "Réunion publique : la parole aux habitants",
    "Téléphone en main : chacun donne son avis, sans avoir à prendre le micro.",
    [m.img("concertation", "Une place de quartier")],
  ),
  slide(
    "bullets",
    "Les règles de la soirée",
    "Les réponses sont anonymes : personne ne sait qui a dit quoi\nToutes les idées sont bienvenues, même les plus simples\nLes résultats seront partagés avec tous les habitants",
  ),
  poll(
    "Vous habitez le quartier depuis…",
    ["Moins de 2 ans", "2 à 10 ans", "Plus de 10 ans", "Je n’y habite pas, j’y travaille"],
    { anonymous: true },
  ),
  opinion("wordcloud", "En un mot, comment décririez-vous le quartier aujourd’hui ?", { anonymous: true }),
  opinion("pinpoll", "Où se trouve l’endroit qui mérite le plus d’attention ? Placez votre pin’s.", {
    media: [m.img("plan", "Le plan du quartier (remplacez-le par le vôtre)")],
    anonymous: true,
    duration: 30,
  }),
  scale("Vous sentez-vous en sécurité dans le quartier ?", "Pas du tout", "Tout à fait", {
    anonymous: true,
  }),
  poll(
    "Quelles priorités pour les prochaines années ?",
    [
      "Plus d’espaces verts",
      "Des rues plus sûres à pied et à vélo",
      "Des commerces de proximité",
      "Des lieux pour les jeunes",
      "Des équipements sportifs",
    ],
    { anonymous: true, multiple: true },
  ),
  opinion("brainstorm", "Votre idée pour améliorer le quartier ?", { anonymous: true, duration: 90 }),
  opinion("open", "Une question pour les élus ?", { anonymous: true }),
  scale("Cette réunion vous a-t-elle permis de vous exprimer ?", "Pas du tout", "Tout à fait", {
    anonymous: true,
  }),
  slide(
    "titletext",
    "Merci de votre participation !",
    "Prochaine étape : la synthèse de vos réponses, publiée sur le site de la commune.",
    [m.img("concertation", "Une place de quartier")],
  ),
];

export const generalAssembly: Question[] = [
  slide(
    "title",
    "Assemblée générale",
    "Bienvenue ! Sortez vos téléphones : cette année, l’AG se vit aussi en direct.",
    [m.img("assemblee", "Une salle d’assemblée générale")],
  ),
  opinion("wordcloud", "En un mot, comment s’est passée l’année pour vous ?", { anonymous: true }),
  slide(
    "bullets",
    "L’ordre du jour",
    "Rapport moral\nRapport d’activité\nRapport financier\nProjets pour l’an prochain\nÉlection du conseil d’administration",
  ),
  poll(
    "Votre temps fort de l’année ?",
    ["[Événement 1]", "[Événement 2]", "[Événement 3]", "[Événement 4]"],
    { anonymous: true },
  ),
  scale("Vous sentez-vous bien informé de la vie de l’association ?", "Pas du tout", "Tout à fait", {
    anonymous: true,
  }),
  slide(
    "titletext",
    "Avant les votes",
    "Les votes officiels suivent vos statuts. Les sondages SQuizz, eux, servent à prendre le pouls de la salle.",
  ),
  opinion("brainstorm", "Une idée de projet pour l’an prochain ?", { duration: 90 }),
  poll(
    "Comment aimeriez-vous donner un coup de main ?",
    [
      "Le jour des événements",
      "En préparant en coulisses",
      "En parlant de l’association autour de moi",
      "En rejoignant le conseil d’administration",
    ],
    { anonymous: true, multiple: true },
  ),
  opinion("nps", "Recommanderiez-vous l’association à un proche ?", { anonymous: true }),
  opinion("wheel", "Qui repart avec le lot de la tombola ?"),
  slide(
    "titletext",
    "Merci à toutes et à tous !",
    "Et merci aux bénévoles, sans qui rien ne serait possible. Le pot de l’amitié vous attend.",
    [m.img("assemblee", "Une salle d’assemblée générale")],
  ),
];

export const trainingStart: Question[] = [
  slide(
    "title",
    "Bienvenue en formation !",
    "Avant de commencer : quelques questions pour faire connaissance et partir de là où vous en êtes.",
    [m.img("demarrage", "Un carnet et un crayon")],
  ),
  opinion("wordcloud", "En un mot, qu’attendez-vous de cette formation ?", { anonymous: true }),
  scale("Votre niveau actuel sur le sujet ?", "Je découvre", "Je pourrais l’enseigner", {
    anonymous: true,
  }),
  poll(
    "Vous êtes ici surtout…",
    ["Parce que je l’ai choisi", "À la demande de mon employeur", "Pour un projet précis", "Par curiosité"],
    { anonymous: true },
  ),
  opinion("wheel", "Qui se présente en premier ? Prénom, métier et une attente"),
  slide(
    "bullets",
    "Nos objectifs",
    "[Objectif 1]\n[Objectif 2]\n[Objectif 3]\nÀ la fin, une évaluation rapide et anonyme",
  ),
  slide(
    "bullets",
    "Nos règles du jeu",
    "On a le droit de se tromper : c’est comme ça qu’on apprend\nToutes les questions sont bonnes à poser\nTéléphones en silencieux, sauf pour les quiz",
  ),
  opinion("brainstorm", "Une question que vous vous posez déjà sur le sujet ?", {
    anonymous: true,
    duration: 90,
  }),
  scale("Votre énergie pour la journée ?", "À plat", "À bloc", { anonymous: true }),
  slide(
    "titletext",
    "C’est parti !",
    "Vos réponses aident à adapter le rythme. Un quiz pour vérifier les acquis vous attend en fin de séquence.",
    [m.img("demarrage", "Un carnet et un crayon")],
  ),
];

export const wedding: Question[] = [
  slide(
    "title",
    "Le quiz des mariés",
    "Qui connaît le mieux [Prénom 1] et [Prénom 2] ? Téléphones en main, place au jeu !",
    [m.img("mariage", "Deux alliances et des confettis")],
  ),
  opinion("pinpoll", "D’où venez-vous ? Placez votre pin’s sur la carte.", {
    media: [france],
    duration: 30,
  }),
  poll("Vous êtes plutôt invité…", ["Côté [Prénom 1]", "Côté [Prénom 2]", "Des deux côtés !"]),
  poll("Qui est le plus souvent en retard ?", ["[Prénom 1]", "[Prénom 2]"]),
  poll("Qui a fait le premier pas ?", ["[Prénom 1]", "[Prénom 2]"]),
  poll("Qui cuisine le mieux ?", ["[Prénom 1]", "[Prénom 2]", "Ni l’un ni l’autre"]),
  poll("Où se sont-ils rencontrés ?", ["[Lieu 1]", "[Lieu 2]", "[Lieu 3]", "[Lieu 4]"]),
  slide("titletext", "Verdict des mariés", "À eux de révéler les bonnes réponses… et les anecdotes."),
  opinion("wordcloud", "Un mot pour les mariés ?"),
  opinion("brainstorm", "Votre meilleur conseil pour une vie à deux réussie ?", { duration: 90 }),
  opinion("wheel", "Qui repart avec le centre de table ?"),
  slide("titletext", "Vive les mariés !", "Merci d’avoir joué. Place à la piste de danse !", [
    m.img("mariage", "Deux alliances et des confettis"),
  ]),
];
