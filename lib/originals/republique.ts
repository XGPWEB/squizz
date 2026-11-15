import { choice, fill, match, opinion, outro, poll, puzzle, slide, slider, trueFalse } from "./kit";

/**
 * « La République en questions » (2026-11): institutions and citizenship, for local authorities and youth
 * services. Only stable facts, each with its source in the explanation (Constitution of 1958, laws named);
 * two opinion steps close it, to consult the room. No illustration but the shared closing one.
 */
export const republique = [
  slide(
    "title",
    "La République en questions",
    "Institutions, vote, collectivités : dix questions pour réviser ses classiques de citoyen.",
  ),
  fill(
    "Complétez la devise de la République.",
    "Liberté, [Égalité], [Fraternité]",
    "« Liberté, Égalité, Fraternité » : c’est la devise inscrite à l’article 2 de la Constitution de 1958.",
    { duration: 30 },
  ),
  trueFalse(
    "Les conseillers municipaux sont élus pour six ans.",
    true,
    "Vrai : le mandat municipal dure six ans. Le maire n’est pas élu directement par les habitants : le conseil municipal l’élit parmi ses membres.",
  ),
  choice(
    "Combien la France compte-t-elle de régions ?",
    ["13", "18", "22", "27"],
    1,
    "18 régions depuis 2016 : 13 en métropole et 5 en outre-mer. Avant la réforme, il y en avait 27, dont 22 en métropole.",
  ),
  puzzle(
    "Rangez ces collectivités territoriales de la plus petite à la plus grande.",
    ["La commune", "Le département", "La région"],
    "Commune, département, région : ce sont les collectivités territoriales citées par l’article 72 de la Constitution, avec les collectivités à statut particulier et celles d’outre-mer.",
  ),
  choice(
    "À partir de quel âge peut-on voter en France ?",
    ["16 ans", "18 ans", "21 ans"],
    1,
    "18 ans, depuis la loi du 5 juillet 1974. Auparavant, la majorité électorale était fixée à 21 ans.",
  ),
  slider(
    "En quelle année les Françaises ont-elles voté pour la première fois ?",
    { min: 1900, max: 2000, target: 1945, tolerance: 0 },
    "En 1945, aux élections municipales d’avril. Le droit de vote des femmes avait été accordé par l’ordonnance du 21 avril 1944.",
  ),
  match(
    "Reliez chaque institution au lieu où elle siège.",
    [
      ["Assemblée nationale", "Palais Bourbon"],
      ["Sénat", "Palais du Luxembourg"],
      ["Président de la République", "Palais de l’Élysée"],
      ["Premier ministre", "Hôtel de Matignon"],
    ],
    "Les quatre adresses du pouvoir, toutes à Paris : le Palais Bourbon, le Palais du Luxembourg, l’Élysée et Matignon.",
  ),
  trueFalse(
    "Les sénateurs sont élus directement par les citoyens.",
    false,
    "Faux : ils sont élus au suffrage universel indirect, par un collège de grands électeurs composé surtout d’élus locaux.",
  ),
  choice(
    "Qui a écrit La Marseillaise ?",
    ["Rouget de Lisle", "Victor Hugo", "Hector Berlioz", "Voltaire"],
    0,
    "Claude Joseph Rouget de Lisle, à Strasbourg en avril 1792, sous le titre « Chant de guerre pour l’armée du Rhin ». C’est l’hymne national inscrit à l’article 2 de la Constitution.",
  ),
  poll(
    "Pour vous, quel service public local compte le plus ?",
    ["Écoles et périscolaire", "Propreté et voirie", "Culture et sport", "Solidarité et santé"],
    { anonymous: true },
  ),
  opinion("wordcloud", "En un mot, comment décririez-vous votre commune ?", { anonymous: true }),
  outro(
    "À vous de jouer !",
    "Créez votre propre quiz : consultation, accueil des nouveaux habitants, conseil des jeunes…",
  ),
];
