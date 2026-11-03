import { COMPANY_INFO } from "@/lib/company-info";
import { EVENT_PASS, PLAN_KEYS, PLANS, limitsSummary, priceLabel } from "@/lib/plans";
import { questionGroups, questionTypes, slideLayouts, type QuestionType } from "@/lib/question";

/**
 * Facts about SQuizz shared by the visible pages, the structured data (JSON-LD) and /llms.txt, so
 * search engines and AI assistants read exactly what visitors read. Keep every claim verifiable.
 */
const SITE = COMPANY_INFO.siteUrl;
const free = PLANS.FREE;
const top = PLANS.PREMIUM;

/** « Essentiel à 15 € / mois, Pro à 30 € / mois et Premium annuel à 310 € / an ». */
export const PAID_PLANS_TEXT = PLAN_KEYS.filter((k) => k !== "FREE")
  .map((k) => `${PLANS[k].label} à ${priceLabel(PLANS[k])}`)
  .join(", ")
  .replace(/, ([^,]*)$/, " et $1");

export const SUMMARY =
  "SQuizz est une plateforme française de quiz interactifs en direct, dans l’esprit de Kahoot! : " +
  "l’animateur projette le quiz, les participants répondent depuis leur téléphone avec un code ou un QR code, " +
  "sans application ni compte, et suivent le classement en direct.";

export const ADVANTAGES = [
  {
    title: "Français, de A à Z",
    text: "Interface, quiz d’exemple, e-mails et support en français. Conçu et édité en France par Pressweb.",
  },
  {
    title: "Données hébergées en Europe",
    text: "Serveur à Francfort (Allemagne), conformité RGPD, parties supprimées après 24 heures et leurs résultats après 12 mois, automatiquement.",
  },
  {
    title: "Essai gratuit, puis sans engagement",
    text: `L’offre gratuite permet d’essayer SQuizz sans carte bancaire (${free.maxQuizzes} quiz, ${free.maxPlayersPerGame} joueurs par partie). Les offres payantes, sans engagement et résiliables à tout moment, vont jusqu’à ${top.maxPlayersPerGame} joueurs par partie.`,
  },
  {
    title: "Rien à installer, aucun compte joueur",
    text: "Les joueurs rejoignent depuis n’importe quel navigateur avec un code ou un QR code, et choisissent simplement un pseudo.",
  },
  {
    title: "Pensé pour les équipes",
    text: "Espace d’organisation avec administrateurs et animateurs, bibliothèque de quiz partagée, droits par rôle.",
  },
  {
    title: "Sans publicité",
    text: "Aucune publicité ni pour l’animateur ni pour les joueurs, y compris avec l’offre gratuite.",
  },
];

/**
 * Every step of the editor (lib/question.ts) as the public site presents it: same order and families,
 * written for visitors. A new type that is missing here fails the type check.
 */
export const TYPE_DETAILS: Record<QuestionType, string> = {
  quiz: "Les joueurs choisissent parmi plusieurs propositions, avec une ou plusieurs bonnes réponses.",
  truefalse: "Une affirmation, deux boutons : vrai ou faux. Idéal pour démarrer en douceur.",
  text: "Les joueurs tapent une courte réponse ; vous acceptez plusieurs orthographes.",
  blindtest:
    "Un extrait (fichier audio ou YouTube, image masquée) passe sur le grand écran : trouvez le titre ou l’artiste.",
  slider: "Les joueurs estiment un nombre sur un curseur, avec la marge d’erreur que vous fixez.",
  pin: "Les joueurs placent un pin’s au bon endroit sur une image : une carte, un schéma, une photo.",
  puzzle: "Les joueurs remettent les propositions dans le bon ordre : dates, étapes, classements.",
  fill: "Les joueurs complètent un texte, jusqu’à 10 trous, sans se soucier des majuscules ni des accents.",
  match: "Les joueurs relient de 2 à 6 éléments à leur correspondance.",
  poll: "Chacun vote parmi 6 propositions au plus, et les résultats s’affichent sur le grand écran.",
  scale: "Une échelle de Likert ou personnalisée pour mesurer opinions et ressentis.",
  nps: "De 0 à 10 : la satisfaction du groupe et son score NPS, calculé pour vous.",
  pinpoll: "Chacun place son pin’s sur une image, et tous les pin’s apparaissent ensemble.",
  wordcloud: "Quelques mots par personne, réunis en nuage : les plus cités ressortent en grand.",
  open: "Une réponse rédigée, pour recueillir des retours détaillés.",
  brainstorm: "Jusqu’à trois idées par personne, rassemblées sur le grand écran.",
  slide: `Du texte, des images ou une vidéo entre deux questions, en ${slideLayouts.length} mises en page.`,
  wheel:
    "La roue tourne sur tous les écrans et s’arrête sur un joueur, ou sur une entrée de votre liste : gages, thèmes, lots…",
};

/** The families as the site names them, each with its steps. */
export const TYPE_FAMILIES = questionGroups.map((g) => ({
  ...g,
  types: questionTypes.filter((t) => t.group === g.label),
}));

/** Question types proper (diapos and the wheel are steps without answers). */
export const QUESTION_COUNT = questionTypes.filter((t) => t.group !== "Diapos multimédias").length;

/**
 * What SQuizz does beyond the questions, by moment. Each claim matches the app as it is (see CHANGELOG.md);
 * update it with the feature.
 */
export const FEATURES = [
  {
    id: "creer",
    label: "Créer en quelques minutes",
    items: [
      {
        icon: "ai",
        title: "Un quiz rédigé par l’IA",
        text: "Collez un texte, un fichier ou un PDF : l’IA propose de 5 à 20 questions, que vous relisez dans l’éditeur. Avec le compte Claude ou ChatGPT de votre organisation, dont la clé reste chiffrée.",
      },
      {
        icon: "import",
        title: "Import depuis Excel ou CSV",
        text: "Une question par ligne, avec le modèle à télécharger. Les tableurs au format Kahoot! sont compris aussi.",
      },
      {
        icon: "templates",
        title: "Des modèles prêts à jouer",
        text: "Accueil d’un nouveau, brise-glace de réunion, fin de formation, rétrospective, fin d’année : à lancer tel quel ou à adapter.",
      },
      {
        icon: "media",
        title: "Images, vidéos et sons",
        text: "Ajoutez vos images, vidéos, extraits audio ou liens YouTube, une explication à la correction, des points doublés.",
      },
    ],
  },
  {
    id: "animer",
    label: "Animer en direct",
    items: [
      {
        icon: "teams",
        title: "Mode équipes",
        text: "De 2 à 6 équipes, choisies sur le téléphone ou tirées au hasard. Classement des équipes après chaque question et podium final.",
      },
      {
        icon: "remote",
        title: "Télécommande sur votre téléphone",
        text: "Scannez un QR code secret : lancez, arrêtez le chrono, passez à la suite et faites tourner la roue sans revenir à l’ordinateur.",
      },
      {
        icon: "qa",
        title: "Questions du public",
        text: "Les participants posent leurs questions, avec leur pseudo ou anonymement, et votent pour celles des autres. Modération au choix.",
      },
      {
        icon: "anonymous",
        title: "Réponses anonymes",
        text: "Pour les questions d’avis, personne ne sait qui a répondu quoi, pas même dans les résultats gardés.",
      },
    ],
  },
  {
    id: "rythme",
    label: "Jouer à son rythme",
    items: [
      {
        icon: "solo",
        title: "Quiz en autonomie",
        text: "Un lien et un QR code ouverts 24 heures, 7 ou 30 jours : chacun joue seul, avec correction immédiate, score et rang.",
      },
      {
        icon: "replay",
        title: "Rejouer en différé",
        text: "À la fin d’une partie, rouvrez le même quiz pendant 7 jours pour les absents ou ceux qui veulent retenter leur chance.",
      },
      {
        icon: "profiles",
        title: "Quiz à profils",
        text: "Associez chaque réponse d’un sondage à un profil : le groupe découvre son profil dominant à la fin, sans classement.",
      },
    ],
  },
  {
    id: "resultats",
    label: "Après la partie",
    items: [
      {
        icon: "results",
        title: "Résultats gardés 12 mois",
        text: "Classement, chiffres question par question et réponses de chaque joueur, même pour une partie arrêtée en route.",
      },
      {
        icon: "export",
        title: "Export Excel et PDF",
        text: "Un classeur .xlsx avec toutes les réponses, ou une version imprimable à joindre à votre compte rendu.",
      },
    ],
  },
  {
    id: "image",
    label: "À votre image",
    items: [
      {
        icon: "theme",
        title: "Style coloré ou sobre",
        text: "Le style SQuizz, ou un thème sobre pour les réunions et les formations, avec votre logo et votre couleur.",
      },
      {
        icon: "brand",
        title: "Votre marque d’abord",
        text: "Avec une offre payante ou le Pack Événement, la mention « SQuizz » peut disparaître des écrans de jeu.",
      },
      {
        icon: "team",
        title: "Une équipe, une bibliothèque",
        text: "Administrateurs et animateurs partagent les mêmes quiz, chacun avec ses droits.",
      },
    ],
  },
] as const;
export type FeatureIcon = (typeof FEATURES)[number]["items"][number]["icon"];

const typeList = (group: string) =>
  questionTypes
    .filter((t) => t.group === group)
    .map((t) => t.label.toLowerCase())
    .join(", ");

export const FAQ: { q: string; a: string }[] = [
  { q: "Qu’est-ce que SQuizz ?", a: SUMMARY },
  {
    q: "SQuizz est-il une bonne alternative à Kahoot! ?",
    a:
      "Oui, si vous cherchez un outil en français avec des données hébergées en Europe : SQuizz reprend le principe du quiz projeté " +
      `et joué sur téléphone, propose ${QUESTION_COUNT} types de questions et accueille jusqu’à ${top.maxPlayersPerGame} joueurs par partie, ` +
      "sans publicité et sans engagement.",
  },
  {
    q: "Les joueurs doivent-ils installer une application ou créer un compte ?",
    a: "Non. Ils ouvrent www.squizz.fun/jouer sur leur téléphone, saisissent le code de la partie (ou scannent le QR code) et choisissent un pseudo.",
  },
  {
    q: "SQuizz est-il gratuit ?",
    a:
      `Oui, pour essayer : l’offre gratuite comprend ${free.maxQuizzes} quiz, ${free.maxPlayersPerGame} joueurs par partie et ${free.maxMembers} animateur, ` +
      `sans carte bancaire. Pour aller plus loin : ${PAID_PLANS_TEXT}, sans engagement et résiliables à tout moment.`,
  },
  {
    q: "Combien de joueurs peuvent participer à une partie ?",
    a: `Jusqu’à ${free.maxPlayersPerGame} joueurs avec l’offre gratuite, ${PLANS.STARTER.maxPlayersPerGame} avec Essentiel, ${PLANS.PRO.maxPlayersPerGame} avec Pro et ${top.maxPlayersPerGame} avec Premium annuel.`,
  },
  {
    q: "Quels types de questions propose SQuizz ?",
    a:
      `${QUESTION_COUNT} types, en deux familles. Pour tester les connaissances, avec points et classement : ` +
      `${typeList("Tester les connaissances")}. Pour collecter des avis, sans points : ${typeList("Collecter des avis")}. ` +
      `S’y ajoutent des diapos (${slideLayouts.length} mises en page) et une roue de tirage au sort.`,
  },
  {
    q: "Peut-on créer un quiz avec l’intelligence artificielle ?",
    a: "Oui. Collez un texte ou envoyez un fichier (texte ou PDF) : l’IA propose de 5 à 20 questions, que vous relisez et modifiez dans l’éditeur. La génération utilise le compte Claude ou ChatGPT de votre organisation : un administrateur enregistre sa clé une fois, chiffrée et jamais réaffichée. Vous pouvez aussi importer vos questions depuis Excel ou un fichier CSV.",
  },
  {
    q: "Peut-on jouer en équipes ?",
    a: "Oui. Dans la salle d’attente, l’animateur crée de 2 à 6 équipes ; chaque joueur choisit la sienne sur son téléphone, ou l’animateur les répartit au hasard. Le score d’une équipe est la moyenne de ses joueurs, pour comparer des équipes de tailles différentes, avec un classement après chaque question et un podium des équipes.",
  },
  {
    q: "Les participants peuvent-ils jouer seuls, sans animateur ?",
    a: "Oui. Le quiz en autonomie donne un lien et un QR code ouverts 24 heures, 7 ou 30 jours : chacun joue à son rythme, avec correction immédiate, score final et rang parmi ceux qui ont terminé. À la fin d’une partie en direct, vous pouvez aussi la rouvrir en différé pendant 7 jours.",
  },
  {
    q: "Que reste-t-il après une partie ?",
    a: "Les résultats : classement, chiffres question par question et réponses de chaque joueur, consultables 12 mois dans l’onglet « Résultats » et exportables en Excel ou en PDF. Pour les questions d’avis réglées en « anonyme », seuls les chiffres et les réponses sans nom sont gardés.",
  },
  {
    q: "Où sont hébergées les données et que deviennent-elles ?",
    a:
      "Sur un serveur situé à Francfort (Allemagne, Union européenne). Les parties sont supprimées automatiquement " +
      "24 heures après, et leurs résultats (pseudos, réponses, scores) 12 mois après. SQuizz respecte le RGPD : chaque utilisateur peut exporter ou supprimer son compte.",
  },
  {
    q: "Peut-on utiliser SQuizz pour un seul événement, sans abonnement ?",
    a: `Oui. Le ${EVENT_PASS.label} coûte ${EVENT_PASS.price} € en une seule fois : pendant ${EVENT_PASS.days} jours, jusqu’à ${PLANS[EVENT_PASS.plan].maxPlayersPerGame} joueurs par partie, sans abonnement ni renouvellement.`,
  },
  {
    q: "Peut-on faire un blind test avec SQuizz ?",
    a: "Oui. Le type de question « Blind test » joue un extrait (fichier audio ou lien YouTube, image masquée) sur l’écran de l’animateur ; les joueurs écrivent le titre ou l’artiste sur leur téléphone. Les droits de diffusion de la musique restent à la charge de l’organisateur.",
  },
  {
    q: "Pour qui est fait SQuizz ?",
    a: "Entreprises (séminaires, réunions, formations, onboarding, bilans d’équipe), écoles et formateurs (révisions, évaluations ludiques, quiz à faire en autonomie), associations et événements (soirées quiz, mariages, jeux en équipes).",
  },
  {
    q: "Qui édite SQuizz ?",
    a: `${COMPANY_INFO.editor.name}, agence web française basée à Émerainville (Seine-et-Marne). Contact : ${COMPANY_INFO.editor.email}.`,
  },
];

export const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE}/#organization`,
  name: COMPANY_INFO.editor.name,
  url: "https://www.pressweb.fr/",
  email: COMPANY_INFO.editor.email,
  telephone: COMPANY_INFO.editor.phone,
  address: {
    "@type": "PostalAddress",
    postalCode: "77184",
    addressLocality: "Émerainville",
    addressCountry: "FR",
  },
};

export const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE}/#website`,
  name: "SQuizz",
  url: SITE,
  inLanguage: "fr-FR",
  publisher: { "@id": `${SITE}/#organization` },
};

export const softwareLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "@id": `${SITE}/#app`,
  name: "SQuizz",
  url: SITE,
  description: SUMMARY,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Tous (navigateur web)",
  inLanguage: "fr-FR",
  image: `${SITE}/opengraph-image.png`,
  publisher: { "@id": `${SITE}/#organization` },
  featureList: [
    ...ADVANTAGES.map((a) => a.title),
    ...FEATURES.flatMap((g) => g.items.map((i) => i.title)),
    ...questionTypes.map((t) => t.label),
  ],
  offers: PLAN_KEYS.map((k) => {
    const p = PLANS[k];
    return {
      "@type": "Offer",
      name: p.label,
      description: limitsSummary(p),
      price: String(p.price),
      priceCurrency: "EUR",
      url: `${SITE}/tarifs`,
      ...(p.period && {
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: String(p.price),
          priceCurrency: "EUR",
          unitCode: p.period === "an" ? "ANN" : "MON",
          referenceQuantity: {
            "@type": "QuantitativeValue",
            value: 1,
            unitCode: p.period === "an" ? "ANN" : "MON",
          },
        },
      }),
    };
  }),
};

export const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};
