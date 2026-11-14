import { choice, fill, match, media, opinion, outro, puzzle, slide, slider, trueFalse, typed } from "./kit";

const m = media("francais");

export const francais = [
  slide(
    "title",
    "Les pièges du français",
    "Accords, expressions, mots voyageurs : la langue de Molière vous réserve quelques surprises.",
    [m.img("couverture", "Un dictionnaire ouvert et une plume")],
  ),
  fill(
    "Accordez les participes passés.",
    "Les erreurs que j’ai [faites] ; les fleurs qu’elle a [cueillies].",
    "Avec l’auxiliaire avoir, le participe passé s’accorde avec le complément d’objet direct quand celui-ci est placé avant : « les erreurs » (que j’ai faites), « les fleurs » (qu’elle a cueillies).",
  ),
  choice(
    "Laquelle de ces phrases est correctement écrite ?",
    ["Quoique vous fassiez, faites-le bien.", "Quoi que vous fassiez, faites-le bien."],
    1,
    "« Quoi que » en deux mots signifie « quelle que soit la chose que ». « Quoique » en un mot signifie « bien que » : quoiqu’il pleuve, nous sortons.",
  ),
  match(
    "Reliez chaque expression à son sens.",
    [
      ["Poser un lapin", "Ne pas venir à un rendez-vous"],
      ["Tomber dans les pommes", "S’évanouir"],
      ["Coûter les yeux de la tête", "Coûter très cher"],
      ["Avoir le cafard", "Avoir des idées noires"],
      ["Mettre la puce à l’oreille", "Éveiller les soupçons"],
    ],
    "Des images souvent très anciennes : « tomber dans les pommes » viendrait par exemple de « tomber en pâmoison », c’est-à-dire perdre connaissance.",
    { media: [m.img("expressions", "Drôles d’expressions")], duration: 60 },
  ),
  trueFalse(
    "« Abricot », « alcool », « algèbre » et « sirop » sont des mots d’origine arabe.",
    true,
    "Vrai : l’arabe a donné au français plusieurs centaines de mots, souvent passés par l’espagnol ou l’italien. On lui doit aussi « chiffre », « zéro », « magasin » ou « jupe ».",
  ),
  typed(
    "Comment appelle-t-on un mot qui se lit de la même façon dans les deux sens, comme celui-ci ?",
    ["palindrome", "un palindrome"],
    "Un palindrome. Il en existe des phrases entières : « Ésope reste ici et se repose ».",
    { media: [m.img("radar", "Un mot qui se lit dans les deux sens")] },
  ),
  choice(
    "« Après qu’il … parti, nous avons dîné. » Comment compléter ?",
    ["soit", "est", "fût", "serait"],
    1,
    "« Après que » est suivi de l’indicatif, car l’action a bien eu lieu : après qu’il est parti. C’est « avant que » qui demande le subjonctif : avant qu’il soit parti.",
  ),
  choice(
    "Lesquels de ces noms prennent un x au pluriel ?",
    ["Bijou", "Chou", "Genou", "Clou", "Trou", "Fou"],
    [0, 1, 2],
    "Bijoux, choux, genoux, comme cailloux, hiboux, joujoux et poux. Tous les autres noms en -ou prennent un s : des clous, des trous, des fous.",
    { duration: 30 },
  ),
  slider(
    "En quelle année le cardinal de Richelieu a-t-il fondé l’Académie française ?",
    { min: 1500, max: 1900, target: 1635, tolerance: 10 },
    "En 1635. Ses quarante membres, les « Immortels », travaillent depuis au Dictionnaire de l’Académie française, dont la 9e édition a été achevée en 2024.",
  ),
  puzzle(
    "Remettez ce proverbe dans l’ordre.",
    ["Ce n’est pas", "à un vieux singe", "qu’on apprend", "à faire la grimace"],
    "« Ce n’est pas à un vieux singe qu’on apprend à faire la grimace » : inutile d’expliquer son métier à quelqu’un d’expérimenté.",
    { media: [m.img("singe", "Un vieux singe")] },
  ),
  opinion("wordcloud", "Votre mot préféré de la langue française ?"),
  outro(
    "Le mot de la fin",
    "Ce quiz est un SQuizz Original. Textes à trous, appariements, réponses libres : créez le vôtre pour réviser, former ou simplement s’amuser.",
  ),
];
