import { EVENT_PASS, PLANS } from "./plans";
import { QUESTION_COUNT } from "./seo";
import { MAX_STEPS } from "./question";

/**
 * The pages by usage (/pour/<slug>): who it is for, three short points, the ready-made quizzes that fit
 * (ids of lib/quizzes.ts, checked by a test) and a few questions.
 *
 * SEO: `title`, `description` and `h1` carry what people type (« quiz pour association »…).
 * GEO: `summary` is a short factual answer, quotable as it is by answer engines: it opens the FAQ (and its
 * structured data) and is listed in /llms.txt. Every claim matches the app as it is; numbers come from
 * lib/plans.ts. Keep the visible words few: the quizzes do the talking.
 */
export type Audience = {
  slug: string;
  /** Short name, for links and breadcrumbs. */
  name: string;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  lead: string;
  summary: string;
  points: { title: string; text: string }[];
  quizzes: string[];
  faq: { q: string; a: string }[];
};

const free = PLANS.FREE;
const pass = `${EVENT_PASS.label} (${EVENT_PASS.price} € pour ${EVENT_PASS.days} jours, jusqu’à ${PLANS[EVENT_PASS.plan].maxPlayersPerGame} joueurs)`;
const seats = `de ${PLANS.STARTER.maxMembers} à ${PLANS.PREMIUM.maxMembers} animateurs selon l’offre`;
const base =
  "SQuizz est une plateforme française de quiz interactifs en direct : le quiz est projeté, chacun répond sur son téléphone avec un code ou un QR code, sans application ni compte, et les données sont hébergées en Europe.";

export const AUDIENCES: Audience[] = [
  {
    slug: "entreprises",
    name: "Entreprises",
    title: "Quiz interactif pour entreprise : séminaire, réunion, onboarding",
    description:
      "Quiz interactifs pour l’entreprise : séminaire, réunion, onboarding, formation. Style sobre à vos couleurs, réponses anonymes, données en Europe.",
    eyebrow: "ENTREPRISES",
    h1: "Le quiz interactif, en mode pro",
    lead: "Séminaire, réunion, onboarding : un style sobre à vos couleurs, et toute la salle participe.",
    summary: `${base} Pour les entreprises, SQuizz propose un style sobre (vouvoiement, logo et couleur de l’entreprise), des réponses anonymes aux questions d’avis, des modèles de séminaire, de réunion et d’accueil, et ${seats}.`,
    points: [
      {
        title: "Un style sobre, à vos couleurs",
        text: "Vouvoiement, votre logo, votre couleur ; mention SQuizz masquable.",
      },
      { title: "Des avis sans pression", text: "Réponses anonymes, même dans les résultats gardés." },
      { title: "Toute l’équipe anime", text: `Bibliothèque partagée, ${seats}.` },
    ],
    quizzes: [
      "modele-seminaire",
      "modele-reunion",
      "modele-accueil",
      "modele-lancement",
      "modele-retro",
      "cybersecurite",
    ],
    faq: [
      {
        q: "Le style peut-il être moins festif ?",
        a: "Oui : le style sobre vouvoie les joueurs et reprend le logo et la couleur de votre organisation. Avec une offre payante, la mention « SQuizz » peut être masquée.",
      },
      {
        q: "Où sont les données ?",
        a: "Sur un serveur à Francfort (Allemagne). Les résultats des parties sont supprimés automatiquement après 12 mois.",
      },
    ],
  },
  {
    slug: "collectivites",
    name: "Collectivités",
    title: "Quiz interactif pour collectivités : concertation, citoyenneté, agents",
    description:
      "Quiz et consultations en direct pour les collectivités : citoyenneté, concertation des habitants, formation des agents. Outil français, données en Europe.",
    eyebrow: "COLLECTIVITÉS",
    h1: "Faire participer les habitants et les agents",
    lead: "Réunion publique, conseil des jeunes, formation des agents : chacun s’exprime depuis son téléphone.",
    summary: `${base} Les collectivités s’en servent pour consulter le public (sondages, nuages de mots, réponses anonymes), animer des actions de citoyenneté et former leurs agents ; un style sobre au vouvoiement est disponible.`,
    points: [
      {
        title: "Consulter la salle",
        text: "Sondages, nuages de mots, questions du public, réponses anonymes.",
      },
      {
        title: "Un outil français",
        text: "Éditeur en France, données en Europe, durées de conservation annoncées.",
      },
      { title: "Sobre, à vos couleurs", text: "Vouvoiement, logo et couleur de la collectivité." },
    ],
    quizzes: [
      "republique",
      "management-fpt",
      "planete",
      "cybersecurite",
      "modele-atelier",
      "modele-formation",
    ],
    faq: [
      {
        q: "Peut-on recueillir des avis sans savoir qui a répondu ?",
        a: "Oui : une question d’avis marquée anonyme garde ses chiffres, mais personne ne sait qui a répondu quoi, pas même dans les résultats gardés.",
      },
      {
        q: "Les habitants doivent-ils installer une application ?",
        a: "Non : ils ouvrent la partie dans le navigateur de leur téléphone avec le code ou le QR code et choisissent un pseudo.",
      },
    ],
  },
  {
    slug: "associations",
    name: "Associations",
    title: "Quiz pour association : soirée quiz, AG, accueil des bénévoles",
    description:
      "Animez votre association avec des quiz projetés : soirée quiz, assemblée générale, accueil des bénévoles. Les joueurs répondent sur leur téléphone, sans compte.",
    eyebrow: "ASSOCIATIONS",
    h1: "Le quiz qui anime votre association",
    lead: "Soirée quiz, assemblée générale, accueil des bénévoles : tout le monde joue depuis son téléphone.",
    summary: `${base} Les associations l’utilisent pour leurs soirées quiz, assemblées générales et l’accueil des bénévoles ; plusieurs animateurs partagent les mêmes quiz, et le ${pass} couvre un événement sans abonnement.`,
    points: [
      { title: "Toute l’équipe anime", text: `Une bibliothèque commune, ${seats}.` },
      { title: "Rien à installer", text: "Un code ou un QR code, un pseudo, et c’est parti." },
      { title: "Une soirée, sans abonnement", text: `Le ${pass}.` },
    ],
    quizzes: [
      "modele-fin-annee",
      "blind-test-classique",
      "gastronomie",
      "modele-accueil",
      "modele-atelier",
      "tour-du-monde",
    ],
    faq: [
      {
        q: "Combien de personnes peuvent jouer ?",
        a: `Jusqu’à ${free.maxPlayersPerGame} joueurs par partie en gratuit, ${PLANS.STARTER.maxPlayersPerGame} avec Essentiel, ${PLANS.PRO.maxPlayersPerGame} avec Pro et ${PLANS.PREMIUM.maxPlayersPerGame} avec Premium ou le ${EVENT_PASS.label}.`,
      },
      {
        q: "Peut-on jouer en équipes ?",
        a: "Oui, de 2 à 6 équipes, choisies sur le téléphone ou tirées au hasard, avec un classement des équipes.",
      },
    ],
  },
  {
    slug: "services-jeunesse",
    name: "Services jeunesse",
    title: "Quiz pour les jeunes : animation, prévention, accueil de loisirs",
    description:
      "Quiz interactifs pour les services jeunesse : prévention (cybersécurité, environnement, santé), citoyenneté, ateliers. Les jeunes jouent sur téléphone.",
    eyebrow: "SERVICES JEUNESSE",
    h1: "Des quiz qui font participer les jeunes",
    lead: "Ateliers, accueil de loisirs, prévention : chacun répond sur son téléphone, avec un simple pseudo.",
    summary: `${base} Les services jeunesse s’en servent pour la prévention (cybersécurité, environnement, santé), la citoyenneté et les ateliers : les jeunes jouent avec un simple pseudo, en équipes s’ils le veulent.`,
    points: [
      {
        title: "La prévention qui se joue",
        text: "Cybersécurité, environnement, santé, citoyenneté : des quiz prêts à lancer.",
      },
      { title: "Aucun compte", text: "Un pseudo suffit ; rien à installer sur les téléphones." },
      { title: "En équipes", text: "De 2 à 6 équipes, classement des équipes et podium final." },
    ],
    quizzes: ["cybersecurite", "planete", "corps-humain", "republique", "francais", "blind-test-classique"],
    faq: [
      {
        q: "Que garde SQuizz sur les joueurs ?",
        a: "Seulement un pseudo, les réponses et un cookie technique anonyme. La partie est effacée sous 48 heures ; ses résultats sont gardés 12 mois au plus pour l’organisation qui anime. Les données sont hébergées en Europe.",
      },
      {
        q: "Peut-on proposer un quiz à faire seul, à la maison ?",
        a: "Oui : un lien en autonomie permet à chacun de jouer à son rythme, avec un chrono et la correction à chaque question.",
      },
    ],
  },
  {
    slug: "formateurs",
    name: "Formateurs",
    title: "Quiz pour formateurs : brise-glace, acquis et évaluation de formation",
    description:
      "Des quiz interactifs pour vos formations : brise-glace, vérification des acquis, évaluation de fin de formation. En direct ou en autonomie, résultats exportables.",
    eyebrow: "FORMATEURS",
    h1: "Des quiz pour vos formations",
    lead: "Brise-glace, vérification des acquis, évaluation à chaud : en salle ou chacun à son rythme.",
    summary: `${base} Les formateurs l’utilisent pour les brise-glaces, la vérification des acquis (correction et explication après chaque question) et l’évaluation de fin de formation, en salle ou par lien en autonomie ; les résultats s’exportent en Excel.`,
    points: [
      {
        title: "Vérifier les acquis",
        text: "Correction et explication après chaque question, résultats en Excel.",
      },
      {
        title: "Évaluer la formation",
        text: "Échelles, NPS, questions ouvertes, réponses anonymes si vous le voulez.",
      },
      {
        title: "En direct ou en autonomie",
        text: "Le même quiz projeté en salle, ou par lien à faire seul.",
      },
    ],
    quizzes: [
      "modele-formation",
      "modele-reunion",
      "modele-atelier",
      "cybersecurite",
      "management-fpt",
      "francais",
    ],
    faq: [
      {
        q: "Puis-je importer mes questions ?",
        a: "Oui, depuis un fichier Excel ou CSV (une question par ligne, modèle à télécharger). L’IA peut aussi proposer un quiz à partir d’un texte ou d’un PDF, avec la clé API de votre organisation.",
      },
      {
        q: "Combien de questions par quiz ?",
        a: `Jusqu’à ${MAX_STEPS} étapes, diapos comprises.`,
      },
    ],
  },
  {
    slug: "petites-equipes",
    name: "Petites équipes",
    title: "Brise-glace de réunion et animation d’équipe en quiz",
    description:
      "Brise-glace de réunion, accueil d’un nouveau, lancement de projet, rétrospective : des modèles prêts à lancer pour votre équipe, joués sur téléphone.",
    eyebrow: "PETITES ÉQUIPES",
    h1: "Le brise-glace de vos réunions d’équipe",
    lead: "Accueil d’un nouveau, lancement de projet, rétrospective : cinq minutes, et tout le monde a participé.",
    summary: `${base} Les petites équipes l’utilisent comme brise-glace de réunion, pour accueillir un nouveau, lancer un projet ou faire une rétrospective, avec des modèles prêts à lancer et des réponses anonymes.`,
    points: [
      { title: "Un modèle par moment", text: "Accueil, réunion, projet, rétrospective, fin d’année." },
      {
        title: "Des avis sans pression",
        text: "Réponses anonymes pour les questions d’avis, même dans les résultats.",
      },
      { title: "Toute l’équipe aux manettes", text: `Bibliothèque partagée, ${seats}.` },
    ],
    quizzes: [
      "modele-reunion",
      "modele-accueil",
      "modele-lancement",
      "modele-retro",
      "modele-profils",
      "modele-fin-annee",
    ],
    faq: [
      {
        q: "Faut-il un grand écran ?",
        a: "Non : le quiz s’affiche sur l’écran partagé de votre réunion, y compris en visio, et chacun répond sur son téléphone.",
      },
      {
        q: "Combien coûte une offre d’équipe ?",
        a: `Essentiel ${PLANS.STARTER.price} € par mois (${PLANS.STARTER.maxMembers} animateurs), Pro ${PLANS.PRO.price} € par mois (${PLANS.PRO.maxMembers} animateurs), sans engagement. L’offre gratuite permet d’essayer.`,
      },
    ],
  },
  {
    slug: "particuliers",
    name: "Particuliers",
    title: "Quiz pour soirée entre amis, anniversaire ou mariage",
    description:
      "Un quiz projeté sur la télé, joué sur les téléphones : soirée entre amis, anniversaire, mariage, repas de famille. Gratuit pour les petits groupes.",
    eyebrow: "ENTRE AMIS, EN FAMILLE",
    h1: "Le quiz de vos soirées",
    lead: "Anniversaire, mariage, repas de famille : la télé pour le quiz, les téléphones pour jouer.",
    summary: `${base} Entre amis ou en famille, l’offre gratuite accueille ${free.maxPlayersPerGame} joueurs par partie, sans carte bancaire ; pour un anniversaire ou un mariage, le ${pass} évite tout abonnement.`,
    points: [
      {
        title: "Gratuit en petit comité",
        text: `Jusqu’à ${free.maxPlayersPerGame} joueurs, sans carte bancaire.`,
      },
      { title: "Un grand jour, sans abonnement", text: `Le ${pass}.` },
      { title: "Des quiz prêts", text: "Blind test, tour du monde, gastronomie : à lancer tels quels." },
    ],
    quizzes: ["blind-test-classique", "tour-du-monde", "gastronomie", "espace", "inventions", "peinture"],
    faq: [
      {
        q: "Faut-il créer un compte pour jouer ?",
        a: "Seulement pour la personne qui lance le quiz. Les invités entrent le code ou scannent le QR code et choisissent un pseudo.",
      },
      {
        q: "Peut-on écrire son propre quiz ?",
        a: `Oui, avec des photos, des vidéos et ${QUESTION_COUNT} types de questions (blind test, vrai ou faux, curseur…), ou en adaptant un quiz prêt.`,
      },
    ],
  },
  {
    slug: "agences-evenementielles",
    name: "Agences événementielles",
    title: "Quiz interactif pour l’événementiel : séminaire, soirée, team building",
    description:
      "Animez séminaires, soirées et team buildings avec un quiz en direct aux couleurs du client : équipes, télécommande, tirage au sort, sans appli pour les invités.",
    eyebrow: "AGENCES ÉVÉNEMENTIELLES",
    h1: "L’animation quiz de vos événements",
    lead: "Séminaire, soirée, team building : aux couleurs du client, piloté depuis votre téléphone.",
    summary: `${base} Pour l’événementiel, SQuizz se met aux couleurs du client (logo, couleur, style sobre ou festif), se pilote depuis une télécommande sur téléphone, gère les équipes et le tirage au sort, jusqu’à ${PLANS.PREMIUM.maxPlayersPerGame} joueurs par partie.`,
    points: [
      {
        title: "Aux couleurs du client",
        text: "Logo, couleur, style sobre ou festif ; mention SQuizz masquable.",
      },
      {
        title: "Piloté depuis la salle",
        text: "Télécommande sur téléphone, équipes, roue de tirage au sort.",
      },
      { title: "Par événement", text: `Le ${pass}, ou Premium à l’année.` },
    ],
    quizzes: [
      "modele-seminaire",
      "blind-test-classique",
      "gastronomie",
      "modele-profils",
      "tour-du-monde",
      "modele-fin-annee",
    ],
    faq: [
      {
        q: "Combien d’invités par partie ?",
        a: `Jusqu’à ${PLANS.PREMIUM.maxPlayersPerGame} joueurs par partie avec Premium ou le ${EVENT_PASS.label}.`,
      },
      {
        q: "Peut-on animer sans rester devant l’ordinateur ?",
        a: "Oui : la télécommande, ouverte par un QR code secret, lance les questions, arrête le chrono, passe à la suite et fait tourner la roue.",
      },
    ],
  },
];

export const audienceOf = (slug: string) => AUDIENCES.find((a) => a.slug === slug);
