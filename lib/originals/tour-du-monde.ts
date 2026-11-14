import { choice, match, media, opinion, outro, pin, puzzle, slide, slider, trueFalse, typed } from "./kit";

const m = media("tour-du-monde");
const map = m.img("carte", "Carte : NASA (Blue Marble) · domaine public");

export const tourDuMonde = [
  slide(
    "title",
    "Le tour du monde en 10 escales",
    "Bouclez votre ceinture : six continents, dix questions, un seul classement.",
    [m.img("couverture", "Le tour du monde")],
  ),
  choice(
    "Dans quel pays se trouve cette cité inca perchée à plus de 2 400 m d’altitude ?",
    ["Pérou", "Bolivie", "Chili", "Équateur"],
    0,
    "C’est le Machu Picchu, construit au XVe siècle au-dessus de la vallée de l’Urubamba, au Pérou. Il est inscrit au patrimoine mondial de l’UNESCO depuis 1983.",
    { media: [m.img("escale-1", "Photo : Diego Delso · CC BY-SA 4.0")] },
  ),
  trueFalse(
    "Ce monument taillé dans la falaise se trouve en Égypte.",
    false,
    "Faux : c’est Al-Khazneh, « le Trésor », à Pétra, en Jordanie. Les Nabatéens l’ont sculpté dans le grès rose il y a environ 2 000 ans.",
    { media: [m.img("escale-2", "Photo : Graham Racher · CC BY-SA 2.0")] },
  ),
  pin(
    "Placez le pin’s sur Madagascar.",
    map,
    { x: 0.63, y: 0.606, radius: 0.035 },
    "Madagascar, dans l’océan Indien, au large du Mozambique, est la quatrième plus grande île du monde. Près de 90 % de ses espèces de plantes et d’animaux n’existent nulle part ailleurs.",
  ),
  choice(
    "Ce monolithe, sacré pour le peuple anangu, se dresse au cœur de quel pays ?",
    ["Australie", "Afrique du Sud", "Namibie", "États-Unis"],
    0,
    "C’est Uluru, au centre de l’Australie : un bloc de grès de 348 m de haut. Son ascension est interdite depuis 2019, par respect pour les Anangu.",
    { media: [m.img("escale-3", "Photo : Dietmar Rabich · CC BY-SA 4.0")] },
  ),
  match(
    "Reliez chaque merveille à son pays.",
    [
      ["Le Taj Mahal", "Inde"],
      ["La Grande Muraille", "Chine"],
      ["La baie d’Ha Long", "Viêt Nam"],
      ["Les moaï de l’île de Pâques", "Chili"],
    ],
    "L’île de Pâques (Rapa Nui), perdue dans le Pacifique à plus de 3 500 km des côtes, appartient au Chili depuis 1888.",
    {
      media: [
        m.img("escale-4", "Taj Mahal · photo Yann · CC BY-SA 4.0"),
        m.img("escale-5", "Grande Muraille · photo Velatrix · CC0"),
        m.img("escale-6", "Baie d’Ha Long · photo Thomas Hirsch · CC BY-SA 3.0"),
        m.img("escale-7", "Moaï · photo Aurbina · domaine public"),
      ],
    },
  ),
  slider(
    "Combien d’États sont membres de l’Organisation des Nations unies ?",
    { min: 100, max: 250, target: 193, tolerance: 3, unit: "États" },
    "193 États membres depuis l’entrée du Soudan du Sud en 2011. Le Vatican et la Palestine y siègent comme observateurs.",
  ),
  puzzle(
    "Classez ces sommets du plus haut au plus bas.",
    ["Everest", "K2", "Kilimandjaro", "Mont-Blanc"],
    "Everest : 8 849 m. K2 : 8 611 m. Kilimandjaro, toit de l’Afrique : 5 895 m. Mont-Blanc : 4 805 m (mesure de 2021).",
  ),
  typed(
    "Quelle est la capitale de l’Australie ?",
    ["Canberra"],
    "Canberra, et non Sydney ni Melbourne : la ville a été créée de toutes pièces au début du XXe siècle pour départager ces deux rivales.",
  ),
  choice(
    "Lesquels de ces pays sont traversés par l’équateur ?",
    ["Brésil", "Kenya", "Indonésie", "Mexique", "Inde", "Égypte"],
    [0, 1, 2],
    "Le Brésil, le Kenya et l’Indonésie. L’équateur traverse treize pays, dont… l’Équateur, qui lui doit son nom.",
    { duration: 30, points: "double" },
  ),
  opinion("pinpoll", "Et vous, où rêvez-vous de partir ? Placez votre pin’s !", {
    media: [map],
    duration: 30,
  }),
  outro(
    "Bon retour parmi nous !",
    "Ce quiz est un SQuizz Original. Dupliquez-le, changez les escales, ajoutez vos photos… et faites voyager votre équipe.",
  ),
];
