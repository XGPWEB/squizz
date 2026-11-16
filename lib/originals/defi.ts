import { choice, match, media, opinion, outro, puzzle, slide, slider, typed } from "./kit";

const m = media("defi");

/**
 * « Le grand défi des équipes » (2026-11), for team building, events and youth groups: riddles, estimates
 * and proverbs to solve together. Riddles need no source; the few figures are stable (height of the Eiffel
 * Tower since its 2022 antenna, seconds in a day, planet diameters).
 */
export const defi = [
  slide(
    "title",
    "Le grand défi des équipes",
    "Énigmes, estimations, proverbes : à plusieurs, on va plus loin. Discutez, puis répondez !",
    [m.img("couverture", "Un trophée et des mains levées")],
  ),
  slide(
    "bullets",
    "Les règles du défi",
    "Jouez en équipes : chacun répond sur son téléphone\nDiscutez avant de répondre, le chrono tourne\nLe podium désigne l’équipe championne",
  ),
  choice(
    "Un nénuphar double de surface chaque jour. Il couvre tout l’étang au bout de 30 jours. Quand en couvre-t-il la moitié ?",
    ["Au 15e jour", "Au 20e jour", "Au 29e jour", "Au 25e jour"],
    2,
    "Au 29e jour : puisqu’il double chaque jour, il suffit d’une journée pour passer de la moitié à l’étang entier.",
    { duration: 30 },
  ),
  typed(
    "Le père de Marie a cinq filles : Nana, Néné, Nini, Nono… Comment s’appelle la cinquième ?",
    ["marie"],
    "Marie, évidemment : elle est citée dès le début de la question !",
  ),
  slider(
    "Quelle est la hauteur de la tour Eiffel, antennes comprises ?",
    { min: 200, max: 500, step: 5, target: 330, tolerance: 10, unit: "m" },
    "330 mètres depuis l’installation d’une nouvelle antenne en 2022. À son inauguration en 1889, elle mesurait 312 mètres.",
  ),
  choice(
    "Un berger a 17 moutons. Tous meurent sauf 9. Combien lui en reste-t-il ?",
    ["8", "9", "17", "0"],
    1,
    "9 : « tous sauf 9 », ce sont justement les 9 qui restent.",
  ),
  puzzle(
    "Rangez ces planètes de la plus petite à la plus grande.",
    ["Mercure", "Mars", "La Terre", "Neptune", "Jupiter"],
    "Mercure, Mars, la Terre, Neptune, puis Jupiter, géante du système solaire : son diamètre fait environ onze fois celui de la Terre.",
  ),
  choice(
    "Un avion s’écrase pile sur la frontière entre la France et l’Espagne. Où enterre-t-on les survivants ?",
    ["En France", "En Espagne", "Dans leur pays d’origine", "Nulle part : on n’enterre pas les survivants !"],
    3,
    "Les survivants sont… vivants. Une énigme qui prouve qu’il faut toujours lire la question jusqu’au bout.",
  ),
  match(
    "Reliez les débuts et les fins de ces proverbes.",
    [
      ["L’union", "fait la force"],
      ["Pierre qui roule", "n’amasse pas mousse"],
      ["Qui va à la chasse", "perd sa place"],
      ["Petit à petit", "l’oiseau fait son nid"],
    ],
    "Quatre proverbes, dont le premier est la devise de l’équipe gagnante… et de la Belgique.",
  ),
  slider(
    "Combien de secondes y a-t-il dans une journée ?",
    { min: 10000, max: 150000, step: 100, target: 86400, tolerance: 2000 },
    "86 400 secondes : 24 heures × 60 minutes × 60 secondes.",
  ),
  choice(
    "Combien de fois peut-on soustraire 5 de 25 ?",
    ["5 fois", "4 fois", "Une seule fois", "Autant qu’on veut"],
    2,
    "Une seule fois : après, on ne soustrait plus 5 de 25, mais de 20.",
  ),
  opinion("wordcloud", "En un mot, votre équipe ?"),
  opinion("wheel", "Qui reçoit le prix du fair-play ?"),
  outro("À vous de jouer !", "Créez le défi de votre événement : énigmes maison, photos, blind test."),
];
