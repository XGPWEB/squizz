import { newQuestion, type Question, type QuestionType } from "@/lib/question";

/**
 * SQuizz Original « Manager dans la fonction publique territoriale ». Facts checked against the texts
 * (Code général de la fonction publique, décrets n° 2014-1526 et n° 2016-151, loi du 6 août 2019).
 * Illustrations drawn for SQuizz in the brand palette, served from public/originals/management-fpt.
 */
const img = (name: string, caption: string) => [
  { kind: "image" as const, url: `/originals/management-fpt/${name}.webp`, caption },
];
const q = (type: QuestionType, fields: Partial<Question>): Question => ({ ...newQuestion(type), ...fields });

export const managementFpt: Question[] = [
  q("quiz", {
    text: "Depuis quelle date le Code général de la fonction publique est-il en vigueur ?",
    options: ["1er janvier 2020", "1er mars 2022", "1er septembre 2023", "Il n’existe pas encore"],
    correct: 1,
    correctAnswers: [1],
    duration: 20,
    media: img("code", "Le Code général de la fonction publique"),
    explanation:
      "Créé par l’ordonnance du 24 novembre 2021, il rassemble depuis le 1er mars 2022 les règles des trois versants, auparavant réparties dans plusieurs lois statutaires.",
  }),
  q("truefalse", {
    text: "L’entretien professionnel annuel a remplacé la notation des agents territoriaux.",
    options: ["Vrai", "Faux"],
    correct: 0,
    correctAnswers: [0],
    duration: 15,
    explanation:
      "Vrai : depuis le décret n° 2014-1526, l’entretien professionnel mené par le supérieur hiérarchique direct remplace la notation (évaluations à partir de 2015).",
  }),
  q("quiz", {
    text: "Quelle instance a remplacé le comité technique et le CHSCT ?",
    options: [
      "La commission administrative paritaire",
      "Le comité social territorial",
      "Le conseil de discipline",
      "Le centre de gestion",
    ],
    correct: 1,
    correctAnswers: [1],
    duration: 20,
    media: img("instance", "Une instance de dialogue social"),
    explanation:
      "Prévu par la loi de transformation de la fonction publique de 2019, le comité social territorial (CST) réunit depuis les élections de décembre 2022 les compétences du comité technique et du CHSCT.",
  }),
  q("slider", {
    text: "En règle générale, combien de jours de télétravail par semaine un agent peut-il faire au maximum ?",
    min: 0,
    max: 5,
    step: 1,
    target: 3,
    tolerance: 0,
    unit: " jours",
    duration: 20,
    media: img("teletravail", "Le télétravail"),
    explanation:
      "Trois jours par semaine au plus (décret n° 2016-151), avec au moins deux jours sur site ; des dérogations existent, par exemple pour raison de santé.",
  }),
  q("puzzle", {
    text: "Remettez dans l’ordre les étapes de l’entretien professionnel.",
    options: [
      "Convocation de l’agent au moins 8 jours avant",
      "Entretien avec le supérieur hiérarchique direct",
      "Compte rendu communiqué à l’agent pour observations et signature",
      "Demande de révision possible auprès de l’autorité territoriale",
    ],
    order: [0, 1, 2, 3],
    duration: 30,
    media: img("entretien", "L’entretien professionnel"),
    explanation:
      "L’agent est convoqué au moins huit jours à l’avance ; le compte rendu lui est notifié et il peut demander sa révision à l’autorité territoriale, puis saisir la CAP.",
  }),
  q("text", {
    text: "Quel établissement public assure la formation des agents territoriaux ? (sigle)",
    accepted: ["CNFPT", "Centre national de la fonction publique territoriale"],
    duration: 30,
    explanation:
      "Le CNFPT, Centre national de la fonction publique territoriale, organise les formations d’intégration et de professionnalisation des agents.",
  }),
  q("quiz", {
    text: "Quels sont les trois versants de la fonction publique ?",
    options: ["État", "Territoriale", "Hospitalière", "Consulaire"],
    correct: 0,
    correctAnswers: [0, 1, 2],
    multiple: true,
    duration: 20,
    media: img("versants", "Les trois versants de la fonction publique"),
    explanation:
      "Fonction publique de l’État, territoriale et hospitalière : trois versants régis ensemble par le Code général de la fonction publique.",
  }),
  q("quiz", {
    text: "Le RIFSEEP associe l’IFSE et… ?",
    options: ["La NBI", "Le CIA", "La PFR", "L’IAT"],
    correct: 1,
    correctAnswers: [1],
    duration: 20,
    points: "double",
    explanation:
      "Le RIFSEEP comprend l’IFSE (indemnité de fonctions, de sujétions et d’expertise) et le CIA (complément indemnitaire annuel), lié à l’engagement professionnel et à la manière de servir.",
  }),
  q("poll", {
    text: "Dans votre équipe, quel style de management pratiquez-vous le plus ?",
    options: ["Directif", "Persuasif", "Participatif", "Délégatif"],
    duration: 30,
    media: img("equipe", "Manager une équipe"),
  }),
  q("wordcloud", {
    text: "En un mot : qu’est-ce qu’un bon manager public ?",
    duration: 45,
  }),
];
