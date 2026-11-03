import { COMPANY_INFO } from "@/lib/company-info";
import { EVENT_PASS, PLAN_KEYS, PLANS, limitsSummary, priceLabel } from "@/lib/plans";

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

export const QUESTION_TYPES = [
  "Quiz (choix multiples)",
  "Vrai ou faux",
  "Réponse libre",
  "Blind test (extrait musical à deviner)",
  "Curseur",
  "Réponse par pin’s sur une image",
  "Puzzle (remettre dans l’ordre)",
  "Sondage",
  "Échelle",
  "NPS",
  "Place le pin’s (sondage sur image)",
  "Nuage de mots",
  "Question ouverte",
  "Brainstorming",
];

export const FAQ: { q: string; a: string }[] = [
  { q: "Qu’est-ce que SQuizz ?", a: SUMMARY },
  {
    q: "SQuizz est-il une bonne alternative à Kahoot! ?",
    a:
      "Oui, si vous cherchez un outil en français avec des données hébergées en Europe : SQuizz reprend le principe du quiz projeté " +
      `et joué sur téléphone, propose ${QUESTION_TYPES.length} types de questions et accueille jusqu’à ${top.maxPlayersPerGame} joueurs par partie, ` +
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
    a: `${QUESTION_TYPES.length} types : ${QUESTION_TYPES.join(", ").toLowerCase()}. Des diapositives permettent aussi d’ajouter du contenu entre les questions.`,
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
    a: "Entreprises (séminaires, formations, onboarding), écoles et formateurs (révisions, évaluations ludiques), associations et événements (soirées quiz, mariages).",
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
  featureList: [...ADVANTAGES.map((a) => a.title), ...QUESTION_TYPES],
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
