import { choice, fill, match, media, opinion, outro, poll, slide, slider, trueFalse, typed } from "./kit";

const m = media("jargon");

/**
 * « Le jargon du bureau décodé » (2026-11), for companies and small teams: acronyms, franglais and work
 * methods. Official French terms come from the Commission d’enrichissement de la langue française (France
 * Terme, Journal officiel); dates of laws are given with the law. Ends with two anonymous opinion steps.
 */
export const jargon = [
  slide(
    "title",
    "Le jargon du bureau décodé",
    "KPI, ASAP, onboarding… Dix questions pour parler couramment le « bureau », et le traduire en français.",
    [m.img("couverture", "Des bulles de jargon")],
  ),
  match(
    "Reliez chaque sigle à sa signification.",
    [
      ["KPI", "Indicateur clé de performance"],
      ["ROI", "Retour sur investissement"],
      ["ASAP", "Dès que possible"],
      ["CODIR", "Comité de direction"],
    ],
    "KPI : Key Performance Indicator. ROI : Return On Investment. ASAP : As Soon As Possible. CODIR : comité de direction, le seul des quatre qui soit français d’origine.",
  ),
  choice(
    "Par quel mot français la Commission d’enrichissement de la langue française recommande-t-elle de remplacer « e-mail » ?",
    ["Mél", "Courriel", "Message-toile", "Pli numérique"],
    1,
    "« Courriel », publié au Journal officiel en 2003. « Mél. » existe aussi, mais seulement comme abréviation, devant une adresse, comme « tél. » devant un numéro.",
  ),
  typed(
    "« Brainstorming » a un équivalent officiel en français. Lequel ?",
    ["remue-méninges", "remue méninges", "remue-meninges"],
    "« Remue-méninges » : c’est le terme recommandé par la Commission d’enrichissement de la langue française, que l’on retrouve sur FranceTerme.",
  ),
  trueFalse(
    "En France, le droit à la déconnexion est inscrit dans le Code du travail.",
    true,
    "Vrai : la loi du 8 août 2016 l’a introduit au 1er janvier 2017 (article L2242-17). Ses modalités se négocient dans l’entreprise ; à défaut d’accord, l’employeur les fixe dans une charte.",
  ),
  choice(
    "Que désigne « OKR », une méthode de fixation d’objectifs ?",
    [
      "Objectives and Key Results",
      "Organisation, Konsensus, Résultats",
      "Open Knowledge Roadmap",
      "Objectifs Kilométriques Réels",
    ],
    0,
    "Objectives and Key Results : des objectifs ambitieux, chacun suivi par quelques résultats mesurables. Imaginée chez Intel par Andy Grove, la méthode a été popularisée par John Doerr, notamment chez Google à partir de 1999.",
  ),
  slider(
    "La technique Pomodoro découpe le travail en séquences de concentration. Combien de minutes dure une séquence ?",
    { min: 5, max: 60, step: 5, target: 25, tolerance: 0, unit: "min" },
    "25 minutes, suivies d’une courte pause. Francesco Cirillo l’a mise au point à la fin des années 1980 avec un minuteur de cuisine en forme de tomate (pomodoro, en italien).",
  ),
  fill(
    "Complétez les équivalents français recommandés.",
    "Le [mot-dièse|mot dièse] remplace le hashtag, la [mercatique] remplace le marketing et l’[informatique en nuage] remplace le cloud computing.",
    "Trois termes publiés au Journal officiel par la Commission d’enrichissement de la langue française : « informatique en nuage » en 2010, « mot-dièse » en 2013, et « mercatique », plus ancien, qui a même gagné les programmes du lycée.",
    { duration: 60 },
  ),
  choice(
    "La « loi de Parkinson » dit que…",
    [
      "Le travail s’étale pour occuper tout le temps disponible",
      "Toute réunion dure dix minutes de plus que prévu",
      "Plus une équipe grandit, moins elle produit",
      "Un courriel non lu au bout d’une semaine ne le sera jamais",
    ],
    0,
    "Énoncée en 1955 par l’historien britannique Cyril Northcote Parkinson dans The Economist : « le travail s’étale de façon à occuper tout le temps disponible pour son achèvement ». D’où l’intérêt des échéances courtes.",
  ),
  trueFalse(
    "« ETP » signifie « équivalent temps plein ».",
    true,
    "Vrai : un poste à mi-temps compte pour 0,5 ETP. L’unité sert à compter les effectifs et les budgets de personnel, dans le privé comme dans le public.",
  ),
  opinion("wordcloud", "Le mot de jargon que vous ne voulez plus entendre ?", { anonymous: true }),
  poll(
    "Dans votre équipe, la réunion idéale dure…",
    ["15 minutes, debout", "30 minutes", "1 heure", "Ça dépend du café"],
    { anonymous: true },
  ),
  outro("À vous de jouer !", "Créez le quiz de votre équipe : vos sigles maison, vos outils, vos rituels."),
];
