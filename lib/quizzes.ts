import { newQuestion, type Question } from "./question";
import { managementFpt } from "./originals/management-fpt";
import { tourDuMonde } from "./originals/tour-du-monde";
import { espace } from "./originals/espace";
import { blindTestClassique } from "./originals/blind-test";
import { peinture } from "./originals/peinture";
import { inventions } from "./originals/inventions";
import { francais } from "./originals/francais";
import { cybersecurite } from "./originals/cybersecurite";
import { gastronomie } from "./originals/gastronomie";
import { planete } from "./originals/planete";
import { corpsHumain } from "./originals/corps-humain";
import {
  kickoff,
  meeting,
  retro,
  teamProfiles,
  training,
  welcome,
  workshop,
  yearEnd,
  type Usage,
} from "./originals/templates";
export { USAGES, type Usage } from "./originals/templates";
export type { Question } from "./question";
export type Quiz = {
  id: string;
  title: string;
  tag: string;
  symbol: string;
  color: string;
  desc: string;
  questions: Question[];
  /** Templates by usage: shown apart in the library, filtered by moment. */
  usage?: Usage;
};
const q = (text: string, options: string[], correct: number): Question => ({
  ...newQuestion(),
  text,
  options,
  correct,
  correctAnswers: [correct],
});
export const demos: Quiz[] = [
  {
    id: "tour-du-monde",
    title: "Le tour du monde en 10 escales",
    tag: "GÉOGRAPHIE",
    symbol: "✈︎",
    color: "green",
    desc: "Photos de merveilles, carte à pin’s, appariement : faites le tour de la planète sans quitter la salle.",
    questions: tourDuMonde,
  },
  {
    id: "espace",
    title: "Objectif Lune… et au-delà",
    tag: "ESPACE",
    symbol: "☾︎",
    color: "purple",
    desc: "Images d’Apollo 11, télescope James Webb, grandes premières : un voyage dans le système solaire.",
    questions: espace,
  },
  {
    id: "blind-test-classique",
    title: "Blind test : les grands classiques",
    tag: "MUSIQUE",
    symbol: "♫︎",
    color: "orange",
    desc: "Beethoven, Vivaldi, Offenbach… Écoutez l’extrait, tapez la réponse : le blind test façon SQuizz.",
    questions: blindTestClassique,
  },
  {
    id: "peinture",
    title: "Chefs-d’œuvre : l’œil du connaisseur",
    tag: "ART",
    symbol: "✎︎",
    color: "tangerine",
    desc: "De la Joconde à la Grande Vague : trouvez le détail caché et reliez chaque tableau à son peintre.",
    questions: peinture,
  },
  {
    id: "inventions",
    title: "Ces inventions qui ont changé le monde",
    tag: "HISTOIRE DES SCIENCES",
    symbol: "⚙︎",
    color: "purple",
    desc: "Premier film des Lumière, premier vol des Wright, première photo d’un humain : remontez le temps.",
    questions: inventions,
  },
  {
    id: "francais",
    title: "Les pièges du français",
    tag: "LANGUE FRANÇAISE",
    symbol: "Ç",
    color: "green",
    desc: "Accords, expressions, palindromes et proverbes : textes à trous et appariements pour amoureux des mots.",
    questions: francais,
  },
  {
    id: "cybersecurite",
    title: "Cybersécurité : déjouez les pièges",
    tag: "CYBERSÉCURITÉ",
    symbol: "⚠︎",
    color: "tangerine",
    desc: "Faux courriel à décortiquer, mots de passe, Wi-Fi public : une sensibilisation qui se joue en équipe.",
    questions: cybersecurite,
  },
  {
    id: "gastronomie",
    title: "La France à table",
    tag: "GASTRONOMIE",
    symbol: "♨︎",
    color: "orange",
    desc: "Spécialités régionales, carte à pin’s, grand débat et roue du sort : un tour de France gourmand.",
    questions: gastronomie,
  },
  {
    id: "planete",
    title: "Planète en questions",
    tag: "ENVIRONNEMENT",
    symbol: "❀︎",
    color: "green",
    desc: "Climat, biodiversité, tri : un quiz sourcé qui se termine par un brainstorming d’équipe.",
    questions: planete,
  },
  {
    id: "corps-humain",
    title: "Le corps humain, cette machine incroyable",
    tag: "SANTÉ",
    symbol: "♥︎",
    color: "orange",
    desc: "Squelette à pin’s, organes à relier, carte de chaleur anonyme : la santé au travail en mode jeu.",
    questions: corpsHumain,
  },
  {
    id: "general",
    title: "Le grand mélange",
    tag: "CULTURE GÉNÉRALE",
    symbol: "✳",
    color: "purple",
    desc: "Un peu de tout, beaucoup de surprises.",
    questions: [
      q("Combien de côtés possède un hexagone ?", ["5", "6", "7", "8"], 1),
      q(
        "Qui a peint La Joconde ?",
        ["Claude Monet", "Pablo Picasso", "Léonard de Vinci", "Vincent van Gogh"],
        2,
      ),
      q("Quel est le plus grand océan ?", ["Atlantique", "Indien", "Arctique", "Pacifique"], 3),
      q(
        "Quel instrument possède généralement 88 touches ?",
        ["Le piano", "La guitare", "La flûte", "Le violon"],
        0,
      ),
      q("Quelle planète est surnommée la planète rouge ?", ["Vénus", "Jupiter", "Mars", "Mercure"], 2),
    ],
  },
  {
    id: "geo",
    title: "Destination planète",
    tag: "GÉOGRAPHIE",
    symbol: "◎",
    color: "green",
    desc: "Faites le tour du monde sans bouger.",
    questions: [
      q("Quelle est la capitale du Canada ?", ["Toronto", "Montréal", "Ottawa", "Vancouver"], 2),
      q("Dans quel pays se trouve Kyoto ?", ["Chine", "Japon", "Corée du Sud", "Thaïlande"], 1),
      q("Sur quel continent se trouve le Kenya ?", ["Asie", "Afrique", "Europe", "Amérique du Sud"], 1),
      q("Quel pays a la forme d’une botte ?", ["Grèce", "Portugal", "Italie", "Norvège"], 2),
      q(
        "Quel océan borde la côte ouest de la France métropolitaine ?",
        ["Pacifique", "Indien", "Arctique", "Atlantique"],
        3,
      ),
    ],
  },
  {
    id: "science",
    title: "Esprit scientifique",
    tag: "SCIENCES",
    symbol: "⚡",
    color: "orange",
    desc: "Pour les curieux et les idées lumineuses.",
    questions: [
      q("Quelle est la formule chimique de l’eau ?", ["CO₂", "H₂O", "O₂", "NaCl"], 1),
      q("Quel organe pompe le sang ?", ["Le foie", "Le poumon", "Le cœur", "Le rein"], 2),
      q("Combien de pattes possède une araignée ?", ["4", "6", "8", "10"], 2),
      q(
        "Quelle étoile se trouve au centre de notre système solaire ?",
        ["Sirius", "Le Soleil", "Véga", "L’étoile Polaire"],
        1,
      ),
      q(
        "Quel gaz les plantes absorbent-elles lors de la photosynthèse ?",
        ["Dioxyde de carbone", "Hélium", "Hydrogène", "Néon"],
        0,
      ),
    ],
  },
  {
    id: "management-fpt",
    title: "Manager dans la fonction publique territoriale",
    tag: "MANAGEMENT PUBLIC",
    symbol: "✦",
    color: "tangerine",
    desc: "Statut, dialogue social, entretien pro : testez votre culture de manager territorial.",
    questions: managementFpt,
  },
  {
    id: "modele-accueil",
    title: "Bienvenue dans l’équipe",
    tag: "ACCUEIL",
    symbol: "☀",
    color: "green",
    desc: "Le premier jour des nouveaux arrivants : carte « d’où venez-vous ? », roue des présentations, questions sans tabou.",
    usage: "accueil",
    questions: welcome,
  },
  {
    id: "modele-reunion",
    title: "Brise-glace de réunion",
    tag: "RÉUNION",
    symbol: "◐",
    color: "purple",
    desc: "Météo d’équipe à pin’s, énergie du jour, tour de table tiré au sort et règles du jeu de la réunion.",
    usage: "reunion",
    questions: meeting,
  },
  {
    id: "modele-lancement",
    title: "Lancement de projet",
    tag: "KICK-OFF",
    symbol: "➚",
    color: "purple",
    desc: "Vision partagée, matrice confiance / enthousiasme, attentes et risques : le projet démarre sur de bonnes bases.",
    usage: "reunion",
    questions: kickoff,
  },
  {
    id: "modele-formation",
    title: "Évaluation de fin de formation",
    tag: "FORMATION",
    symbol: "✓",
    color: "tangerine",
    desc: "L’évaluation à chaud, anonyme : cible des objectifs, utilité, recommandation (NPS) et suggestions.",
    usage: "formation",
    questions: training,
  },
  {
    id: "modele-atelier",
    title: "Atelier d’idées",
    tag: "ATELIER",
    symbol: "✷",
    color: "green",
    desc: "Règles du brainstorming, idées sans limite, matrice impact / effort et priorités votées ensemble.",
    usage: "atelier",
    questions: workshop,
  },
  {
    id: "modele-retro",
    title: "Rétrospective d’équipe",
    tag: "BILAN D’ÉQUIPE",
    symbol: "↻",
    color: "orange",
    desc: "Le bateau de l’équipe, ce qui pousse, ce qui freine, le chantier prioritaire : un bilan anonyme.",
    usage: "bilan",
    questions: retro,
  },
  {
    id: "modele-fin-annee",
    title: "Spécial fin d’année",
    tag: "CONVIVIALITÉ",
    symbol: "❄",
    color: "purple",
    desc: "Un quiz léger avant les fêtes, des traditions du monde, un vote gourmand et la roue du cadeau.",
    usage: "fete",
    questions: yearEnd,
  },
  {
    id: "modele-profils",
    title: "Quel coéquipier êtes-vous ?",
    tag: "QUIZ À PROFILS",
    symbol: "◎",
    color: "orange",
    desc: "Moteur, stratège, liant ou créatif ? Six situations pour dresser le portrait de l’équipe, sans classement.",
    usage: "fete",
    questions: teamProfiles,
  },
];
