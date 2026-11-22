import { EVENT_PASS, PLANS } from "./plans";
import { QUESTION_COUNT } from "./seo";
import { MAX_STEPS } from "./question";
import { demos } from "./quizzes";

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
  /** Title of the quiz section, in the words of this audience. */
  quizHeading: string;
  /** The quizzes that fit (ids of lib/quizzes.ts), each with a handwritten note: the moment it is for. */
  quizzes: [id: string, note: string][];
  faq: { q: string; a: string }[];
};

const free = PLANS.FREE;
/** A quiz title, quoted: taken from lib/quizzes.ts so that the answers follow a renamed quiz. */
const quiz = (id: string) => `« ${demos.find((q) => q.id === id)?.title ?? id} »`;
const pass = `${EVENT_PASS.label} (${EVENT_PASS.price} € pour ${EVENT_PASS.days} jours, jusqu’à ${PLANS[EVENT_PASS.plan].maxPlayersPerGame} joueurs)`;
const seats = `de ${PLANS.STARTER.maxMembers} à ${PLANS.PREMIUM.maxMembers} animateurs selon l’offre`;
const base =
  "SQuizz est une plateforme française de quiz interactifs en direct : le quiz est projeté, chacun répond sur son téléphone avec un code ou un QR code, sans application ni compte, et les données sont hébergées en Europe.";

export const AUDIENCES: Audience[] = [
  {
    slug: "entreprises",
    name: "Entreprises",
    title: "Quiz interactif pour entreprise : séminaire, réunion",
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
    quizHeading: "Six quiz pour la vie de l’entreprise",
    quizzes: [
      ["modele-seminaire", "Pour le séminaire"],
      ["jargon-bureau", "Pour détendre la réunion"],
      ["defi-equipes", "Pour le team building"],
      ["modele-accueil", "Pour l’onboarding"],
      ["cybersecurite", "Pour sensibiliser"],
      ["modele-retro", "Pour le bilan"],
    ],
    faq: [
      {
        q: "Comment animer un séminaire d’entreprise avec un quiz ?",
        a: "Ouvrez avec le modèle « Séminaire : ouverture et clôture » (attentes en nuage de mots, énergie du jour, questions anonymes), lancez « Le grand défi des équipes » après la pause, et terminez par la satisfaction (NPS) et le tirage au sort du lot à la roue.",
      },
      {
        q: "Un quiz peut-il sensibiliser les salariés à la cybersécurité ?",
        a: "Oui : l’Original « Cybersécurité : déjouez les pièges » fait repérer l’arnaque dans un faux courriel, choisir un mot de passe robuste et adopter les bons réflexes, avec une explication après chaque réponse. Vous pouvez y ajouter vos propres consignes.",
      },
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
    title: "Quiz interactif pour collectivités : concertation",
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
    quizHeading: "Six quiz pour la vie locale",
    quizzes: [
      ["modele-concertation", "Pour la réunion publique"],
      ["republique", "Pour le conseil des jeunes"],
      ["planete", "Pour la semaine du climat"],
      ["management-fpt", "Pour les managers"],
      ["cybersecurite", "Pour les agents"],
      ["modele-atelier", "Pour l’atelier participatif"],
    ],
    faq: [
      {
        q: "Comment consulter les habitants en réunion publique ?",
        a: "Avec le modèle « Réunion publique : la parole aux habitants » : remplacez le plan d’exemple par celui de votre quartier ; les habitants y placent un pin’s, votent leurs priorités et posent leurs questions aux élus, anonymement. Les résultats se gardent et s’exportent en Excel pour la synthèse.",
      },
      {
        q: "Peut-on animer un conseil municipal des jeunes avec SQuizz ?",
        a: "Oui : l’Original « La République en questions » révise la devise, le vote, les collectivités et les lieux du pouvoir, puis donne la parole aux jeunes avec un sondage et un nuage de mots anonymes. Chacun joue avec un pseudo, sans compte.",
      },
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
    title: "Quiz pour association : soirée quiz, AG, bénévoles",
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
    quizHeading: "Six quiz pour la vie de l’asso",
    quizzes: [
      ["modele-assemblee-generale", "Pour l’AG"],
      ["loi-1901", "Pour les nouveaux bénévoles"],
      ["generations", "Pour la soirée quiz"],
      ["blind-test-classique", "Pour le repas des adhérents"],
      ["modele-accueil", "Pour la rentrée"],
      ["gastronomie", "Pour la fête du village"],
    ],
    faq: [
      {
        q: "Comment animer l’assemblée générale d’une association ?",
        a: "Le modèle « Assemblée générale d’association » ouvre sur l’année en un mot, fait voter les temps forts, recueille les idées de projets et les envies de bénévolat, puis tire la tombola à la roue. Les votes officiels restent ceux de vos statuts : les sondages prennent le pouls de la salle.",
      },
      {
        q: "Comment organiser une soirée quiz dans son association ?",
        a: `Projetez le quiz : chacun rejoint la partie avec le code ou le QR code, en équipe s’il le souhaite. ${quiz("generations")}, le blind test ou « La France à table » se lancent tels quels ou s’adaptent, et le ${pass} couvre la soirée sans abonnement.`,
      },
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
    title: "Quiz pour les jeunes : animation, prévention, loisirs",
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
    quizHeading: "Six quiz pour vos ateliers jeunes",
    quizzes: [
      ["ecrans-reseaux", "Pour la prévention numérique"],
      ["cybersecurite", "Contre les arnaques"],
      ["planete", "Pour l’éco-citoyenneté"],
      ["corps-humain", "Pour la prévention santé"],
      ["republique", "Pour le conseil des jeunes"],
      ["defi-equipes", "Pour l’accueil de loisirs"],
    ],
    faq: [
      {
        q: "Comment sensibiliser les jeunes au cyberharcèlement ?",
        a: "L’Original « Réseaux sociaux : les bons réflexes » se joue sur téléphone : repérer une arnaque au concours, connaître le 3018, respecter le droit à l’image, ne pas relayer une moquerie. Une explication suit chaque réponse, et deux questions anonymes ouvrent la discussion.",
      },
      {
        q: "Quel quiz pour un accueil de loisirs ?",
        a: "« Le grand défi des équipes » : énigmes, estimations et proverbes à résoudre en équipes, avec un podium à la fin. Pour un temps plus calme, « Planète en questions » ou « Le corps humain » mêlent photos, carte à pin’s et questions à relier.",
      },
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
    title: "Quiz pour formateurs : brise-glace et évaluation",
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
    quizHeading: "Six quiz pour vos formations",
    quizzes: [
      ["modele-debut-formation", "Pour la première heure"],
      ["apprendre", "Pour former les formateurs"],
      ["modele-formation", "Pour l’évaluation à chaud"],
      ["modele-atelier", "Pour le travail en groupe"],
      ["cybersecurite", "Un exemple d’acquis à vérifier"],
      ["francais", "Pour les savoirs de base"],
    ],
    faq: [
      {
        q: "Quel brise-glace pour commencer une formation ?",
        a: "Le modèle « Brise-glace de début de formation » : attentes en nuage de mots, niveau de départ, raison de la venue, tour de présentation tiré au sort à la roue, puis vos objectifs et vos règles. Les réponses, anonymes, aident à ajuster le rythme.",
      },
      {
        q: "Pourquoi utiliser des quiz en formation ?",
        a: "Parce que se tester aide à retenir : c’est l’effet test, mesuré par Roediger et Karpicke en 2006. L’Original « Comment apprend-on vraiment ? » présente cette étude et d’autres (courbe de l’oubli, effet d’espacement, neuromythes), sources à l’appui.",
      },
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
    quizHeading: "Six quiz pour votre équipe",
    quizzes: [
      ["modele-reunion", "Pour le lundi matin"],
      ["jargon-bureau", "Pour la pause café"],
      ["defi-equipes", "Pour la sortie d’équipe"],
      ["modele-accueil", "Pour accueillir le nouveau"],
      ["modele-retro", "Pour la rétro"],
      ["modele-profils", "Pour mieux se connaître"],
    ],
    faq: [
      {
        q: "Quel brise-glace pour une réunion d’équipe ?",
        a: "Le modèle « Brise-glace de réunion » se joue en trois minutes : météo de l’humeur à pin’s, énergie du jour, bonne nouvelle de la semaine et tour de table tiré au sort. Pour rire un peu, « Le jargon du bureau décodé » traduit KPI, OKR et ASAP.",
      },
      {
        q: "Quelle activité pour une sortie d’équipe ?",
        a: "« Le grand défi des équipes » : énigmes, estimations et proverbes à résoudre ensemble, en 2 à 6 équipes, avec classement et podium. « Quel coéquipier êtes-vous ? » dresse ensuite le portrait du groupe, sans classement.",
      },
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
    quizHeading: "Six quiz pour vos soirées",
    quizzes: [
      ["modele-mariage", "Pour le mariage"],
      ["generations", "Pour le repas de famille"],
      ["defi-equipes", "Pour l’anniversaire"],
      ["blind-test-classique", "Pour l’apéro"],
      ["gastronomie", "Pour les gourmands"],
      ["tour-du-monde", "Pour les voyageurs"],
    ],
    faq: [
      {
        q: "Comment faire un quiz pour un mariage ?",
        a: `Partez du modèle « Le quiz des mariés » : remplacez les prénoms, les lieux et les anecdotes, ajoutez des photos du couple. Les invités votent (« Qui a fait le premier pas ? »), les mariés révèlent les réponses et la roue désigne qui repart avec le centre de table. Le ${pass} couvre le grand jour.`,
      },
      {
        q: "Quel quiz pour un repas de famille ?",
        a: `${quiz("generations")} fait jouer parents et enfants ensemble : Walkman, Minitel, Game Boy, passage à l’euro, Coupe du monde 1998. La télé affiche les questions, chacun répond sur son téléphone.`,
      },
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
    title: "Quiz pour l’événementiel : séminaire, team building",
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
    quizHeading: "Six quiz pour vos événements",
    quizzes: [
      ["defi-equipes", "Pour le team building"],
      ["modele-seminaire", "Pour le séminaire client"],
      ["generations", "Pour la soirée de gala"],
      ["modele-mariage", "Pour les mariages"],
      ["modele-profils", "Pour l’incentive"],
      ["blind-test-classique", "Pour le cocktail"],
    ],
    faq: [
      {
        q: "Comment animer un team building avec un quiz ?",
        a: "Formez de 2 à 6 équipes sur les téléphones, lancez « Le grand défi des équipes » (énigmes, estimations, proverbes à résoudre ensemble), puis « Quel coéquipier êtes-vous ? » pour dresser le portrait du groupe. La télécommande permet d’animer depuis la scène.",
      },
      {
        q: "Peut-on animer un mariage ou une soirée privée ?",
        a: `Oui : le modèle « Le quiz des mariés » s’adapte en quelques minutes (prénoms, photos, anecdotes) et ${quiz("generations")} réunit toutes les générations. Les invités rejoignent la partie avec le code ou le QR code, sans application.`,
      },
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
