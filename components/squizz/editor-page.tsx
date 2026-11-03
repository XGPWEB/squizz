"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { Sparkles, X } from "lucide-react";
import { QuizEditor } from "@/components/squizz/editor";
import { newQuestion, type Question } from "@/lib/question";
import { ApiError, gameApi, newClientKey, UncertainError, withRetry } from "@/lib/client/api";
import {
  clearDraft,
  loadDraft,
  sameContent,
  saveDraft,
  type Draft,
  type Visibility,
} from "@/lib/client/drafts";

type Sharing = { visibility: Visibility; sharedWith: string[] };
type Saved = {
  id: string;
  title: string;
  questions: Question[];
  version: number;
  visibility: Visibility;
  sharedWith: string[];
  /** The person editing is the one who decides who sees the quiz. */
  canManage: boolean;
  author: string | null;
};
export type Teammate = { id: string; name: string };
const sameSharing = (a: Sharing, b: Sharing) =>
  a.visibility === b.visibility &&
  (a.visibility !== "SELECTED" || [...a.sharedWith].sort().join() === [...b.sharedWith].sort().join());
type Conflict = {
  byMe?: boolean;
  version: number;
  updatedAt: string;
  updatedBy: string | null;
  title: string;
  questions: Question[];
  visibility?: Visibility;
  sharedWith?: string[];
};
export type SaveState = "saved" | "dirty" | "draft" | "saving" | "unsaved";

const time = (t: number | string) =>
  new Date(t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const when = (t: number | string) =>
  new Date(t).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

/**
 * Creates a quiz, or edits one when `quiz` is given. Work is kept as a draft in this browser while typing,
 * offered back after a reload, and cleared once the quiz is saved. Saving sends the version the editor
 * started from: if another member saved in between, nothing is overwritten and the person chooses.
 */
export function EditorPage({
  userId,
  quiz,
  teammates = [],
  generated = false,
}: {
  userId: string;
  quiz?: Saved;
  teammates?: Teammate[];
  /** Just written by the AI (lib/server/ai.ts): the author is asked to read it through. */
  generated?: boolean;
}) {
  const router = useRouter();
  const quizId = quiz?.id ?? null;
  const [title, setTitle] = useState(quiz?.title ?? ""),
    [questions, setQuestions] = useState<Question[]>(() =>
      quiz ? structuredClone(quiz.questions) : [newQuestion()],
    ),
    [pendingStep, setPendingStep] = useState<Question | null>(null),
    // What the server has: the draft is « dirty » when it differs from this.
    [baseline, setBaseline] = useState(() =>
      quiz ? { title: quiz.title, questions: quiz.questions } : { title: "", questions: [newQuestion()] },
    ),
    // Who sees the quiz: decided by its author (anyone creating a quiz is its author).
    [sharing, setSharing] = useState<Sharing>(() => ({
      visibility: quiz?.visibility ?? "TEAM",
      sharedWith: quiz?.sharedWith ?? [],
    })),
    [savedSharing, setSavedSharing] = useState(sharing),
    [version, setVersion] = useState<number | null>(quiz?.version ?? null),
    [clientKey, setClientKey] = useState(newClientKey),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [state, setState] = useState<SaveState>("saved"),
    [draftAt, setDraftAt] = useState<number | null>(null),
    [found, setFound] = useState<Draft | null>(null),
    [conflict, setConflict] = useState<Conflict | null>(null);
  const leaving = useRef(false);
  const waitingForRestore = useRef(false);
  const canShare = !quiz || quiz.canManage;
  const dirty =
    !!pendingStep || !sameContent({ title, questions }, baseline) || !sameSharing(sharing, savedSharing);
  const keepDraft = useCallback(
    () =>
      saveDraft(userId, quizId, {
        title,
        questions,
        pendingStep,
        ...(canShare ? sharing : {}),
        baseVersion: version,
        clientKey,
        savedAt: Date.now(),
      }),
    [userId, quizId, title, questions, pendingStep, canShare, sharing, version, clientKey],
  );

  // A draft left by a previous visit (same account, same quiz), different from what is saved.
  useEffect(() => {
    const d = loadDraft(userId, quizId);
    if (!d) return;
    const sharingKept =
      !d.visibility ||
      sameSharing({ visibility: d.visibility, sharedWith: d.sharedWith ?? [] }, savedSharing);
    if (sameContent(d, baseline) && sharingKept && !d.pendingStep) clearDraft(userId, quizId);
    else {
      waitingForRestore.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
      setFound(d);
    }
    // Only on opening the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, quizId]);

  // Keeps the work in this browser one second after the last change.
  useEffect(() => {
    if (waitingForRestore.current || found || leaving.current) return;
    if (!dirty) {
      clearDraft(userId, quizId);
      return;
    }
    const timer = setTimeout(() => {
      const ok = keepDraft();
      setDraftAt(ok ? Date.now() : null);
      setState((s) => (s === "saving" ? s : ok ? "draft" : "unsaved"));
    }, 1000);
    return () => clearTimeout(timer);
  }, [dirty, found, keepDraft, userId, quizId]);

  // Warns before leaving with changes not saved on the server (reload, closing the tab, links in the app).
  useEffect(() => {
    if (!dirty) return;
    const message = "Des modifications ne sont pas enregistrées. Quitter quand même ?";
    const onUnload = (e: BeforeUnloadEvent) => {
      if (leaving.current) return;
      if (!found) keepDraft(); // also keep the last keystroke before the autosave delay
      e.preventDefault();
      e.returnValue = message;
    };
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || leaving.current || link.target === "_blank" || e.defaultPrevented) return;
      if (new URL(link.href, location.href).origin !== location.origin) return;
      if (!confirm(`${message}\nVotre brouillon reste gardé sur cet appareil.`)) {
        e.preventDefault();
        e.stopPropagation();
      } else if (!found) keepDraft();
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, found, keepDraft]);

  function restore(d: Draft) {
    waitingForRestore.current = false;
    setTitle(d.title);
    setQuestions(d.questions);
    setPendingStep(d.pendingStep ?? null);
    if (canShare && d.visibility) setSharing({ visibility: d.visibility, sharedWith: d.sharedWith ?? [] });
    setVersion(d.baseVersion);
    if (d.clientKey) setClientKey(d.clientKey);
    setFound(null);
    setState("draft");
    setDraftAt(d.savedAt);
  }
  function dismiss() {
    waitingForRestore.current = false;
    clearDraft(userId, quizId);
    setFound(null);
  }

  function done(created: boolean) {
    leaving.current = true;
    clearDraft(userId, quizId);
    router.push(`/app?ok=${created ? "cree" : "modifie"}`);
    router.refresh();
  }

  async function save(options: { force?: boolean; asCopy?: boolean } = {}) {
    if (busy) return;
    if (pendingStep) {
      setError(
        "Une étape est en cours de création : ajoutez-la au quiz ou abandonnez-la avant d’enregistrer.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setState("saving");
    const content = { title, questions, ...(canShare ? sharing : {}) };
    try {
      if (quiz && !options.asCopy) {
        // The version makes a retry safe: the server accepts the same content twice.
        await withRetry(() =>
          gameApi("update", { quizId: quiz.id, quiz: content, version, force: options.force === true }),
        );
        done(false);
      } else {
        // The key makes a retry safe: the server returns the quiz created the first time.
        const key = options.asCopy ? newClientKey() : clientKey;
        await withRetry(() => gameApi("save", { quiz: content, clientKey: key }));
        if (options.asCopy) clearDraft(userId, quizId);
        done(true);
      }
    } catch (e) {
      setBusy(false);
      setState(dirty ? "draft" : "saved");
      if (e instanceof ApiError && e.status === 409 && e.details.conflict) {
        setConflict(e.details.conflict as Conflict);
        return;
      }
      setError(
        e instanceof UncertainError
          ? "Enregistrement non confirmé : la connexion est lente ou coupée. Votre travail est gardé en brouillon sur cet appareil ; réessayez dans un instant."
          : (e as Error).message,
      );
    }
  }

  function takeTheirs(c: Conflict) {
    if (
      !confirm(
        "Remplacer votre travail par la version enregistrée par l’autre membre ? Vos modifications seront perdues.",
      )
    )
      return;
    setTitle(c.title);
    setQuestions(structuredClone(c.questions));
    setPendingStep(null);
    setBaseline({ title: c.title, questions: c.questions });
    if (c.visibility) {
      const theirs = { visibility: c.visibility, sharedWith: c.sharedWith ?? [] };
      setSharing(theirs);
      setSavedSharing(theirs);
    }
    setVersion(c.version);
    setConflict(null);
    clearDraft(userId, quizId);
    setState("saved");
  }

  const status =
    state === "saving"
      ? "Enregistrement…"
      : !dirty
        ? quiz
          ? "Tout est enregistré."
          : "Commencez votre quiz : il est gardé sur cet appareil au fil de l’eau."
        : state === "unsaved"
          ? "Brouillon impossible à garder sur cet appareil : enregistrez bientôt."
          : draftAt
            ? `Brouillon gardé sur cet appareil à ${time(draftAt)} · pas encore enregistré`
            : "Modifications non enregistrées";

  return (
    <>
      {generated && (
        <div className="info-box ai-generated" role="status">
          <Sparkles size={18} aria-hidden />
          <p>
            <strong>Quiz généré par l’IA</strong> : relisez chaque question et sa bonne réponse avant de le
            lancer, ajoutez des images si besoin. L’IA peut se tromper.
          </p>
        </div>
      )}
      {found && (
        <div className="info-box draft-found" role="status">
          <p>
            <strong>Brouillon retrouvé</strong> : des modifications du {when(found.savedAt)} n’ont pas été
            enregistrées.
            {quiz &&
              found.baseVersion !== null &&
              found.baseVersion < quiz.version &&
              " Le quiz a été enregistré depuis : à l’enregistrement, vous choisirez la version à garder."}
          </p>
          <div className="row">
            <button className="button small" onClick={() => restore(found)}>
              Restaurer le brouillon
            </button>
            <button className="button small secondary" onClick={dismiss}>
              L’ignorer et le supprimer
            </button>
          </div>
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}{" "}
          <button className="text-button" onClick={() => setError("")} aria-label="Fermer le message">
            <X size={16} />
          </button>
        </div>
      )}
      <QuizEditor
        title={title}
        questions={questions}
        setTitle={setTitle}
        setQuestions={setQuestions}
        pendingStep={pendingStep}
        setPendingStep={setPendingStep}
        sharing={sharing}
        setSharing={canShare ? setSharing : undefined}
        teammates={teammates}
        author={quiz?.author ?? null}
        busy={busy}
        setBusy={setBusy}
        onError={setError}
        onSave={() => save()}
        editing={!!quiz}
        status={status}
        dirty={dirty}
      />
      <Dialog.Root open={!!conflict} onOpenChange={(open) => !open && setConflict(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="host-overlay" />
          <Dialog.Content className="host-modal conflict-modal">
            <div className="host-modal-head">
              <div>
                <span className="eyebrow">CONFLIT D’ÉDITION</span>
                <Dialog.Title className="host-modal-title">Deux versions de ce quiz</Dialog.Title>
              </div>
              <Dialog.Close className="host-modal-close" aria-label="Fermer">
                <X size={22} />
              </Dialog.Close>
            </div>
            {conflict && (
              <div className="host-modal-body">
                <Dialog.Description>
                  {conflict.byMe
                    ? `Vous avez enregistré ce quiz depuis un autre onglet ou appareil le ${when(conflict.updatedAt)}, pendant que vous le modifiiez ici.`
                    : `${conflict.updatedBy ?? "Un autre membre"} a enregistré ce quiz le ${when(conflict.updatedAt)}, pendant que vous le modifiiez.`}{" "}
                  Rien n’a été écrasé : votre travail est toujours là, gardé en brouillon sur cet appareil.
                </Dialog.Description>
                <ul className="conflict-summary">
                  <li>
                    <strong>Votre version</strong> : « {title} », {questions.length} étape
                    {questions.length > 1 ? "s" : ""}
                  </li>
                  <li>
                    <strong>Version enregistrée</strong> : « {conflict.title} », {conflict.questions.length}{" "}
                    étape
                    {conflict.questions.length > 1 ? "s" : ""}
                  </li>
                </ul>
                <div className="conflict-actions">
                  <button
                    className="button"
                    onClick={() => {
                      setConflict(null);
                      save({ asCopy: true });
                    }}
                  >
                    Enregistrer ma version comme nouveau quiz
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => {
                      if (!confirm("Remplacer la version de l’autre membre par la vôtre ?")) return;
                      setConflict(null);
                      setVersion(conflict.version);
                      save({ force: true });
                    }}
                  >
                    Remplacer par ma version
                  </button>
                  <button className="button secondary" onClick={() => takeTheirs(conflict)}>
                    Reprendre la version enregistrée
                  </button>
                  <Dialog.Close className="text-button">Continuer à modifier</Dialog.Close>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
