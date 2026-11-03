import { expect, test } from "vitest";
import { clearDraft, draftKey, loadDraft, sameContent, saveDraft, type Draft } from "@/lib/client/drafts";
import { newQuestion } from "@/lib/question";

/** A tiny localStorage stand-in. */
function memoryStore() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
}
const draft = (title: string, savedAt = Date.now()): Draft => ({
  title,
  questions: [newQuestion()],
  baseVersion: 3,
  savedAt,
});

test("un brouillon est rangé par compte et par quiz", () => {
  const s = memoryStore();
  saveDraft("alice", "quiz1", draft("Brouillon d’Alice"), s);
  saveDraft("alice", null, draft("Nouveau quiz d’Alice"), s);
  expect(loadDraft("alice", "quiz1", s)?.title).toBe("Brouillon d’Alice");
  expect(loadDraft("alice", null, s)?.title).toBe("Nouveau quiz d’Alice");
  // Another account on the same browser never sees it.
  expect(loadDraft("bob", "quiz1", s)).toBeNull();
  expect(loadDraft("bob", null, s)).toBeNull();
  expect(draftKey("alice", null)).not.toBe(draftKey("bob", null));
});

test("le brouillon est effacé après enregistrement et expire au bout de 7 jours", () => {
  const s = memoryStore();
  saveDraft("alice", "quiz1", draft("À effacer"), s);
  clearDraft("alice", "quiz1", s);
  expect(loadDraft("alice", "quiz1", s)).toBeNull();
  saveDraft("alice", "quiz2", draft("Vieux", Date.now() - 8 * 86400_000), s);
  expect(loadDraft("alice", "quiz2", s)).toBeNull();
  expect(s.length).toBe(0);
});

test("un brouillon illisible ou sans stockage ne bloque pas l’éditeur", () => {
  const s = memoryStore();
  s.setItem(draftKey("alice", "quiz1"), "{pas du json");
  expect(loadDraft("alice", "quiz1", s)).toBeNull();
  expect(saveDraft("alice", "quiz1", draft("x"), null)).toBe(false);
});

test("même contenu malgré un ordre de clés différent", () => {
  const q = newQuestion();
  const reordered = Object.fromEntries(Object.entries(q).reverse()) as typeof q;
  expect(sameContent({ title: "A", questions: [q] }, { title: "A", questions: [reordered] })).toBe(true);
  expect(sameContent({ title: "A", questions: [q] }, { title: "B", questions: [q] })).toBe(false);
});

test("garde aussi une étape incomplète qui n’a pas encore été ajoutée au quiz", () => {
  const s = memoryStore();
  const pendingStep = { ...newQuestion(), text: "Étape à finir", options: ["Réponse en cours", ""] };
  saveDraft("alice", "quiz1", { ...draft("Quiz enregistré"), pendingStep }, s);
  expect(loadDraft("alice", "quiz1", s)?.pendingStep).toEqual(pendingStep);
  expect(loadDraft("bob", "quiz1", s)).toBeNull();
});
