import { newQuestion, type Question } from "./question";
export type { Question } from "./question";
export type Quiz = {
  id: string;
  title: string;
  tag: string;
  symbol: string;
  color: string;
  desc: string;
  questions: Question[];
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
];
