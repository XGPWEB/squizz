import { choice, media, opinion, outro, poll, slide, slider, trueFalse } from "./kit";

const m = media("apprendre");

/**
 * « Comment apprend-on vraiment ? » (2026-11), for trainers: the classics of cognitive psychology and a
 * few neuromyths. Each fact names its study (Ebbinghaus 1885, Miller 1956, Roediger & Karpicke 2006,
 * Pashler et al. 2008). Ends with two opinion steps about the room's own practice.
 */
export const apprendre = [
  slide(
    "title",
    "Comment apprend-on vraiment ?",
    "Mémoire, attention, neuromythes : dix questions pour former avec ce que dit la recherche.",
    [m.img("couverture", "Un cerveau qui fait du sport")],
  ),
  slider(
    "En quelle année Hermann Ebbinghaus a-t-il publié sa célèbre « courbe de l’oubli » ?",
    { min: 1800, max: 2000, step: 5, target: 1885, tolerance: 5 },
    "En 1885, dans « Über das Gedächtnis ». En apprenant des syllabes sans signification, il a montré qu’on oublie très vite au début, puis de plus en plus lentement.",
  ),
  choice(
    "Pour retenir une notion à long terme, qu’est-ce qui marche le mieux ?",
    [
      "Relire ses notes plusieurs fois",
      "Se tester pour aller rechercher l’information en mémoire",
      "Surligner les passages importants",
      "Écouter le cours une deuxième fois",
    ],
    1,
    "Se tester : c’est « l’effet test ». En 2006, Roediger et Karpicke ont montré qu’une semaine plus tard, les étudiants qui s’étaient testés retenaient bien plus que ceux qui avaient relu. Un quiz, c’est déjà apprendre.",
  ),
  trueFalse(
    "Adapter la formation au « style d’apprentissage » de chacun (visuel, auditif, kinesthésique) améliore les résultats.",
    false,
    "Faux : c’est un neuromythe tenace. En 2008, Pashler et ses collègues n’ont trouvé aucune preuve solide de ce bénéfice. Mieux vaut adapter le support au contenu : une carte pour la géographie, un son pour la musique.",
  ),
  trueFalse(
    "Nous n’utilisons que 10 % de notre cerveau.",
    false,
    "Faux : l’imagerie cérébrale montre que toutes les zones du cerveau servent, même si elles ne sont pas toutes actives en même temps. Le mythe circule depuis plus d’un siècle.",
  ),
  choice(
    "Pour retenir durablement, mieux vaut réviser…",
    [
      "En une seule longue séance, juste avant l’examen",
      "En plusieurs séances espacées dans le temps",
      "Seulement quand on a oublié",
      "Peu importe, seul le temps total compte",
    ],
    1,
    "En séances espacées : c’est l’effet d’espacement, observé dès Ebbinghaus et confirmé par des centaines d’études. Revenir sur une notion le lendemain, puis la semaine suivante, vaut mieux que tout réviser d’un coup.",
  ),
  slider(
    "Selon le psychologue George Miller (1956), combien d’éléments la mémoire à court terme retient-elle environ ?",
    { min: 1, max: 20, target: 7, tolerance: 0 },
    "« Le nombre magique sept, plus ou moins deux ». Les travaux plus récents (Nelson Cowan, 2001) parlent plutôt de quatre éléments : d’où l’intérêt de découper un contenu en petits morceaux.",
  ),
  trueFalse(
    "La « pyramide de l’apprentissage » (on retient 10 % de ce qu’on lit, 90 % de ce qu’on enseigne) vient d’une étude scientifique.",
    false,
    "Faux : ces pourcentages trop ronds n’ont jamais été mesurés. Ils sont souvent attribués à tort au « cône de l’expérience » d’Edgar Dale (1946), qui ne contenait aucun chiffre.",
  ),
  choice(
    "Quand donner la correction d’un exercice pour qu’elle soit la plus utile ?",
    [
      "Jamais : il faut trouver seul",
      "Juste après la réponse, avec une explication",
      "À la fin de la formation, toutes ensemble",
      "Seulement aux personnes qui se sont trompées",
    ],
    1,
    "Juste après, et expliquée : une erreur corrigée tout de suite est mieux retenue qu’une bonne réponse jamais commentée. C’est ce que fait SQuizz après chaque question.",
  ),
  choice(
    "Alterner plusieurs types d’exercices dans une même séance plutôt que les regrouper, c’est…",
    ["L’entrelacement", "Le zapping", "L’immersion", "Le multitâche"],
    0,
    "L’entrelacement (interleaving) : plus déroutant sur le moment, il aide à reconnaître quelle méthode appliquer, et les acquis tiennent mieux dans le temps.",
  ),
  poll(
    "Dans vos formations, quelle méthode utilisez-vous le plus ?",
    ["Les quiz et l’auto-évaluation", "Les études de cas", "Les jeux de rôle", "L’exposé"],
    { anonymous: true },
  ),
  opinion("wordcloud", "En un mot, ce qui fait une bonne formation ?", { anonymous: true }),
  outro(
    "À vous de jouer !",
    "Créez le quiz de votre formation : brise-glace, vérification des acquis, évaluation à chaud.",
  ),
];
