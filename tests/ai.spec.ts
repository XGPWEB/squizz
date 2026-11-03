import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { aiRequest, aiToQuestions, AI_SCHEMA } from "@/lib/ai-quiz";
import { open, seal } from "@/lib/server/secret-box";

const q = (over: Record<string, unknown>) => ({
  type: "quiz",
  text: "Question ?",
  options: [],
  correct: [],
  accepted: [],
  body: "",
  explanation: "",
  ...over,
});

describe("génération par IA", () => {
  it("transforme la réponse du modèle en étapes valides et écarte le reste", () => {
    const { title, questions, dropped } = aiToQuestions(
      {
        title: "Sécurité incendie",
        questions: [
          q({
            text: "Que faire ?",
            options: ["Courir", "Évacuer", "Attendre"],
            correct: [1],
            explanation: "On évacue.",
          }),
          q({ type: "truefalse", text: "L’ascenseur est interdit.", correct: [0] }),
          q({ type: "text", text: "Numéro des pompiers ?", accepted: ["18", "112"] }),
          q({ type: "fill", text: "Complétez", body: "On rejoint le [point de rassemblement]." }),
          q({ type: "poll", text: "Vous sentez-vous prêt ?", options: ["Oui", "Non"] }),
          q({ type: "open", text: "Vos idées ?" }),
          q({ options: ["A", "B"], correct: [5] }), // no right answer: dropped
          q({ type: "fill", body: "Pas de trou." }), // dropped
          q({ type: "wheel" }), // not asked: dropped
        ],
      },
      ["quiz", "truefalse", "text", "fill", "poll", "open"],
    );
    expect(title).toBe("Sécurité incendie");
    expect(dropped).toBe(3);
    expect(questions.map((x) => x.type)).toEqual(["quiz", "truefalse", "text", "fill", "poll", "open"]);
    expect(questions[0]).toMatchObject({ correctAnswers: [1], multiple: false, explanation: "On évacue." });
    expect(questions[2].accepted).toEqual(["18", "112"]);
    expect(questions[4].explanation).toBe("");
  });

  it("n’accepte que les types demandés", () => {
    const { questions, dropped } = aiToQuestions(
      { title: "", questions: [q({ type: "poll", options: ["a", "b"] })] },
      ["quiz"],
    );
    expect(questions).toHaveLength(0);
    expect(dropped).toBe(1);
  });

  it("décrit la demande et ferme chaque objet du schéma", () => {
    expect(aiRequest({ count: 10, types: ["quiz", "fill"], level: "hard", topic: "" })).toContain(
      "Niveau : Difficile",
    );
    expect(AI_SCHEMA.additionalProperties).toBe(false);
    expect(AI_SCHEMA.properties.questions.items.additionalProperties).toBe(false);
  });
});

describe("clé chiffrée", () => {
  const before = process.env.AI_KEY_SECRET;
  beforeAll(() => {
    process.env.AI_KEY_SECRET = Buffer.alloc(32, 7).toString("base64");
  });
  afterAll(() => {
    process.env.AI_KEY_SECRET = before;
  });

  it("chiffre et déchiffre, sans jamais laisser la clé en clair", () => {
    const sealed = seal("sk-ant-test-1234567890");
    expect(sealed).not.toContain("sk-ant");
    expect(open(sealed)).toBe("sk-ant-test-1234567890");
    expect(seal("même clé")).not.toBe(seal("même clé"));
  });

  it("refuse un secret modifié ou une autre clé maîtresse", () => {
    const sealed = seal("secret");
    const parts = sealed.split(":");
    parts[3] = Buffer.from("autre").toString("base64");
    expect(() => open(parts.join(":"))).toThrow();
    process.env.AI_KEY_SECRET = Buffer.alloc(32, 9).toString("base64");
    expect(() => open(sealed)).toThrow();
  });
});
