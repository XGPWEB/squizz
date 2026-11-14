import { choice, fill, match, media, opinion, outro, pin, puzzle, slide, slider, trueFalse } from "./kit";

const m = media("inventions");
const pd = "Wikimedia Commons · domaine public";
const boulevard = m.img("photo-1", `Louis Daguerre, 1838 · ${pd}`);

export const inventions = [
  slide(
    "title",
    "Ces inventions qui ont changé le monde",
    "De l’imprimerie au cinéma, dix questions pour remonter le temps des grandes idées.",
    [m.img("couverture", "Une ampoule et des engrenages")],
  ),
  choice(
    "Ce film d’une cinquantaine de secondes est l’un des premiers de l’histoire. Qui l’a tourné ?",
    ["Les frères Lumière", "Thomas Edison", "Georges Méliès", "Les frères Pathé"],
    0,
    "Auguste et Louis Lumière, inventeurs du Cinématographe, organisent la première projection publique payante le 28 décembre 1895, au Salon indien du Grand Café, à Paris. L’Arrivée d’un train en gare de La Ciotat compte parmi leurs toutes premières vues.",
    { media: [m.video("film", `Auguste et Louis Lumière · ${pd}`)], duration: 30 },
  ),
  puzzle(
    "Classez ces inventions de la plus ancienne à la plus récente.",
    [
      "L’imprimerie à caractères mobiles",
      "La photographie",
      "Le téléphone",
      "L’avion à moteur",
      "Le World Wide Web",
    ],
    "Gutenberg vers 1450, Niépce en 1826-1827, Bell en 1876, les frères Wright en 1903 et Tim Berners-Lee en 1989-1991.",
    { duration: 45 },
  ),
  trueFalse(
    "Sur cette photo de 1838, le boulevard parisien semble désert… alors qu’il grouillait de monde.",
    true,
    "Vrai : la pose durait plusieurs minutes, si bien que les passants et les fiacres en mouvement ne se sont pas imprimés. Seul est resté un homme immobile, qui se faisait cirer les chaussures.",
    { media: [boulevard] },
  ),
  pin(
    "Un homme immobile est resté sur la photo : sans doute le premier être humain jamais photographié. Trouvez-le !",
    boulevard,
    { x: 0.21, y: 0.78, radius: 0.07 },
    "En bas à gauche, sur le trottoir : un homme qui se fait cirer les chaussures, assez longtemps pour apparaître sur cette vue du boulevard du Temple prise par Louis Daguerre.",
  ),
  choice(
    "17 décembre 1903 : premier vol motorisé et contrôlé de l’histoire. Combien de temps dure-t-il ?",
    ["12 secondes", "2 minutes", "12 minutes", "1 heure"],
    0,
    "Orville Wright vole 12 secondes sur 37 mètres à Kitty Hawk, en Caroline du Nord. Le quatrième vol de la journée, piloté par son frère Wilbur, tient 59 secondes.",
    { media: [m.img("photo-2", `John T. Daniels, 1903 · ${pd}`)] },
  ),
  fill(
    "Complétez la phrase.",
    "Vers 1450, à Mayence, Johannes [Gutenberg] met au point l’imprimerie à caractères [mobiles].",
    "Ses caractères en métal, réutilisables, permettent d’imprimer la célèbre Bible à 42 lignes vers 1455. Le livre devient beaucoup plus accessible.",
    { media: [m.img("photo-3", "Photo : MC BSU · CC0")] },
  ),
  slider(
    "En quelle année la tour Eiffel a-t-elle été inaugurée ?",
    { min: 1850, max: 1950, target: 1889, tolerance: 2 },
    "En 1889, pour l’Exposition universelle, après deux ans, deux mois et cinq jours de travaux. Avec ses 300 mètres, elle est alors la plus haute construction du monde.",
    { media: [m.img("photo-4", `Louis-Émile Durandelle, 1888 · ${pd}`)] },
  ),
  choice(
    "En 1886, Carl Benz dépose le brevet de…",
    [
      "La première automobile à moteur à essence",
      "La première moto",
      "Le premier tracteur",
      "Le premier moteur Diesel",
    ],
    0,
    "Le brevet du 29 janvier 1886 protège un tricycle à moteur à essence. En 1888, Bertha Benz l’emprunte pour parcourir plus de 100 km : le premier long voyage en automobile.",
    { media: [m.img("photo-5", "Photo : Aisano · Licence Art Libre")] },
  ),
  match(
    "Reliez chaque inventeur à son invention.",
    [
      ["Blaise Pascal", "Une machine à calculer"],
      ["Louis Braille", "Une écriture en relief pour les aveugles"],
      ["Alexander Graham Bell", "Le téléphone"],
      ["Tim Berners-Lee", "Le World Wide Web"],
    ],
    "Pascal invente la Pascaline vers 1642, à 19 ans. Louis Braille publie son système en 1829, à 20 ans : il était lui-même aveugle depuis l’enfance.",
  ),
  opinion("brainstorm", "L’invention qui manque vraiment à votre quotidien ? Jusqu’à trois idées !", {
    media: [m.img("idees", "Trois idées")],
  }),
  outro(
    "Et la prochaine invention ?",
    "Ce quiz est un SQuizz Original. À votre tour d’inventer : créez un quiz en quelques minutes, avec vos vidéos, vos photos et dix-huit types d’étapes.",
  ),
];
