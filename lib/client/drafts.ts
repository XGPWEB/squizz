import type { Question } from "@/lib/question";

export type Visibility = "PRIVATE" | "SELECTED" | "TEAM";

/**
 * Editor drafts kept in this browser (localStorage), so a reload, a crash or a lost connection never loses
 * work. One draft per account and per quiz (`new` for a quiz not saved yet): another account signed in on
 * the same computer never sees it. Drafts older than DRAFT_DAYS are dropped.
 */
export type Draft = {
  title: string;
  questions: Question[];
  /** A new step being written, not yet added to the quiz (it may still be incomplete). */
  pendingStep?: Question | null;
  /** Who sees the quiz, when the person editing decides it (drafts from before this existed have none). */
  visibility?: Visibility;
  sharedWith?: string[];
  /** Version of the quiz the draft started from (null for a new quiz): used to detect edit conflicts. */
  baseVersion: number | null;
  /** Idempotency key of a new quiz, so saving a restored draft never creates the quiz twice. */
  clientKey?: string;
  savedAt: number;
};

const PREFIX = "squizz:draft:";
/** Same as the grace period of unused media in deploy/purge.mjs: a restored draft never loses its photos. */
export const DRAFT_DAYS = 7;

export const draftKey = (userId: string, quizId: string | null) => `${PREFIX}${userId}:${quizId ?? "new"}`;

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;
const store = (): Store | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // private mode or blocked storage: the editor still works, without drafts
  }
};

export function loadDraft(userId: string, quizId: string | null, s: Store | null = store()): Draft | null {
  if (!s || !userId) return null;
  try {
    const raw = s.getItem(draftKey(userId, quizId));
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (typeof d.title !== "string" || !Array.isArray(d.questions) || !d.questions.length) return null;
    if (Date.now() - d.savedAt > DRAFT_DAYS * 86400_000) {
      s.removeItem(draftKey(userId, quizId));
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

/** Returns false when the browser refuses (storage full or disabled). */
export function saveDraft(userId: string, quizId: string | null, draft: Draft, s: Store | null = store()) {
  if (!s || !userId) return false;
  try {
    s.setItem(draftKey(userId, quizId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(userId: string, quizId: string | null, s: Store | null = store()) {
  try {
    s?.removeItem(draftKey(userId, quizId));
  } catch {
    // nothing to clean
  }
}

/** Same content, whatever the key order (to tell a real draft from the saved quiz). */
export function sameContent(
  a: { title: string; questions: Question[] },
  b: { title: string; questions: Question[] },
) {
  const canonical = (v: unknown): string =>
    Array.isArray(v)
      ? `[${v.map(canonical).join(",")}]`
      : v && typeof v === "object"
        ? `{${Object.keys(v)
            .sort()
            .map((k) => `${k}:${canonical((v as Record<string, unknown>)[k])}`)
            .join(",")}}`
        : JSON.stringify(v ?? null);
  return a.title === b.title && canonical(a.questions) === canonical(b.questions);
}
