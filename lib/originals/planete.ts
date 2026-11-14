import { choice, match, media, opinion, outro, puzzle, scale, slide, slider, trueFalse } from "./kit";

const m = media("planete");

export const planete = [
  slide(
    "title",
    "Planète en questions",
    "Climat, biodiversité, océans : testez vos connaissances… puis place aux idées de toute l’équipe !",
    [m.img("couverture", "La Terre et une feuille")],
  ),
  choice(
    "Quelle part des principales cultures alimentaires mondiales dépend, au moins en partie, des pollinisateurs comme l’abeille ?",
    ["10 %", "35 %", "75 %", "95 %"],
    2,
    "Environ 75 %, selon le rapport de l’IPBES (2016) : fruits, légumes, café, cacao… Ces cultures pèsent environ 35 % du volume de la production alimentaire mondiale.",
    { media: [m.img("photo-1", "Photo : Luc Viatour · CC BY-SA 3.0")] },
  ),
  trueFalse(
    "La posidonie, cette « herbe » qui tapisse les fonds de la Méditerranée, est une algue.",
    false,
    "Faux : c’est une plante à fleurs, avec des racines, des feuilles, des fleurs et des fruits. Ses herbiers abritent de nombreuses espèces et stockent beaucoup de carbone ; elle est protégée en France depuis 1988.",
    { media: [m.img("photo-2", "Photo : Karim Saari · CC BY 4.0")] },
  ),
  slider(
    "Selon le GIEC (2021), de combien la surface de la Terre s’est-elle réchauffée entre 1850-1900 et 2011-2020 ?",
    { min: 0, max: 5, step: 0.1, target: 1.1, tolerance: 0.1, unit: "°C" },
    "Environ 1,1 °C. Cela paraît peu, mais c’est une moyenne mondiale : les glaciers des Alpes, comme la Mer de Glace, reculent de plusieurs dizaines de mètres par an.",
    { media: [m.img("photo-3", "La Mer de Glace · photo Whgler · CC BY-SA 4.0")] },
  ),
  choice(
    "La Grande Barrière de corail, vue ici d’avion, s’étend au large de…",
    ["L’Australie", "L’Indonésie", "Les Philippines", "Madagascar"],
    0,
    "Au large du Queensland, en Australie, sur plus de 2 300 km : c’est le plus grand ensemble de récifs coralliens au monde. Des vagues de chaleur marine y ont provoqué plusieurs épisodes de blanchissement massif.",
    { media: [m.img("photo-4", "Photo : Ank Kumar · CC BY-SA 4.0")] },
  ),
  choice(
    "Lequel de ces choix réduit le plus votre empreinte carbone sur une année ?",
    [
      "Éteindre ses appareils en veille",
      "Renoncer à un aller-retour Paris – New York en avion",
      "Trier tous ses emballages",
      "Supprimer ses vieux courriels",
    ],
    1,
    "Un aller-retour Paris – New York émet plus d’une tonne d’équivalent CO₂ par passager, soit plus d’un dixième de l’empreinte annuelle moyenne d’un Français (environ 9 tonnes). Calculez vos propres trajets sur impactco2.fr (ADEME).",
  ),
  puzzle(
    "Classez ces transports, du moins au plus émetteur de CO₂ par kilomètre et par passager.",
    ["Le TGV", "L’autocar", "La voiture thermique (seul à bord)", "L’avion court-courrier"],
    "Selon l’ADEME, un trajet en TGV émet quelques grammes de CO₂ par kilomètre et par passager, l’autocar une trentaine, la voiture thermique avec une seule personne à bord plus de 200, et l’avion court-courrier davantage encore.",
    { media: [m.img("transports", "Train, car, voiture, avion")] },
  ),
  match(
    "Reliez chaque déchet à sa bonne destination.",
    [
      ["Une bouteille en verre", "Le conteneur à verre"],
      ["Une pile usagée", "Le point de collecte en magasin"],
      ["Des épluchures", "Le composteur"],
      ["Une boîte de conserve", "Le bac de tri des emballages"],
    ],
    "Depuis 2023, tous les emballages, y compris pots de yaourt et films plastiques, vont dans le bac de tri partout en France. Le verre garde son conteneur, et les piles ne vont jamais à la poubelle.",
    { media: [m.img("tri", "Chacun sa place")] },
  ),
  choice(
    "Quelle est la particularité du parc de 80 éoliennes installé au large de Saint-Nazaire, en service depuis 2022 ?",
    [
      "C’est le premier parc éolien en mer de France",
      "Ses éoliennes flottent sur des barges",
      "Il produit uniquement de l’hydrogène",
      "Il est relié directement à l’Angleterre",
    ],
    0,
    "Premier parc éolien en mer français, il produit l’équivalent de la consommation électrique d’environ 700 000 personnes. D’autres parcs ont suivi au large de la Normandie et de la Bretagne.",
    { media: [m.img("eolien", "Des éoliennes en mer")] },
  ),
  opinion("brainstorm", "Quelles idées concrètes pour une équipe plus écolo ? Jusqu’à trois !", {
    media: [m.img("agir", "Trois idées")],
  }),
  scale("Je me sens capable d’agir à mon échelle.", "Pas du tout", "Tout à fait"),
  outro(
    "Merci pour vos idées !",
    "Ce quiz est un SQuizz Original. Les idées de votre brainstorming restent dans les résultats de la partie : de quoi lancer votre plan d’action.",
  ),
];
