export const questionTypes = [
  {
    id: "quiz",
    label: "Quiz",
    group: "Tester les connaissances",
    hint: "Demande aux participants de choisir entre plusieurs réponses.",
  },
  {
    id: "truefalse",
    label: "Vrai ou faux",
    group: "Tester les connaissances",
    hint: "Les participants doivent dire si l’affirmation est vraie ou fausse.",
  },
  {
    id: "text",
    label: "Réponse libre",
    group: "Tester les connaissances",
    hint: "Les participants doivent saisir une courte réponse correcte.",
  },
  {
    id: "slider",
    label: "Curseur",
    group: "Tester les connaissances",
    hint: "Laisse les participants deviner le nombre sur le curseur.",
  },
  {
    id: "pin",
    label: "Réponse par pin’s",
    group: "Tester les connaissances",
    hint: "Demande aux participants de placer le pin’s au bon endroit sur une image.",
  },
  {
    id: "puzzle",
    label: "Puzzle",
    group: "Tester les connaissances",
    hint: "Les participants doivent classer les réponses dans le bon ordre.",
  },
  {
    id: "poll",
    label: "Sondage",
    group: "Collecter des avis",
    hint: "Demande aux participants de choisir entre 6 avis maximum.",
  },
  {
    id: "scale",
    label: "Échelle",
    group: "Collecter des avis",
    hint: "Évalue les opinions et les sentiments à l’aide de l’échelle de Likert ou d’autres échelles personnalisées.",
  },
  {
    id: "nps",
    label: "Échelle NPS",
    group: "Collecter des avis",
    hint: "Évalue la satisfaction des participants et la probabilité qu’ils recommandent un produit ou un service.",
  },
  {
    id: "pinpoll",
    label: "Place le pin’s",
    group: "Collecter des avis",
    hint: "Demande aux participants de placer des pin’s sur une image.",
  },
  {
    id: "wordcloud",
    label: "Nuage de mots",
    group: "Collecter des avis",
    hint: "Laisse les participants exprimer leur avis en quelques mots.",
  },
  {
    id: "open",
    label: "Question ouverte",
    group: "Collecter des avis",
    hint: "Les participants doivent écrire une réponse libre élaborée.",
  },
  {
    id: "brainstorm",
    label: "Brainstorming",
    group: "Collecter des avis",
    hint: "Rassemble les idées de chacun, jusqu’à trois par personne.",
  },
  {
    id: "slide",
    label: "Diapo",
    group: "Diapos multimédias",
    hint: "Afficher du texte et des médias entre deux questions.",
  },
] as const;
export type QuestionType = (typeof questionTypes)[number]["id"];
export const slideLayouts = [
  {
    id: "classic",
    label: "Classique",
    hint: "Donne aux participants davantage de contexte ou d’explications.",
  },
  {
    id: "title",
    label: "Grand titre",
    hint: "Un titre et un sous-titre pour le début d’une présentation.",
  },
  {
    id: "titletext",
    label: "Titre et texte",
    hint: "Un paragraphe pour donner plus de contexte aux joueurs.",
  },
  { id: "bullets", label: "Liste à puces", hint: "Une liste à puces plutôt qu’un paragraphe." },
  { id: "quote", label: "Citation", hint: "Partage une citation marquante et affiche le nom de son auteur." },
  {
    id: "bigimage",
    label: "Grande image",
    hint: "Présente une grande image, une vidéo ou un GIF pour booster l’engagement.",
  },
] as const;
export type SlideLayout = (typeof slideLayouts)[number]["id"];
/** Formats a slider value with its unit, e.g. "2 380 000 $". */
export const formatValue = (value: number, unit = "") =>
  `${value.toLocaleString("fr-FR", { maximumFractionDigits: 6 })}${unit ? ` ${unit}` : ""}`;
export const slideLayoutLabel = (layout: SlideLayout) => slideLayouts.find((l) => l.id === layout)?.label;
export type Media = { kind: "image" | "video" | "youtube" | "link"; url: string; caption: string };
export type Question = {
  type: QuestionType;
  text: string;
  options: string[];
  correct: number;
  correctAnswers: number[];
  multiple: boolean;
  duration: number;
  points: "standard" | "double" | "none";
  accepted: string[];
  min: number;
  max: number;
  step: number;
  target: number;
  tolerance: number;
  /** Shown after slider values, e.g. "€" or "km". */
  unit: string;
  /** Labels for the two ends of a scale or NPS question. */
  minLabel: string;
  maxLabel: string;
  pin: { x: number; y: number; radius: number };
  order: number[];
  body: string;
  layout: SlideLayout;
  media: Media[];
  /** Optional text shown with the correction to explain the answer. */
  explanation: string;
};
export type AnswerPayload = {
  choices?: number[];
  text?: string;
  value?: number;
  x?: number;
  y?: number;
  order?: number[];
  ideas?: string[];
};
export const durations = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240];
export const isScored = (type: QuestionType) =>
  ["quiz", "truefalse", "text", "slider", "pin", "puzzle"].includes(type);
export function newQuestion(type: QuestionType = "quiz", layout: SlideLayout = "classic"): Question {
  return {
    type,
    text: "",
    options: type === "truefalse" ? ["Vrai", "Faux"] : ["", "", "", ""],
    correct: 0,
    correctAnswers: [0],
    multiple: false,
    duration: 20,
    points: isScored(type) ? "standard" : "none",
    accepted: [""],
    min: type === "scale" ? 1 : 0,
    max: type === "nps" ? 10 : type === "scale" ? 5 : 100,
    step: 1,
    target: 50,
    tolerance: 0,
    unit: "",
    minLabel: type === "nps" ? "Peu probable" : type === "scale" ? "Je ne suis pas d’accord" : "",
    maxLabel: type === "nps" ? "Très probable" : type === "scale" ? "Je suis d’accord" : "",
    pin: { x: 0.5, y: 0.5, radius: 0.1 },
    order: [0, 1, 2, 3],
    body: "",
    layout,
    media: [],
    explanation: "",
  };
}
export function normalizeQuestion(value: Partial<Question>): Question {
  const base = newQuestion(value.type || "quiz");
  return {
    ...base,
    ...value,
    correctAnswers: value.correctAnswers ?? [value.correct ?? 0],
    order: value.order ?? (value.options ?? base.options).map((_, i) => i),
    media: value.media ?? [],
    explanation: value.explanation ?? "",
  };
}
export function youtubeId(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.split("/")[1];
    if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host))
      id =
        u.pathname === "/watch"
          ? u.searchParams.get("v")
          : (u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] ?? null);
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
export function safeMediaUrl(url: string) {
  if (/^\/api\/media\/[a-f0-9-]{36}$/.test(url)) return true;
  // Illustrations of the SQuizz Originals, served by the site itself.
  if (/^\/originals\/[a-z0-9-]+\/[a-z0-9-]+\.(webp|png|jpg)$/.test(url)) return true;
  try {
    const u = new URL(url);
    return ["http:", "https:"].includes(u.protocol) && !u.username && !u.password;
  } catch {
    return false;
  }
}
export function validateQuestion(raw: unknown): Question {
  if (!raw || typeof raw !== "object") throw new Error("Question invalide.");
  const q = normalizeQuestion(raw as Partial<Question>);
  const check = (ok: unknown, message: string) => {
    if (!ok) throw new Error(message);
  };
  check(
    questionTypes.some((t) => t.id === q.type),
    "Choisissez un type de question.",
  );
  check(
    typeof q.text === "string" && q.text.trim() && q.text.length <= 300,
    "Chaque question doit avoir un titre de 1 à 300 caractères.",
  );
  check(durations.includes(q.duration), "Temps imparti invalide.");
  check(["standard", "double", "none"].includes(q.points), "Barème invalide.");
  check(typeof q.multiple === "boolean", "Limite de réponse invalide.");
  check(
    typeof q.body === "string" && q.body.length <= 4000,
    "Le texte de la diapo est limité à 4 000 caractères.",
  );
  check(
    slideLayouts.some((l) => l.id === q.layout),
    "Mise en page de diapo invalide.",
  );
  check(Array.isArray(q.media) && q.media.length <= 4, "Ajoutez au maximum quatre médias.");
  check(
    typeof q.explanation === "string" && q.explanation.length <= 600,
    "L’explication de la réponse est limitée à 600 caractères.",
  );
  for (const m of q.media) {
    check(
      m &&
        ["image", "video", "youtube", "link"].includes(m.kind) &&
        typeof m.url === "string" &&
        m.url.length <= 2000 &&
        safeMediaUrl(m.url),
      "Adresse de média invalide (http ou https requis).",
    );
    check(typeof m.caption === "string" && m.caption.length <= 200, "Légende limitée à 200 caractères.");
    if (m.kind === "youtube") check(youtubeId(m.url), "Lien YouTube invalide.");
  }
  if (["quiz", "truefalse", "poll", "puzzle"].includes(q.type)) {
    check(
      Array.isArray(q.options) &&
        q.options.length >= 2 &&
        q.options.length <= 6 &&
        q.options.every((o) => typeof o === "string" && o.trim() && o.length <= 150),
      "Ajoutez de 2 à 6 réponses non vides, de 150 caractères maximum.",
    );
    if (q.type === "truefalse") {
      q.options = ["Vrai", "Faux"];
      q.multiple = false;
    }
    if (["quiz", "truefalse"].includes(q.type)) {
      check(
        Array.isArray(q.correctAnswers) &&
          q.correctAnswers.length >= 1 &&
          new Set(q.correctAnswers).size === q.correctAnswers.length &&
          q.correctAnswers.every((i) => Number.isInteger(i) && i >= 0 && i < q.options.length),
        "Sélectionne les bonnes réponses.",
      );
      check(
        q.multiple || q.correctAnswers.length === 1,
        "Une réponse unique nécessite une seule bonne réponse.",
      );
      q.correct = q.correctAnswers[0];
    }
    if (q.type === "puzzle")
      check(
        Array.isArray(q.order) &&
          q.order.length === q.options.length &&
          new Set(q.order).size === q.options.length &&
          q.order.every((i) => Number.isInteger(i) && i >= 0 && i < q.options.length),
        "Ordre du puzzle invalide.",
      );
  }
  if (q.type === "text")
    check(
      Array.isArray(q.accepted) &&
        q.accepted.length >= 1 &&
        q.accepted.length <= 10 &&
        q.accepted.every((t) => typeof t === "string" && t.trim() && t.length <= 150),
      "Indiquez de 1 à 10 réponses acceptées.",
    );
  if (["slider", "scale", "nps"].includes(q.type)) {
    if (q.type === "nps") {
      q.min = 0;
      q.max = 10;
      q.step = 1;
    }
    if (q.type === "scale") {
      q.min = 1;
      q.step = 1;
      check(
        Number.isInteger(q.max) && q.max >= 2 && q.max <= 10,
        "L’échelle doit aller de 1 à une note de 2 à 10.",
      );
    }
    check(
      [q.min, q.max, q.step].every(Number.isFinite) &&
        q.min < q.max &&
        q.step > 0 &&
        q.step <= q.max - q.min &&
        Math.max(Math.abs(q.min), Math.abs(q.max)) <= 1_000_000_000 &&
        (q.max - q.min) / q.step <= 1000000,
      "Bornes ou pas du curseur invalides.",
    );
    if (q.type === "slider")
      check(
        Number.isFinite(q.target) &&
          q.target >= q.min &&
          q.target <= q.max &&
          Number.isFinite(q.tolerance) &&
          q.tolerance >= 0 &&
          q.tolerance <= q.max - q.min,
        "Valeur cible ou tolérance invalide.",
      );
  }
  check(typeof q.unit === "string" && q.unit.length <= 12, "Unité limitée à 12 caractères.");
  check(
    [q.minLabel, q.maxLabel].every((l) => typeof l === "string" && l.length <= 40),
    "Libellés d’échelle limités à 40 caractères.",
  );
  if (["pin", "pinpoll"].includes(q.type)) {
    check(
      q.media.some((m) => m.kind === "image"),
      "Ajoutez une image pour placer les repères.",
    );
    if (q.type === "pin")
      check(
        q.pin &&
          [q.pin.x, q.pin.y, q.pin.radius].every(Number.isFinite) &&
          q.pin.x >= 0 &&
          q.pin.x <= 1 &&
          q.pin.y >= 0 &&
          q.pin.y <= 1 &&
          q.pin.radius >= 0.02 &&
          q.pin.radius <= 0.5,
        "Zone de réponse invalide.",
      );
  }
  if (!isScored(q.type)) q.points = "none";
  return {
    ...q,
    text: q.text.trim(),
    unit: q.unit.trim(),
    minLabel: q.minLabel.trim(),
    maxLabel: q.maxLabel.trim(),
    explanation: q.type === "slide" ? "" : q.explanation.trim(),
  };
}
const normalizeText = (s: string) =>
  s
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/\s+/g, " ");
export function evaluateAnswer(
  q: Question,
  raw: unknown,
): { payload: AnswerPayload; correct: boolean | null } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Réponse invalide.");
  const a = raw as AnswerPayload;
  const fail = () => {
    throw new Error("Réponse invalide pour cette question.");
  };
  if (q.type === "slide") return fail();
  if (["quiz", "truefalse", "poll"].includes(q.type)) {
    if (
      !Array.isArray(a.choices) ||
      !a.choices.length ||
      a.choices.length > q.options.length ||
      new Set(a.choices).size !== a.choices.length ||
      a.choices.some((i) => !Number.isInteger(i) || i < 0 || i >= q.options.length) ||
      (!q.multiple && a.choices.length !== 1)
    )
      return fail();
    return {
      payload: { choices: a.choices },
      correct:
        q.type === "poll"
          ? null
          : a.choices.length === q.correctAnswers.length &&
            q.correctAnswers.every((i) => a.choices!.includes(i)),
    };
  }
  if (["text", "open", "wordcloud"].includes(q.type)) {
    if (
      typeof a.text !== "string" ||
      !a.text.trim() ||
      a.text.length > (q.type === "open" ? 1000 : q.type === "wordcloud" ? 40 : 150)
    )
      return fail();
    return {
      payload: { text: a.text.trim() },
      correct: q.type === "text" ? q.accepted.some((t) => normalizeText(t) === normalizeText(a.text!)) : null,
    };
  }
  if (["slider", "scale", "nps"].includes(q.type)) {
    if (
      typeof a.value !== "number" ||
      !Number.isFinite(a.value) ||
      a.value < q.min ||
      a.value > q.max ||
      Math.abs((a.value - q.min) / q.step - Math.round((a.value - q.min) / q.step)) > 1e-6
    )
      return fail();
    return {
      payload: { value: a.value },
      correct: q.type === "slider" ? Math.abs(a.value - q.target) <= q.tolerance + 1e-9 : null,
    };
  }
  if (["pin", "pinpoll"].includes(q.type)) {
    if (
      typeof a.x !== "number" ||
      typeof a.y !== "number" ||
      ![a.x, a.y].every((v) => Number.isFinite(v) && v >= 0 && v <= 1)
    )
      return fail();
    return {
      payload: { x: a.x, y: a.y },
      correct: q.type === "pin" ? Math.hypot(a.x - q.pin.x, a.y - q.pin.y) <= q.pin.radius : null,
    };
  }
  if (q.type === "puzzle") {
    if (
      !Array.isArray(a.order) ||
      a.order.length !== q.options.length ||
      new Set(a.order).size !== q.options.length ||
      a.order.some((i) => !Number.isInteger(i) || i < 0 || i >= q.options.length)
    )
      return fail();
    return { payload: { order: a.order }, correct: a.order.every((v, i) => v === q.order[i]) };
  }
  if (q.type === "brainstorm") {
    if (
      !Array.isArray(a.ideas) ||
      a.ideas.length < 1 ||
      a.ideas.length > 3 ||
      a.ideas.some((t) => typeof t !== "string" || !t.trim() || t.length > 200)
    )
      return fail();
    return { payload: { ideas: a.ideas.map((t) => t.trim()) }, correct: null };
  }
  return fail();
}
export function publicQuestion(q: Question, revealed: boolean, index = 0) {
  const { correct, correctAnswers, accepted, target, tolerance, pin, order, explanation, ...visible } = q;
  // Games store puzzle options already shuffled, never in the solution order (see shufflePuzzles),
  // so the stored order is shown as is: nothing in it points to the answer.
  void index;
  const puzzleOrder = q.type === "puzzle" ? q.options.map((_, i) => i) : undefined;
  return {
    ...visible,
    puzzleOrder,
    ...(revealed ? { correct, correctAnswers, accepted, target, tolerance, pin, order, explanation } : {}),
  };
}
export function aggregateAnswers(q: Question, answers: AnswerPayload[]) {
  const counts = q.options.map((label, i) => ({
    label,
    count: answers.filter((a) => a.choices?.includes(i)).length,
  }));
  const values = answers.flatMap((a) => (typeof a.value === "number" ? [a.value] : []));
  const terms = new Map<string, { label: string; count: number }>();
  for (const a of answers)
    for (const text of q.type === "brainstorm" ? (a.ideas ?? []) : a.text ? [a.text] : []) {
      const key = normalizeText(text);
      const old = terms.get(key);
      terms.set(key, { label: old?.label ?? text, count: (old?.count ?? 0) + 1 });
    }
  return {
    responses: answers.length,
    counts,
    average: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    nps:
      q.type === "nps" && values.length
        ? Math.round(
            (100 * (values.filter((v) => v >= 9).length - values.filter((v) => v <= 6).length)) /
              values.length,
          )
        : null,
    values: values
      .map((value) => ({ value, count: values.filter((v) => v === value).length }))
      .filter((v, i, all) => all.findIndex((x) => x.value === v.value) === i)
      .sort((a, b) => a.value - b.value),
    texts: [...terms.values()].sort((a, b) => b.count - a.count),
    pins: answers.filter((a) => typeof a.x === "number").map((a) => ({ x: a.x!, y: a.y! })),
  };
}
export type PublicQuestion = ReturnType<typeof publicQuestion>;
export type Aggregate = ReturnType<typeof aggregateAnswers>;
