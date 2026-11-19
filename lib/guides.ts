import { demos } from "./quizzes";

/**
 * The guides (/guides/<slug>): practical how-tos written for what people search (« animer un séminaire »,
 * « organiser une soirée quiz »…), each step showing the SQuizz feature and a ready-made quiz that does it.
 *
 * Every claim matches the app as it is (types, teams, remote, audience questions, autonomous replay);
 * no statistics without a source. Quiz ids come from lib/quizzes.ts and audience slugs from
 * lib/audiences.ts (both checked by a test). Keep each step short: one idea, one sentence or two.
 */
export type GuideStep = {
  title: string;
  text: string;
  /** Handwritten sticker: when or why, in a few words. */
  note: string;
  /** Question types used (labels of lib/question.ts), shown as tags. */
  types?: string[];
  /** A ready-made quiz (id of lib/quizzes.ts) that does it. */
  quiz?: string;
};

export type Guide = {
  slug: string;
  /** Short name, for links and breadcrumbs. */
  name: string;
  title: string;
  description: string;
  eyebrow: string;
  /** The H1, with its middle word on the pink sticker. */
  h1: [before: string, sticker: string, after: string];
  lead: string;
  /** Card colour (classes of base.css) and big symbol. */
  color: "purple" | "green" | "orange" | "tangerine";
  symbol: string;
  published: string;
  steps: GuideStep[];
  /** Pages by usage this guide serves (slugs of lib/audiences.ts). */
  audiences: string[];
  faq: { q: string; a: string }[];
};

export const GUIDES: Guide[] = [
  {
    slug: "animer-un-seminaire",
    name: "Animer un séminaire",
    title: "Animer un séminaire d’entreprise : 8 idées interactives",
    description:
      "8 idées pour animer un séminaire d’entreprise : attentes en nuage de mots, défi d’équipes, questions anonymes, satisfaction et tirage au sort du lot.",
    eyebrow: "GUIDE · SÉMINAIRE",
    h1: ["8 idées pour un séminaire qui", "bouge", ""],
    lead: "De l’accueil à la clôture, un moment interactif toutes les heures : la salle participe, vous gardez le fil.",
    color: "purple",
    symbol: "8",
    published: "2026-11-19",
    steps: [
      {
        title: "Ouvrez sur les attentes",
        text: "« En un mot, qu’attendez-vous de ces deux jours ? » Les mots les plus cités s’affichent en plus gros : vous savez tout de suite ce qui compte pour la salle.",
        note: "Dès l’accueil",
        types: ["Nuage de mots"],
        quiz: "modele-seminaire",
      },
      {
        title: "Prenez la température",
        text: "Une échelle « Votre énergie ce matin, de 1 à 5 » fait sourire et vous dit s’il faut accélérer ou ralentir.",
        note: "Avant le 1er café",
        types: ["Échelle"],
      },
      {
        title: "Brisez la glace en riant",
        text: "Quelques vrais ou faux sur l’entreprise, ou le jargon de la maison à décoder : tout le monde peut jouer, personne n’est mis en difficulté.",
        note: "Pour détendre",
        types: ["Vrai ou faux", "Quiz"],
        quiz: "jargon-bureau",
      },
      {
        title: "Relancez après la pause avec un défi d’équipes",
        text: "Activez le mode équipes dans la salle d’attente (de 2 à 6 équipes, noms personnalisés ou tirés au sort) : énigmes et estimations, le score de l’équipe est la moyenne de ses joueurs.",
        note: "Le creux de 14 h",
        types: ["Curseur", "Puzzle"],
        quiz: "defi-equipes",
      },
      {
        title: "Laissez venir les questions qui fâchent",
        text: "Ouvrez les questions du public : chacun écrit depuis son téléphone, anonymement s’il le souhaite, et vote pour celles des autres. Vous validez avant affichage.",
        note: "Pendant la plénière",
        types: ["Questions du public"],
      },
      {
        title: "Vérifiez que le message est passé",
        text: "Cinq questions sur les annonces du matin, avec une explication après chaque correction : on retient mieux ce qu’on a dû retrouver soi-même.",
        note: "Après les annonces",
        types: ["Quiz", "Textes à trous"],
      },
      {
        title: "Récoltez les idées de tous",
        text: "Un brainstorming où chacun propose jusqu’à trois idées : même les plus discrets participent, et tout est gardé dans les résultats.",
        note: "Atelier de l’après-midi",
        types: ["Brainstorming"],
        quiz: "modele-atelier",
      },
      {
        title: "Clôturez : satisfaction et tirage au sort",
        text: "Une échelle NPS en réponse anonyme, puis la roue tire au sort le gagnant du lot parmi les pseudos des joueurs. Tout le monde reste jusqu’au bout.",
        note: "Le mot de la fin",
        types: ["Échelle NPS", "Roue de tirage au sort"],
        quiz: "modele-seminaire",
      },
    ],
    audiences: ["entreprises", "agences-evenementielles", "petites-equipes"],
    faq: [
      {
        q: "Combien de moments interactifs prévoir dans un séminaire ?",
        a: "Un toutes les heures environ suffit : cinq minutes de quiz, de vote ou de nuage de mots relancent l’attention sans voler la place des intervenants.",
      },
      {
        q: "Les participants doivent-ils installer une application ?",
        a: "Non : ils scannent le QR code ou tapent le code de la partie sur www.squizz.fun/jouer, choisissent un pseudo et jouent dans le navigateur de leur téléphone.",
      },
      {
        q: "Peut-on animer depuis la scène, loin de l’ordinateur ?",
        a: "Oui : la télécommande s’ouvre sur votre téléphone avec un QR code. Vous lancez les questions, passez à la suite et tirez la roue sans revenir au pupitre.",
      },
    ],
  },
  {
    slug: "quel-format-de-question",
    name: "Choisir le bon format",
    title: "Quiz, sondage, nuage de mots : quel format pour quelle question ?",
    description:
      "Vérifier des connaissances, recueillir des avis, faire émerger des idées : le bon format de question interactive pour chaque objectif, avec exemples.",
    eyebrow: "GUIDE · FORMATS",
    h1: ["Le bon", "format", "pour chaque question"],
    lead: "Avant d’écrire la question, demandez-vous ce que vous voulez obtenir de la salle. Le format suit.",
    color: "green",
    symbol: "?",
    published: "2026-11-19",
    steps: [
      {
        title: "Vérifier des connaissances",
        text: "Le quiz à choix multiples et le vrai ou faux vont vite ; les textes à trous obligent à retrouver le mot exact. Ajoutez une explication : elle s’affiche avec la correction.",
        note: "Ce qu’on a appris",
        types: ["Quiz", "Vrai ou faux", "Textes à trous"],
        quiz: "francais",
      },
      {
        title: "Faire deviner un chiffre",
        text: "Avec le curseur, chacun place sa réponse ; les plus proches marquent le plus. Idéal pour les dates, les distances, les budgets.",
        note: "Ça divise la salle",
        types: ["Curseur"],
        quiz: "inventions",
      },
      {
        title: "Situer sur une carte ou une image",
        text: "La réponse par pin’s fait viser le bon endroit ; « Place le pin’s », sans bonne réponse, montre où la salle se situe : un quartier, une zone d’un schéma.",
        note: "Sur un plan",
        types: ["Réponse par pin’s", "Place le pin’s"],
        quiz: "modele-concertation",
      },
      {
        title: "Mettre dans l’ordre, relier",
        text: "Le puzzle fait classer des étapes ou des dates ; l’appariement fait relier chaque élément à sa correspondance. Parfait pour une procédure ou un vocabulaire.",
        note: "Pour les procédures",
        types: ["Puzzle", "Appariement"],
      },
      {
        title: "Mesurer un avis",
        text: "Le sondage pour choisir entre quelques options, l’échelle pour une intensité (d’accord, pas d’accord), le NPS pour la recommandation. Marquez-les anonymes si le sujet est sensible.",
        note: "Sans bonne réponse",
        types: ["Sondage", "Échelle", "Échelle NPS"],
        quiz: "modele-formation",
      },
      {
        title: "Faire émerger des mots ou des idées",
        text: "Le nuage de mots pour une impression en un mot, le brainstorming pour des propositions, la question ouverte pour une vraie phrase.",
        note: "Parole à la salle",
        types: ["Nuage de mots", "Brainstorming", "Question ouverte"],
        quiz: "modele-atelier",
      },
      {
        title: "Rythmer et surprendre",
        text: "Une diapo annonce la manche suivante ou donne une info ; un blind test réveille la salle ; la roue désigne qui répond ou qui gagne.",
        note: "Entre deux manches",
        types: ["Diapo", "Blind test", "Roue de tirage au sort"],
      },
    ],
    audiences: ["formateurs", "collectivites", "services-jeunesse"],
    faq: [
      {
        q: "Peut-on mélanger questions notées et questions d’avis dans un même quiz ?",
        a: "Oui : un même quiz peut enchaîner quiz, sondages, nuages de mots et diapos. Seules les questions notées comptent pour le classement.",
      },
      {
        q: "Quelle différence entre une échelle et un sondage ?",
        a: "Le sondage fait choisir une option parmi plusieurs ; l’échelle mesure une intensité sur un axe (Likert ou graduation personnalisée), et affiche la moyenne de la salle.",
      },
    ],
  },
  {
    slug: "organiser-une-soiree-quiz",
    name: "Organiser une soirée quiz",
    title: "Organiser une soirée quiz : le guide pas à pas",
    description:
      "Organiser une soirée quiz entre amis, en famille ou en association : manches, blind test, équipes, matériel, animation et podium, étape par étape.",
    eyebrow: "GUIDE · SOIRÉE",
    h1: ["Une soirée quiz", "réussie", "en 7 étapes"],
    lead: "Un écran, des téléphones, quelques manches bien choisies : le reste, c’est de l’ambiance.",
    color: "orange",
    symbol: "7",
    published: "2026-11-19",
    steps: [
      {
        title: "Pensez à votre salle avant vos questions",
        text: "Âges, centres d’intérêt, durée : une famille sur trois générations ne rit pas des mêmes questions qu’une équipe de foot. Visez large, avec des questions faciles pour démarrer.",
        note: "Qui vient ?",
        quiz: "generations",
      },
      {
        title: "Découpez en manches",
        text: "Trois ou quatre manches à thème, chacune annoncée par une diapo grand titre : le public sait où il en est, et vous avez des pauses naturelles.",
        note: "Le squelette",
        types: ["Diapo"],
      },
      {
        title: "Variez les plaisirs",
        text: "Un blind test, un nombre à deviner au curseur, une photo où placer son pin’s : changer de format toutes les trois ou quatre questions garde la salle éveillée.",
        note: "Jamais deux pareils",
        types: ["Blind test", "Curseur", "Réponse par pin’s"],
        quiz: "blind-test-classique",
      },
      {
        title: "Préparez la salle",
        text: "Un écran ou une télé branchée à l’ordinateur, des enceintes pour le blind test, du réseau pour les téléphones. Affichez le QR code dès l’arrivée des invités.",
        note: "La veille",
      },
      {
        title: "Formez les équipes",
        text: "De 2 à 6 équipes, choisies par les joueurs ou réparties au hasard, avec des noms personnalisés. Mélangez les âges : les plus jeunes ont le téléphone, les plus anciens les réponses.",
        note: "Le moment drôle",
        quiz: "defi-equipes",
      },
      {
        title: "Animez, téléphone en main",
        text: "La télécommande vous laisse circuler dans la salle : lancer, passer à la suite, arrêter une question. Lisez l’explication après chaque correction, c’est là que naissent les débats.",
        note: "Le jour J",
      },
      {
        title: "Finissez en beauté, puis rejouez",
        text: "Podium et confettis, la roue pour le lot de consolation. Ceux qui étaient absents ? Envoyez-leur un lien pour jouer le même quiz en autonomie.",
        note: "Le bouquet final",
        types: ["Roue de tirage au sort"],
        quiz: "modele-fin-annee",
      },
    ],
    audiences: ["particuliers", "associations", "services-jeunesse"],
    faq: [
      {
        q: "Combien de questions prévoir pour une soirée quiz ?",
        a: "Comptez une trentaine de secondes à une minute par question avec la correction : 30 à 40 questions en trois ou quatre manches remplissent bien une heure.",
      },
      {
        q: "Faut-il que chaque invité ait un téléphone ?",
        a: "Non : en équipes, un téléphone par équipe suffit. Chaque joueur peut aussi répondre depuis le sien, sans application ni compte.",
      },
    ],
  },
];

export const guideOf = (slug: string) => GUIDES.find((g) => g.slug === slug);

/** The guides that serve a page by usage. */
export const guidesFor = (audience: string) => GUIDES.filter((g) => g.audiences.includes(audience));

/** A ready-made quiz, for the « À lancer » chip of a step. */
export const guideQuiz = (id: string) => demos.find((q) => q.id === id);

/** Reading time, rounded up, from the visible words. */
export function readingMinutes(g: Guide) {
  const words = [g.lead, ...g.steps.flatMap((s) => [s.title, s.text]), ...g.faq.flatMap((f) => [f.q, f.a])]
    .join(" ")
    .split(/\s+/).length;
  return Math.max(2, Math.ceil(words / 200));
}
