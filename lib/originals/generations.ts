import { choice, match, media, opinion, outro, puzzle, slide, slider, trueFalse, typed } from "./kit";

const m = media("generations");

/**
 * « Années 80, 90, 2000 : le quiz des générations » (2026-11), for family meals, parties and associations:
 * objects, events and films everyone remembers, so that parents and children play together. Only dated
 * facts (release dates, official conversion rate, results).
 */
export const generations = [
  slide(
    "title",
    "Années 80, 90, 2000 : le quiz des générations",
    "Walkman, Minitel, Game Boy, passage à l’euro : les parents vont briller… ou pas.",
    [m.img("couverture", "Une cassette, une console et un téléphone")],
  ),
  puzzle(
    "Rangez ces nouveautés de la plus ancienne à la plus récente.",
    ["Le Walkman", "Le Minitel", "La Game Boy", "Les pièces en euros", "L’iPhone"],
    "Walkman (1979), Minitel (1982 pour le grand public), Game Boy (1989 au Japon), euros en poche (1er janvier 2002), iPhone (2007).",
  ),
  match(
    "Reliez chaque objet à ce qu’on en faisait.",
    [
      ["Tamagotchi", "Nourrir un animal virtuel"],
      ["Minitel", "Consulter l’annuaire sur un écran"],
      ["Walkman", "Écouter ses cassettes en marchant"],
      ["Game Boy", "Jouer à Tetris dans le car"],
    ],
    "Le Tamagotchi de Bandai (1996), le Minitel de France Télécom, le Walkman de Sony et la Game Boy de Nintendo, vendue avec Tetris.",
  ),
  choice(
    "Combien de francs valait un euro au moment du passage à l’euro ?",
    ["5,55957 F", "6,55957 F", "7,55957 F", "6,95957 F"],
    1,
    "6,55957 francs : le taux fixé le 31 décembre 1998. Pendant des mois, on a tous multiplié par 6,56… de tête.",
  ),
  choice(
    "Le 12 juillet 1998, la France devient championne du monde de football. Contre qui ?",
    ["L’Italie", "L’Allemagne", "Le Brésil", "L’Argentine"],
    2,
    "3-0 contre le Brésil au Stade de France, avec deux buts de Zinédine Zidane et un d’Emmanuel Petit.",
  ),
  trueFalse(
    "Le Minitel a fonctionné jusqu’en 2012.",
    true,
    "Vrai : France Télécom a coupé le service le 30 juin 2012, trente ans après le lancement commercial.",
  ),
  typed(
    "Quel casse-tête coloré, inventé en Hongrie en 1974, a fait fureur au début des années 80 ?",
    ["rubik's cube", "rubiks cube", "rubik cube", "cube de rubik", "rubik's", "rubik"],
    "Le Rubik’s Cube, du nom de son inventeur, Ernő Rubik, professeur d’architecture à Budapest.",
  ),
  choice(
    "Combien d’Oscars le film Titanic (1997) a-t-il remportés ?",
    ["7", "9", "11", "14"],
    2,
    "Onze, un record qu’il partage avec Ben-Hur (1959) et Le Seigneur des anneaux : le Retour du roi (2003).",
  ),
  slider(
    "En quelle année le mur de Berlin est-il tombé ?",
    { min: 1960, max: 2000, target: 1989, tolerance: 0 },
    "Le 9 novembre 1989. L’Allemagne est réunifiée moins d’un an plus tard, le 3 octobre 1990.",
  ),
  trueFalse(
    "Le premier tome de Harry Potter est paru avant l’an 2000.",
    true,
    "Vrai : en 1997 au Royaume-Uni, et en 1998 en France chez Gallimard Jeunesse.",
  ),
  opinion("wordcloud", "Un objet de votre enfance que vous aimeriez retrouver ?"),
  outro("À vous de jouer !", "Créez le quiz de votre famille : souvenirs, photos, anecdotes."),
];
