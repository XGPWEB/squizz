import { choice, match, media, outro, poll, puzzle, slide, slider, trueFalse, typed } from "./kit";

const m = media("espace");

export const espace = [
  slide(
    "title",
    "Objectif Lune… et au-delà",
    "Dix questions pour explorer le système solaire, et même un peu plus loin.",
    [m.img("couverture", "Une fusée en route vers les étoiles")],
  ),
  choice(
    "Ces images de 1969 ont été suivies en direct par des centaines de millions de téléspectateurs. Qui fait ici le premier pas sur la Lune ?",
    ["Neil Armstrong", "Buzz Aldrin", "Youri Gagarine", "Michael Collins"],
    0,
    "Neil Armstrong pose le pied sur la Lune le 21 juillet 1969 (heure française), suivi par Buzz Aldrin. Michael Collins reste en orbite à bord du module Columbia.",
    { media: [m.video("alunissage", "Film : NASA · domaine public")], duration: 30 },
  ),
  slider(
    "À quelle distance moyenne de la Terre se trouve la Lune ?",
    { min: 0, max: 1_000_000, step: 1000, target: 384_000, tolerance: 20_000, unit: "km" },
    "Environ 384 400 km en moyenne. La lumière met un peu plus d’une seconde pour faire le trajet.",
  ),
  puzzle(
    "Rangez ces planètes de la plus proche à la plus éloignée du Soleil.",
    ["Mercure", "Vénus", "Terre", "Mars", "Jupiter", "Saturne"],
    "Mercure, Vénus, Terre, Mars, puis les géantes : Jupiter, Saturne, Uranus et Neptune.",
    { duration: 45 },
  ),
  choice(
    "Quelle planète la sonde Cassini a-t-elle photographiée ici ?",
    ["Saturne", "Jupiter", "Uranus", "Neptune"],
    0,
    "Saturne, à l’équinoxe de 2009. Jupiter, Uranus et Neptune ont aussi des anneaux, mais bien plus discrets.",
    { media: [m.img("planete", "Image : NASA / JPL / Space Science Institute · domaine public")] },
  ),
  trueFalse(
    "La Grande Muraille de Chine est visible à l’œil nu depuis la Lune.",
    false,
    "Faux : à 384 000 km, aucun ouvrage humain n’est visible à l’œil nu. Même depuis la Station spatiale, à 400 km, la Muraille, étroite et de la couleur du sol, se distingue à peine.",
  ),
  slide(
    "bigimage",
    "Les Piliers de la création, vus par Hubble puis par James Webb",
    "Des colonnes de gaz et de poussière hautes de plusieurs années-lumière, où naissent de nouvelles étoiles.",
    [m.video("piliers", "NASA, ESA, CSA, STScI · domaine public")],
  ),
  typed(
    "Comment s’appelle la galaxie dont fait partie notre système solaire ?",
    ["Voie lactée", "La Voie lactée", "Milky Way"],
    "La Voie lactée : une galaxie spirale qui compte de 100 à 400 milliards d’étoiles, dont notre Soleil.",
  ),
  match(
    "Reliez chaque grande première à son pionnier.",
    [
      ["Premier humain dans l’espace (1961)", "Youri Gagarine"],
      ["Première femme dans l’espace (1963)", "Valentina Terechkova"],
      ["Premier Français dans l’espace (1982)", "Jean-Loup Chrétien"],
      ["Première Française dans l’espace (1996)", "Claudie Haigneré"],
    ],
    "Le 12 avril 1961, Youri Gagarine boucle un tour de la Terre en 108 minutes à bord de Vostok 1.",
  ),
  choice(
    "Ce cliché célèbre, « La Bille bleue », a été pris en 1972 par l’équipage de…",
    ["Apollo 17", "Apollo 11", "Spoutnik 1", "La Station spatiale internationale"],
    0,
    "Le 7 décembre 1972, en route vers la Lune, l’équipage d’Apollo 17, la dernière mission lunaire habitée, photographie la Terre entièrement éclairée.",
    { media: [m.img("cliche", "Photo : NASA · domaine public")] },
  ),
  choice(
    "Combien de temps la lumière du Soleil met-elle pour arriver jusqu’à nous ?",
    ["Environ 8 secondes", "Environ 8 minutes", "Environ 8 heures", "Environ 8 jours"],
    1,
    "Environ 8 minutes et 20 secondes pour parcourir 150 millions de kilomètres : quand vous regardez le Soleil, vous le voyez tel qu’il était il y a 8 minutes.",
    { media: [m.img("lumiere", "Du Soleil à la Terre")], points: "double" },
  ),
  poll("Un billet pour Mars est en vente demain. Vous partez ?", [
    "Oui, aller simple !",
    "Oui, avec un billet retour",
    "Je préfère la regarder d’ici",
    "Jamais de la vie",
  ]),
  slide(
    "quote",
    "C’est un petit pas pour l’homme, mais un bond de géant pour l’humanité.",
    "Neil Armstrong, 21 juillet 1969",
    [m.img("astronaute", "Buzz Aldrin sur la Lune, photographié par Neil Armstrong · NASA, domaine public")],
  ),
  outro(
    "Mission accomplie !",
    "Ce quiz est un SQuizz Original. Créez le vôtre en quelques minutes : vidéos, photos, curseurs, appariements… le ciel est la seule limite.",
  ),
];
