import {
  choice,
  match,
  media,
  opinion,
  outro,
  pin,
  poll,
  puzzle,
  slide,
  slider,
  trueFalse,
  typed,
} from "./kit";

const m = media("gastronomie");

export const gastronomie = [
  slide(
    "title",
    "La France à table",
    "Fromages, galettes et petits plats mijotés : un tour de France en dix bouchées.",
    [m.img("couverture", "Une cloche, une baguette et du fromage")],
  ),
  match(
    "Reliez chaque spécialité à sa région.",
    [
      ["La choucroute garnie", "Alsace"],
      ["La galette complète", "Bretagne"],
      ["Le bœuf bourguignon", "Bourgogne"],
      ["Le camembert", "Normandie"],
    ],
    "La galette bretonne se fait avec de la farine de sarrasin, aussi appelé blé noir ; la « complète » associe jambon, emmental et œuf.",
    {
      duration: 60,
      media: [
        m.img("plat-1", "Choucroute garnie · photo Anvilaquarius · CC0"),
        m.img("plat-2", "Galette complète · photo Arnaud 25 · CC BY-SA 4.0"),
        m.img("plat-3", "Bœuf bourguignon · photo Arnaud 25 · CC BY-SA 4.0"),
        m.img("plat-4", "Camembert · photo Coyau · CC BY-SA 3.0"),
      ],
    },
  ),
  choice(
    "Selon la légende, la tarte Tatin serait née d’une maladresse. Laquelle ?",
    [
      "Elle a été cuite à l’envers",
      "Le sucre a été remplacé par du sel",
      "Les pommes ont passé la nuit dehors",
      "La pâte est tombée par terre",
    ],
    0,
    "Les sœurs Tatin tenaient un hôtel à Lamotte-Beuvron, en Sologne, vers 1900. La légende veut que les pommes aient caramélisé avant d’être recouvertes de pâte… puis la tarte retournée au moment de servir.",
    { media: [m.img("plat-5", "Photo : Franck Chicot · CC BY-SA 2.0")] },
  ),
  pin(
    "Sa moutarde a fait le tour du monde : placez le pin’s sur Dijon !",
    m.img("carte", "Carte : Superbenjamin · CC BY-SA 4.0"),
    { x: 0.689, y: 0.398, radius: 0.05 },
    "Dijon, capitale de la Bourgogne, a donné son nom à une moutarde forte préparée avec du verjus ou du vinaigre. La graine, elle, vient aujourd’hui surtout du Canada.",
  ),
  typed(
    "Quel gâteau breton, dont le nom signifie « gâteau au beurre », voit-on ici ?",
    ["Kouign-amann", "Kouign amann", "Kouignamann", "Kouign-aman"],
    "Le kouign-amann, né à Douarnenez au XIXe siècle : en breton, « kouign » veut dire gâteau et « amann » beurre. Il y en a presque autant que de pâte !",
    { media: [m.img("plat-6", "Photo : Syced · CC0")] },
  ),
  trueFalse(
    "Le camembert de Normandie AOP est fabriqué avec du lait cru.",
    true,
    "Vrai : l’appellation d’origine protégée impose le lait cru de vache, venu de Normandie, et un moulage à la louche. Les camemberts au lait pasteurisé ne peuvent pas porter ce nom.",
  ),
  slider(
    "En quelle année le « repas gastronomique des Français » a-t-il été inscrit au patrimoine culturel immatériel de l’UNESCO ?",
    { min: 1990, max: 2025, target: 2010, tolerance: 1 },
    "En novembre 2010. L’UNESCO a distingué un rituel : bien choisir les produits, accorder mets et vins, dresser une belle table et partager un repas qui suit un ordre précis.",
  ),
  puzzle(
    "Remettez dans l’ordre un repas gastronomique à la française.",
    ["L’apéritif", "L’entrée", "Le plat", "Le fromage", "Le dessert", "Le café"],
    "Apéritif, entrée, plat, fromage, dessert, puis café ou digestif : c’est l’ordre décrit lors de l’inscription à l’UNESCO.",
    { duration: 45 },
  ),
  choice(
    "Selon la recette traditionnelle, quel ingrédient n’a rien à faire dans une quiche lorraine ?",
    ["Les lardons", "Les œufs", "La crème", "Le gruyère râpé"],
    3,
    "La recette lorraine se contente d’une pâte, de lardons, d’œufs et de crème. Le fromage est un ajout plus tardif… qui fait encore débat en Lorraine.",
    { media: [m.img("quiche", "Une quiche lorraine")] },
  ),
  choice(
    "Lesquels de ces fromages sont faits avec du lait de chèvre ?",
    ["Crottin de Chavignol", "Roquefort", "Sainte-Maure-de-Touraine", "Comté", "Valençay", "Reblochon"],
    [0, 2, 4],
    "Crottin de Chavignol, Sainte-Maure-de-Touraine et Valençay sont des chèvres de la Loire. Le roquefort est au lait de brebis, le comté et le reblochon au lait de vache.",
    { duration: 30, points: "double" },
  ),
  poll("Le grand débat : on dit…", ["Pain au chocolat", "Chocolatine", "Ça dépend où je suis"], {
    media: [m.img("debat", "Pain au chocolat ou chocolatine ?")],
  }),
  opinion("wheel", "Qui apporte les viennoiseries à la prochaine réunion ? La roue décide !"),
  outro(
    "Bon appétit !",
    "Ce quiz est un SQuizz Original. Sondages, roue de tirage au sort, cartes à pin’s : créez le vôtre pour animer vos repas d’équipe.",
  ),
];
