"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { QuizEditor } from "@/components/squizz/editor";
import { newQuestion, type Question } from "@/lib/question";
import { ApiError, gameApi, newClientKey, UncertainError, withRetry } from "@/lib/client/api";
import { clearDraft, loadDraft, sameContent, saveDraft, type Draft } from "@/lib/client/drafts";

type Saved = { id: string; title: string; questions: Question[]; version: number };
type Conflict = {
  byMe?: boolean;
  version: number;
  updatedAt: string;
  updatedBy: string | null;
  title: string;
  questions: Question[];
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
export function EditorPage({ userId, quiz }: { userId: string; quiz?: Saved }) {
  const router = useRouter();
  const quizId = quiz?.id ?? null;
  const [title, setTitle] = useState(quiz?.title ?? ""),
    [questions, setQuestions] = useState<Question[]>(() =>
      quiz ? structuredClone(quiz.questions) : [newQuestion()],
    ),
    // What the server has: the draft is « dirty » when it differs from this.
    [baseline, setBaseline] = useState(() =>
      quiz ? { title: quiz.title, questions: quiz.questions } : { title: "", questions: [newQuestion()] },
    ),
    [version, setVersion] = useState<number | null>(quiz?.version ?? null),
    [clientKey, setClientKey] = useState(newClientKey),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [state, setState] = useState<SaveState>("saved"),
    [draftAt, setDraftAt] = useState<number | null>(null),
    [found, setFound] = useState<Draft | null>(null),
    [conflict, setConflict] = useState<Conflict | null>(null);
  const leaving = useRef(false);
  const dirty = !sameContent({ title, questions }, baseline);

  // A draft left by a previous visit (same account, same quiz), different from what is saved.
  useEffect(() => {
    const d = loadDraft(userId, quizId);
    if (!d) return;
    if (sameContent(d, baseline)) clearDraft(userId, quizId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    else setFound(d);
    // Only on opening the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, quizId]);

  // Keeps the work in this browser one second after the last change.
  useEffect(() => {
    if (found || leaving.current) return; // never overwrite a draft not yet restored or dismissed
    if (!dirty) {
      clearDraft(userId, quizId);
      return;
    }
    const timer = setTimeout(() => {
      const ok = saveDraft(userId, quizId, {
        title,
        questions,
        baseVersion: version,
        clientKey,
        savedAt: Date.now(),
      });
      setDraftAt(ok ? Date.now() : null);
      setState((s) => (s === "saving" ? s : ok ? "draft" : "unsaved"));
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, questions, dirty, found, userId, quizId, version, clientKey]);

  // Warns before leaving with changes not saved on the server (reload, closing the tab, links in the app).
  useEffect(() => {
    if (!dirty) return;
    const message = "Des modifications ne sont pas enregistrées. Quitter quand même ?";
    const onUnload = (e: BeforeUnloadEvent) => {
      if (leaving.current) return;
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
      }
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  function restore(d: Draft) {
    setTitle(d.title);
    setQuestions(d.questions);
    setVersion(d.baseVersion);
    if (d.clientKey) setClientKey(d.clientKey);
    setFound(null);
    setState("draft");
    setDraftAt(d.savedAt);
  }
  function dismiss() {
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
    setBusy(true);
    setError("");
    setState("saving");
    const content = { title, questions };
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
    setBaseline({ title: c.title, questions: c.questions });
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
