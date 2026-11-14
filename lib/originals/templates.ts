import type { Question } from "@/lib/question";
import { choice, match, media, opinion, poll, puzzle, scale, slide, slider, trueFalse } from "./kit";

/**
 * Templates by usage: ready-to-play sequences for a moment of working life (welcome day, meeting, project
 * kick-off, training, team review, idea workshop, end-of-year party, team building). Mostly opinion steps,
 * so they need no fact of their own; the few knowledge questions are common knowledge. Illustrations are
 * drawn for SQuizz in public/originals/modeles. Copied, they are adapted in the editor.
 */
export const USAGES = [
  ["accueil", "Accueil"],
  ["reunion", "Réunion"],
  ["formation", "Formation"],
  ["atelier", "Atelier"],
  ["bilan", "Bilan d’équipe"],
  ["fete", "Convivialité"],
] as const;
export type Usage = (typeof USAGES)[number][0];

const m = media("modeles");
/** The map of France of the « La France à table » Original, reused to see where everyone comes from. */
const france = {
  kind: "image" as const,
  url: "/originals/gastronomie/carte.webp",
  caption: "Carte : Superbenjamin · CC BY-SA 4.0",
};
/** Opinion steps answered without names: what people say matters, not who says it. */
const anonymously = (steps: Question[]) =>
  steps.map((s) => (s.type === "slide" ? s : { ...s, anonymous: true }));

export const welcome: Question[] = [
  slide(
    "title",
    "Bienvenue dans l’équipe !",
    "Quelques minutes pour faire connaissance, téléphone en main.",
    [m.img("accueil", "Un badge de bienvenue")],
  ),
  slide(
    "bullets",
    "Au programme",
    "Faire connaissance en quelques questions\nDécouvrir l’équipe autrement qu’en réunion\nPoser toutes vos questions, même celles qu’on n’ose pas poser",
  ),
  opinion("wordcloud", "En un mot, comment vous sentez-vous pour ce premier jour ?"),
  opinion("pinpoll", "D’où venez-vous ? Placez votre pin’s sur la carte.", { media: [france], duration: 30 }),
  poll("Pour bien démarrer la journée, c’est plutôt…", ["Café", "Thé", "Jus de fruits", "Rien, merci !"]),
  opinion("wheel", "Qui se présente en premier ? Prénom, poste et une passion en une phrase"),
  scale("Je sais à qui m’adresser si j’ai une question.", "Pas du tout d’accord", "Tout à fait d’accord"),
  opinion("brainstorm", "Qu’aimeriez-vous découvrir en priorité dans vos premières semaines ?"),
  opinion("open", "Une chose que l’équipe devrait savoir sur vous ?"),
  slide(
    "titletext",
    "Merci et bonne arrivée !",
    "Vos réponses aident l’équipe à préparer la suite de votre accueil. À très vite autour d’un café.",
    [m.img("accueil", "Un badge de bienvenue")],
  ),
];

export const meeting: Question[] = [
  slide(
    "title",
    "Brise-glace de réunion",
    "Trois minutes pour prendre la température avant d’entrer dans le vif du sujet.",
    [m.img("reunion", "Une table de réunion")],
  ),
  opinion("pinpoll", "La météo du jour : placez votre pin’s sur votre humeur.", {
    media: [m.img("meteo", "Radieux, ça va, bof ou orageux")],
    anonymous: true,
  }),
  scale("Votre niveau d’énergie ce matin ?", "À plat", "Plein d’énergie"),
  opinion("brainstorm", "Une bonne nouvelle de votre semaine, pro ou perso ?"),
  opinion("wheel", "Qui ouvre le tour de table ?"),
  poll(
    "De quoi doit-on parler en priorité aujourd’hui ?",
    ["Les projets en cours", "L’organisation", "Les idées nouvelles", "Les difficultés du moment"],
    { multiple: true },
  ),
  slide(
    "bullets",
    "Nos règles du jeu",
    "On commence et on finit à l’heure\nUne personne parle à la fois\nLes téléphones restent face cachée (sauf pour SQuizz !)\nOn repart avec des décisions et un responsable pour chacune",
    [m.img("reunion", "Une table de réunion")],
  ),
];

export const kickoff: Question[] = [
  slide(
    "title",
    "Lancement de projet",
    "Partager la vision, clarifier les rôles et lever les inquiétudes dès le premier jour.",
    [m.img("lancement", "Une fusée au décollage")],
  ),
  slide(
    "bullets",
    "Ce que nous allons faire",
    "Partager ce que le projet évoque pour chacun\nRepérer les attentes et les inquiétudes\nChoisir nos façons de travailler ensemble\nRepartir avec les prochaines étapes",
  ),
  opinion("wordcloud", "Ce projet, en un mot ?"),
  scale("Je comprends pourquoi ce projet est lancé.", "Pas du tout", "Parfaitement"),
  opinion("pinpoll", "Où en êtes-vous face à ce projet ? Placez votre pin’s.", {
    media: [m.img("confiance", "Confiance et enthousiasme")],
    anonymous: true,
    duration: 30,
  }),
  opinion("brainstorm", "Pour vous, ce projet sera réussi si…", { duration: 90 }),
  opinion("brainstorm", "Ce qui pourrait nous faire échouer", { anonymous: true, duration: 90 }),
  poll(
    "Comment préférez-vous suivre l’avancement ?",
    [
      "Un point court chaque semaine",
      "Un tableau de suivi partagé",
      "Un bilan mensuel",
      "Des messages au fil de l’eau",
    ],
    { multiple: true },
  ),
  opinion("open", "Une question que vous vous posez encore ?", { anonymous: true }),
  slide(
    "titletext",
    "C’est parti !",
    "Prochaine étape : partager les résultats avec l’équipe et fixer la date du premier point d’étape.",
    [m.img("lancement", "Une fusée au décollage")],
  ),
];

export const training: Question[] = anonymously([
  slide(
    "title",
    "Votre avis sur la formation",
    "Cinq minutes, en toute franchise : les réponses sont anonymes.",
    [m.img("formation", "Un tableau et une médaille")],
  ),
  opinion(
    "pinpoll",
    "Par rapport à vos objectifs de départ, où en êtes-vous ? Le centre : objectifs atteints.",
    {
      media: [m.img("cible", "Une cible")],
      duration: 30,
    },
  ),
  scale("Les objectifs de la formation étaient clairs.", "Pas du tout d’accord", "Tout à fait d’accord"),
  scale("Le contenu correspondait à mes besoins.", "Pas du tout d’accord", "Tout à fait d’accord"),
  scale(
    "Je pourrai appliquer ce que j’ai appris dans mon travail.",
    "Pas du tout d’accord",
    "Tout à fait d’accord",
  ),
  poll("Le rythme de la formation était…", ["Trop lent", "Adapté", "Trop rapide"]),
  poll(
    "Ce qui vous a le plus aidé à apprendre ?",
    [
      "Les apports du formateur",
      "Les exercices pratiques",
      "Les échanges entre participants",
      "Les supports remis",
    ],
    { multiple: true },
  ),
  opinion("nps", "Recommanderiez-vous cette formation à un collègue ?", {
    minLabel: "Peu probable",
    maxLabel: "Très probable",
  }),
  opinion("wordcloud", "Ce que je retiens, en un ou deux mots", { duration: 45 }),
  opinion("open", "Ce que je vais mettre en pratique dès la semaine prochaine", { duration: 90 }),
  opinion("open", "Une suggestion pour améliorer la formation ?"),
  slide(
    "titletext",
    "Merci pour vos réponses !",
    "Elles sont anonymes et serviront à améliorer les prochaines sessions.",
    [m.img("formation", "Un tableau et une médaille")],
  ),
]);

export const workshop: Question[] = [
  slide(
    "title",
    "Atelier d’idées",
    "Faire émerger des idées, les trier, puis choisir ensemble par où commencer.",
    [m.img("atelier", "Un mur de post-it")],
  ),
  slide(
    "bullets",
    "Les règles du brainstorming",
    "La quantité avant la qualité\nAucune critique pendant la récolte\nOn rebondit sur les idées des autres\nLes idées les plus folles sont les bienvenues",
    [m.img("atelier", "Un mur de post-it")],
  ),
  opinion("wordcloud", "Le sujet du jour, ça vous évoque quoi ?"),
  opinion("brainstorm", "Vos idées, jusqu’à trois !", { duration: 90 }),
  opinion("brainstorm", "Et si nous n’avions aucune limite de budget ni de temps ?", { duration: 90 }),
  opinion("pinpoll", "Où placez-vous l’idée qui vous a le plus marqué ?", {
    media: [m.img("matrice", "Impact et effort")],
    duration: 30,
  }),
  poll("Par quoi faut-il commencer ?", [
    "Les idées rapides à mettre en œuvre",
    "Les idées au plus fort impact",
    "Les idées les plus innovantes",
    "Les idées les moins coûteuses",
  ]),
  scale("Je suis prêt(e) à porter une de ces idées.", "Pas du tout", "Je me lance"),
  opinion("wheel", "Qui présente la synthèse de l’atelier ?"),
  opinion("open", "Une idée qui ne vous lâche pas ? Développez-la ici.", { anonymous: true, duration: 90 }),
  slide(
    "titletext",
    "Merci pour vos idées !",
    "Toutes les réponses restent dans les résultats de la partie : de quoi préparer la suite sans rien oublier.",
    [m.img("atelier", "Un mur de post-it")],
  ),
];

export const retro: Question[] = anonymously([
  slide("title", "Rétrospective d’équipe", "Regarder la période écoulée pour mieux préparer la suivante.", [
    m.img("retro", "On fait le point"),
  ]),
  slide(
    "bullets",
    "Le cadre",
    "Ce qui se dit ici reste ici : les réponses sont anonymes\nOn parle des situations, pas des personnes\nChaque avis compte autant\nOn repart avec une action concrète",
  ),
  opinion("wordcloud", "La période écoulée en un mot"),
  opinion("pinpoll", "Où en est notre bateau ? Placez votre pin’s là où l’équipe se sent le plus.", {
    media: [m.img("bateau", "Le vent, l’ancre, les rochers et l’île")],
    duration: 30,
  }),
  opinion("brainstorm", "Le vent : ce qui a bien fonctionné", { duration: 90 }),
  opinion("brainstorm", "L’ancre : ce qui nous a freinés", { duration: 90 }),
  scale("Je me sens écouté(e) dans l’équipe.", "Pas du tout d’accord", "Tout à fait d’accord"),
  scale("Ma charge de travail est soutenable.", "Pas du tout", "Tout à fait"),
  poll("Le chantier prioritaire pour la suite ?", [
    "La communication",
    "L’organisation",
    "Les outils",
    "La charge de travail",
    "La reconnaissance",
  ]),
  opinion("open", "Une action concrète que nous pourrions lancer dès demain ?", { duration: 90 }),
  slide(
    "titletext",
    "Merci pour votre franchise",
    "Partagez les résultats avec l’équipe, choisissez une action et faites le point à la prochaine rétrospective.",
    [m.img("retro", "On fait le point")],
  ),
]);

export const yearEnd: Question[] = [
  slide("title", "Spécial fin d’année", "Un petit quiz entre collègues avant les fêtes !", [
    m.img("fete", "Des guirlandes et des cadeaux"),
  ]),
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
  trueFalse(
    "Dans l’hémisphère Sud, Noël tombe en plein été.",
    true,
    "Vrai : en décembre, c’est l’été en Australie, en Argentine ou à La Réunion.",
  ),
  puzzle(
    "Remettez ces fêtes dans l’ordre du calendrier, d’octobre à janvier.",
    ["Halloween", "La Saint-Nicolas", "Noël", "La Saint-Sylvestre", "L’Épiphanie"],
    "Halloween le 31 octobre, la Saint-Nicolas le 6 décembre, Noël le 25, la Saint-Sylvestre le 31 décembre et l’Épiphanie le 6 janvier.",
  ),
  match(
    "Qui apporte les cadeaux ? Reliez chaque pays à son personnage.",
    [
      ["Italie", "La Befana"],
      ["Pays-Bas", "Sinterklaas"],
      ["Russie", "Ded Moroz"],
      ["Royaume-Uni", "Father Christmas"],
    ],
    "En Italie, la Befana, une gentille sorcière, passe dans la nuit du 5 au 6 janvier ; aux Pays-Bas, Sinterklaas arrive dès le 5 décembre.",
  ),
  slider(
    "En quelle année trouve-t-on, à Sélestat, l’une des plus anciennes mentions écrites de sapins de Noël ?",
    { min: 1000, max: 2000, target: 1521, tolerance: 20 },
    "En 1521 : un registre de comptes de la ville de Sélestat, en Alsace, mentionne des sapins coupés pour Noël. Il est conservé à la Bibliothèque humaniste.",
  ),
  poll("La bûche idéale, c’est…", [
    "Chocolat",
    "Praliné",
    "Fruits rouges",
    "Glacée",
    "Pas de bûche pour moi",
  ]),
  opinion("wordcloud", "Votre vœu pour l’équipe l’année prochaine, en un mot", { duration: 45 }),
  opinion("wheel", "Tirage au sort : qui repart avec le cadeau ?"),
  slide(
    "titletext",
    "Joyeuses fêtes !",
    "Merci à toutes et à tous pour cette année. Rendez-vous en janvier !",
    [m.img("fete", "Des guirlandes et des cadeaux")],
  ),
];

/** Each answer points to one of the four profiles, in a different order every time. */
const profiled = (text: string, answers: [string, string][]) =>
  poll(
    text,
    answers.map(([answer]) => answer),
    { profiles: answers.map(([, profile]) => profile) },
  );
export const teamProfiles: Question[] = [
  slide(
    "title",
    "Quel coéquipier êtes-vous ?",
    "Six situations du quotidien pour dresser le portrait de l’équipe. Pas de bonne réponse : choisissez ce qui vous ressemble le plus.",
    [m.img("profils", "Quatre profils de coéquipiers")],
  ),
  profiled("Un nouveau projet démarre. Votre premier réflexe ?", [
    ["Je me lance et je teste", "Le Moteur"],
    ["Je fais un plan", "Le Stratège"],
    ["Je réunis l’équipe pour en parler", "Le Liant"],
    ["J’imagine des pistes originales", "Le Créatif"],
  ]),
  profiled("En réunion, on vous reconnaît parce que…", [
    ["Vous lancez des idées inattendues", "Le Créatif"],
    ["Vous poussez à décider", "Le Moteur"],
    ["Vous donnez la parole à chacun", "Le Liant"],
    ["Vous posez les bonnes questions", "Le Stratège"],
  ]),
  profiled("Un imprévu bouscule le planning. Vous…", [
    ["Vérifiez que personne n’est débordé", "Le Liant"],
    ["Revoyez les priorités", "Le Stratège"],
    ["Y voyez l’occasion de faire autrement", "Le Créatif"],
    ["Trouvez une solution tout de suite", "Le Moteur"],
  ]),
  profiled("Votre outil fétiche ?", [
    ["Le tableau de bord", "Le Stratège"],
    ["Le carnet de croquis", "Le Créatif"],
    ["La liste de tâches", "Le Moteur"],
    ["La machine à café", "Le Liant"],
  ]),
  profiled("Ce qui vous agace le plus ?", [
    ["« On a toujours fait comme ça »", "Le Créatif"],
    ["Les tensions non dites", "Le Liant"],
    ["L’improvisation permanente", "Le Stratège"],
    ["Les réunions qui n’en finissent pas", "Le Moteur"],
  ]),
  profiled("Le compliment qui vous fait le plus plaisir ?", [
    ["« Grâce à toi, c’est fait ! »", "Le Moteur"],
    ["« On se sent bien avec toi »", "Le Liant"],
    ["« C’était bien pensé »", "Le Stratège"],
    ["« Je n’y aurais jamais pensé »", "Le Créatif"],
  ]),
  opinion("wordcloud", "L’équipe idéale, en un mot ?"),
  slide(
    "titletext",
    "Le portrait de l’équipe",
    "Place aux résultats : SQuizz affiche le profil dominant du groupe. Aucun profil individuel n’est calculé, c’est l’équipe qui se découvre.",
    [m.img("profils", "Quatre profils de coéquipiers")],
  ),
];
