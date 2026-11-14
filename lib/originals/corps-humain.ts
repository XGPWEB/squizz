import { choice, match, media, opinion, outro, pin, puzzle, slide, slider, trueFalse, typed } from "./kit";

const m = media("corps-humain");
const skeleton = m.img("squelette", "Illustration : LadyofHats · domaine public");

export const corpsHumain = [
  slide(
    "title",
    "Le corps humain, cette machine incroyable",
    "Os, organes, cellules : dix questions pour découvrir ce qui se passe sous la peau.",
    [m.img("couverture", "Un cœur et un électrocardiogramme")],
  ),
  slider(
    "Combien d’os compte le squelette d’un adulte ?",
    { min: 100, max: 400, target: 206, tolerance: 5, unit: "os" },
    "206 os en général. Un nouveau-né en a davantage, environ 300 : certains se soudent pendant la croissance, comme ceux du crâne.",
    { media: [skeleton] },
  ),
  pin(
    "Placez le pin’s sur le sternum, l’os plat auquel sont reliées les côtes.",
    skeleton,
    { x: 0.465, y: 0.27, radius: 0.07 },
    "Le sternum, au milieu de la poitrine. Avec les côtes, il forme la cage thoracique, qui protège le cœur et les poumons.",
  ),
  choice(
    "Vues au microscope électronique, ces cellules en forme de disque transportent l’oxygène dans le sang. Ce sont…",
    ["Des globules rouges", "Des globules blancs", "Des plaquettes", "Des neurones"],
    0,
    "Les globules rouges, ou hématies, doivent leur couleur à l’hémoglobine, qui fixe l’oxygène. Un adulte en compte plus de 20 000 milliards, renouvelés en permanence.",
    { media: [m.img("globules", "Image : J.-L. Vives-Corrons, E. Krishnevskaya · CC BY 4.0")] },
  ),
  trueFalse(
    "Le cœur d’un adulte au repos bat environ 100 000 fois par jour.",
    true,
    "Vrai : à 70 battements par minute, cela fait plus de 100 000 battements par jour, et environ 2,5 milliards au cours d’une vie.",
    { media: [m.img("coeur", "Boum boum")] },
  ),
  choice(
    "Quel est l’organe le plus étendu du corps humain ?",
    ["La peau", "Le foie", "Les intestins", "Le cerveau"],
    0,
    "La peau : environ 2 m² chez un adulte. Elle nous protège, régule notre température et nous permet de sentir le chaud, le froid ou une caresse.",
  ),
  match(
    "Reliez chaque organe à l’une de ses fonctions.",
    [
      ["Le cœur", "Pomper le sang"],
      ["Les poumons", "Faire entrer l’oxygène dans le sang"],
      ["Les reins", "Filtrer le sang et produire l’urine"],
      ["Le foie", "Fabriquer la bile"],
      ["L’estomac", "Digérer grâce aux sucs gastriques"],
    ],
    "Le foie a plus de 300 fonctions : il stocke l’énergie, fabrique des protéines, neutralise des toxines… et produit la bile, qui aide à digérer les graisses.",
    { media: [m.img("organes", "Cinq organes")], duration: 60 },
  ),
  typed(
    "Comment s’appelle le plus petit os du corps humain, caché dans l’oreille ?",
    ["étrier", "l’étrier", "l'étrier", "stapes"],
    "L’étrier, qui mesure environ 3 mm. Avec le marteau et l’enclume, il transmet les vibrations du tympan jusqu’à l’oreille interne.",
    { media: [m.img("oreille", "L’oreille")] },
  ),
  puzzle(
    "Remettez dans l’ordre le trajet d’une bouchée de pain.",
    ["La bouche", "L’œsophage", "L’estomac", "L’intestin grêle", "Le gros intestin"],
    "De la bouche au gros intestin, le voyage dure de 24 à 72 heures. L’intestin grêle, où sont absorbés la plupart des nutriments, mesure à lui seul 6 à 7 mètres.",
  ),
  choice(
    "Combien de litres de sang circulent dans le corps d’un adulte ?",
    ["Environ 1 litre", "Environ 5 litres", "Environ 10 litres", "Environ 20 litres"],
    1,
    "Environ 5 litres, soit 7 à 8 % du poids du corps. Le cœur fait circuler l’ensemble de ce sang en une minute environ.",
    { points: "double" },
  ),
  opinion(
    "pinpoll",
    "Après une journée de travail, où avez-vous le plus souvent mal ? Placez votre pin’s (réponses anonymes).",
    { media: [skeleton], anonymous: true, duration: 30 },
  ),
  outro(
    "Prenez soin de vous !",
    "Ce quiz est un SQuizz Original. Questions sur image, cartes de chaleur anonymes, curseurs : créez le vôtre pour vos actions de prévention et de santé au travail.",
  ),
];
