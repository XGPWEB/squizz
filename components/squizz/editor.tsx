"use client";
import { useState } from "react";
import { Dialog } from "radix-ui";
import {
  Plus,
  X,
  ArrowUp,
  ArrowDown,
  Eye,
  Copy,
  Undo2,
  Trophy,
  UsersRound,
  Check,
  Lock,
  UserPlus,
  Building2,
} from "lucide-react";
import type { Visibility } from "@/lib/client/drafts";
import { useHydrated } from "@/lib/client/hydrated";
import { isProfileQuiz, MAX_PROFILES, quizProfiles, validateProfiles } from "@/lib/profiles";
import {
  changeType,
  isScored,
  losesContent,
  newQuestion,
  questionTypes,
  restoreType,
  slideLayoutLabel,
  validateQuestion,
  type Question,
  type QuestionType,
} from "@/lib/question";
import { StepWizard } from "./step-wizard";
import { QuestionPreview } from "./question-preview";
import { QuestionFields } from "./question-fields";
const FORMATS = [
  {
    id: "points",
    label: "Quiz à points",
    icon: <Trophy size={20} />,
    goal: "Pour jouer, réviser ou vérifier des acquis.",
    facts: [
      [true, "Tous les types de questions : quiz, vrai ou faux, sondage, diapo…"],
      [true, "Des points à chaque bonne réponse"],
      [true, "À la fin : classement et podium"],
    ],
  },
  {
    id: "profiles",
    label: "Quiz à profils",
    icon: <UsersRound size={20} />,
    goal: "Pour situer un groupe : style de management, culture d’équipe, positionnement.",
    facts: [
      [true, "Questions d’avis uniquement : sondage, échelle, nuage de mots, diapo…"],
      [false, "Ni points, ni classement, ni bonne réponse"],
      [true, "À la fin : le profil général du groupe, sans résultat individuel"],
    ],
  },
] as const;
const SHARING = [
  {
    id: "PRIVATE",
    label: "Brouillon privé",
    icon: <Lock size={16} />,
    note: "Vous seul voyez ce quiz, le temps de le terminer. Personne d’autre dans l’équipe ne peut l’ouvrir ni le lancer.",
  },
  {
    id: "SELECTED",
    label: "Quelques personnes",
    icon: <UserPlus size={16} />,
    note: "Seules les personnes cochées voient ce quiz : elles peuvent le modifier avec vous et le lancer.",
  },
  {
    id: "TEAM",
    label: "Toute l’équipe",
    icon: <Building2 size={16} />,
    note: "Tous les membres de l’équipe voient ce quiz et peuvent le lancer. Vous et les administrateurs pouvez le modifier.",
  },
] as const;

export function QuizEditor({
  title,
  questions,
  setTitle,
  setQuestions,
  sharing,
  setSharing,
  teammates = [],
  author = null,
  busy,
  setBusy,
  onError,
  onSave,
  editing = false,
  status,
  dirty = false,
}: {
  title: string;
  questions: Question[];
  setTitle: (s: string) => void;
  setQuestions: (q: Question[]) => void;
  /** Who sees the quiz in the team; `setSharing` is only given to the person who decides it. */
  sharing?: { visibility: Visibility; sharedWith: string[] };
  setSharing?: (s: { visibility: Visibility; sharedWith: string[] }) => void;
  teammates?: { id: string; name: string }[];
  author?: string | null;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onError: (s: string) => void;
  onSave: () => void;
  editing?: boolean;
  /** Where the work stands (draft kept on this device, saved…), shown next to the save button. */
  status?: string;
  dirty?: boolean;
}) {
  const [active, setActive] = useState(0);
  // What is typed before the editor listens stays on screen but never reaches it, and is lost at the
  // next change: the fields open once it does.
  const ready = useHydrated();
  // The last deleted step, until it is restored or another step is deleted.
  const [removed, setRemoved] = useState<{ step: Question; index: number } | null>(null);
  // A step as it was before a change of type dropped part of it, until steps move around it.
  const [retyped, setRetyped] = useState<{ step: Question; index: number } | null>(null);
  const [picker, setPicker] = useState(false),
    [preview, setPreview] = useState(false);
  // A profile quiz is one whose answers name profiles; until the first one is named, the choice made
  // here keeps the editor in that format.
  const [profileChosen, setProfileChosen] = useState(() => isProfileQuiz(questions));
  const profileNames = quizProfiles(questions);
  const profileQuiz = profileChosen || isProfileQuiz(questions);
  const setFormat = (profiles: boolean) => {
    if (profiles === profileQuiz) return;
    if (profiles) {
      const written = questions.findIndex((x) => isScored(x.type) && x.text.trim());
      if (written >= 0) {
        setActive(written);
        return onError(
          `Étape ${written + 1} : un quiz à profils ne contient pas de question à points. Transformez-la en sondage ou supprimez-la, puis choisissez à nouveau ce format.`,
        );
      }
      // Scored steps still empty become polls, ready to point to profiles.
      setQuestions(questions.map((x) => (isScored(x.type) ? newQuestion("poll") : x)));
      setProfileChosen(true);
    } else {
      if (
        profileNames.length &&
        !confirm("Revenir à un quiz à points retire les profils associés aux réponses. Continuer ?")
      )
        return;
      setQuestions(questions.map((x) => (x.profiles.length ? { ...x, profiles: [] } : x)));
      setProfileChosen(false);
    }
  };
  const renameProfile = (from: string, to: string) => {
    const name = to.trim();
    if (name === from) return;
    setQuestions(
      questions.map((x) =>
        x.profiles.some((p) => p.trim() === from)
          ? { ...x, profiles: x.profiles.map((p) => (p.trim() === from ? name : p)) }
          : x,
      ),
    );
  };
  const index = Math.min(active, questions.length - 1);
  const q = questions[index];
  const patch = (value: Partial<Question>) =>
    setQuestions(questions.map((x, i) => (i === index ? { ...x, ...value } : x)));
  const before = retyped?.index === index ? retyped.step : null;
  const undoType = () => {
    if (before) patch(restoreType(before, q));
    setRetyped(null);
  };
  const setType = (type: QuestionType) => {
    if (before?.type === type) return undoType();
    if (losesContent(q, type)) setRetyped({ step: q, index });
    patch(changeType(q, type));
  };
  const duplicate = () => {
    const copy = structuredClone(q);
    setQuestions([...questions.slice(0, index + 1), copy, ...questions.slice(index + 1)]);
    setActive(index + 1);
    setRetyped(null);
  };
  const remove = () => {
    setRetyped(null);
    setRemoved({ step: q, index });
    setQuestions(questions.filter((_, i) => i !== index));
    setActive(Math.max(0, index - 1));
  };
  const undoRemove = () => {
    if (!removed || questions.length >= 30) return;
    const at = Math.min(removed.index, questions.length);
    setQuestions([...questions.slice(0, at), removed.step, ...questions.slice(at)]);
    setActive(at);
    setRemoved(null);
    setRetyped(null);
  };
  const add = (step: Question) => {
    setQuestions([...questions, step]);
    setActive(questions.length);
    setPicker(false);
  };
  function submit() {
    for (let i = 0; i < questions.length; i++) {
      try {
        validateQuestion(questions[i]);
      } catch (e) {
        setActive(i);
        onError(`Question ${i + 1} : ${(e as Error).message}`);
        return;
      }
    }
    if (setSharing && sharing?.visibility === "SELECTED" && !sharing.sharedWith.length)
      return onError("Partage : cochez au moins une personne de l’équipe, ou choisissez un autre réglage.");
    if (profileQuiz) {
      try {
        if (profileNames.length < 2)
          throw new Error(
            "Un quiz à profils a besoin d’au moins deux profils : dans vos sondages, indiquez un profil en face des réponses.",
          );
        validateProfiles(questions);
      } catch (e) {
        onError((e as Error).message);
        return;
      }
    }
    onSave();
  }
  return (
    <section className="quiz-editor">
      <div className="editor-title">
        <span className="sticker pink-sticker">{editing ? "RETOUCHES EN COURS" : "À VOUS DE CRÉER"}</span>
        <h1>{editing ? "On peaufine votre quiz." : "Votre quiz. Vos règles."}</h1>
      </div>
      <form
        method="post"
        onSubmit={(e) => {
          e.preventDefault();
          // React bubbles events through portals: a form inside a dialog of the editor (the preview's
          // answer form) must never save the quiz.
          if (e.target !== e.currentTarget) return;
          submit();
        }}
      >
        <fieldset disabled={busy || !ready} data-starting={!ready || undefined}>
          <label className="quiz-title-input">
            Titre du quiz
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={90}
              placeholder="Ex. Qui connaît vraiment notre équipe ?"
              required
            />
          </label>
          <section className="editor-block" aria-labelledby="format-heading">
            <div className="editor-block-head">
              <h2 id="format-heading">Quel format de quiz ?</h2>
              <p className="hint">
                Le format décide de ce qui se passe à la fin de la partie : un classement, ou le profil
                général du groupe. Choisissez-le avant d’écrire vos questions.
              </p>
            </div>
            <div className="quiz-format" role="radiogroup" aria-labelledby="format-heading">
              {FORMATS.map((format) => {
                const selected = (format.id === "profiles") === profileQuiz;
                return (
                  <button
                    key={format.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`${format.id} ${selected ? "selected" : ""}`}
                    onClick={() => setFormat(format.id === "profiles")}
                  >
                    <span className="quiz-format-head">
                      <b aria-hidden>{format.icon}</b>
                      <strong>{format.label}</strong>
                      <i className="quiz-format-mark" aria-hidden>
                        {selected ? "FORMAT CHOISI" : "CHOISIR"}
                      </i>
                    </span>
                    <span className="quiz-format-goal">{format.goal}</span>
                    <span className="quiz-format-facts">
                      {format.facts.map(([ok, text]) => (
                        <span key={text} className={ok ? "yes" : "no"}>
                          {ok ? <Check size={15} strokeWidth={3} /> : <X size={15} strokeWidth={3} />}
                          {text}
                        </span>
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
          {sharing && (setSharing ? teammates.length > 0 : sharing.visibility !== "TEAM") && (
            <section className="editor-block" aria-labelledby="sharing-heading">
              <div className="editor-block-head">
                <h2 id="sharing-heading">Qui voit ce quiz dans l’équipe ?</h2>
                {!setSharing && (
                  <p className="hint">Ce réglage appartient à {author ?? "l’auteur du quiz"}.</p>
                )}
              </div>
              <div className="quiz-sharing" role="radiogroup" aria-labelledby="sharing-heading">
                {SHARING.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={sharing.visibility === option.id}
                    className={sharing.visibility === option.id ? "selected" : ""}
                    disabled={!setSharing}
                    onClick={() => setSharing?.({ ...sharing, visibility: option.id })}
                  >
                    {option.icon} {option.label}
                  </button>
                ))}
              </div>
              <p className="quiz-sharing-note" key={sharing.visibility}>
                {SHARING.find((option) => option.id === sharing.visibility)?.note}
              </p>
              {sharing.visibility === "SELECTED" && (
                <div className="quiz-sharing-people">
                  {teammates.map((member) => (
                    <label key={member.id}>
                      <input
                        type="checkbox"
                        disabled={!setSharing}
                        checked={sharing.sharedWith.includes(member.id)}
                        onChange={(e) =>
                          setSharing?.({
                            ...sharing,
                            sharedWith: e.target.checked
                              ? [...sharing.sharedWith, member.id]
                              : sharing.sharedWith.filter((id) => id !== member.id),
                          })
                        }
                      />
                      {member.name}
                    </label>
                  ))}
                </div>
              )}
            </section>
          )}
          <div className="editor-layout">
            <aside className="editor-steps">
              <h3>Les étapes</h3>
              {questions.map((step, i) => (
                <button
                  key={i}
                  type="button"
                  className={`step-button ${i === index ? "active" : ""}`}
                  aria-current={i === index ? "step" : undefined}
                  onClick={() => setActive(i)}
                >
                  <b>{i + 1}</b>
                  <span>
                    {step.text || "Nouvelle question"}
                    <small>
                      {step.type === "slide"
                        ? `Diapo · ${slideLayoutLabel(step.layout)}`
                        : questionTypes.find((t) => t.id === step.type)?.label}
                    </small>
                  </span>
                </button>
              ))}
              <button
                type="button"
                className="button small secondary"
                disabled={questions.length >= 30}
                onClick={() => setPicker(true)}
              >
                <Plus size={16} /> Ajouter une étape
              </button>
              <p className="hint">{questions.length} / 30 étapes</p>
              {profileQuiz && (
                <div className="editor-profiles">
                  <h3>Les profils</h3>
                  {profileNames.length ? (
                    <ul>
                      {profileNames.map((name) => (
                        <li key={name}>
                          <input
                            aria-label={`Renommer le profil ${name}`}
                            defaultValue={name}
                            maxLength={40}
                            onBlur={(e) => renameProfile(name, e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())
                            }
                          />
                          <small>
                            {questions.reduce(
                              (n, x) => n + x.profiles.filter((p) => p.trim() === name).length,
                              0,
                            )}{" "}
                            rép.
                          </small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="hint">
                      Aucun profil pour l’instant : dans un sondage, écrivez un profil en face de chaque
                      réponse.
                    </p>
                  )}
                  <p className="hint">
                    {profileNames.length} / {MAX_PROFILES} profils · cliquez sur un nom pour le renommer
                    partout
                  </p>
                </div>
              )}
            </aside>
            <section className="question-workspace">
              <div className="row spaced">
                <h2>Question {index + 1}</h2>
                <div className="row">
                  <button type="button" className="button small secondary" onClick={() => setPreview(true)}>
                    <Eye size={16} /> Aperçu
                  </button>
                  <button
                    type="button"
                    className="button small secondary"
                    disabled={questions.length >= 30}
                    onClick={duplicate}
                    title="Ajoute une copie de cette étape juste après"
                  >
                    <Copy size={16} /> Dupliquer
                  </button>
                  {questions.length > 1 && (
                    <button type="button" className="text-button" onClick={remove}>
                      <X size={18} /> Supprimer
                    </button>
                  )}
                </div>
              </div>
              {removed && (
                <p className="info-box undo-box" role="status">
                  Étape {removed.index + 1} supprimée
                  {removed.step.text ? ` (« ${removed.step.text.slice(0, 40)} »)` : ""}.{" "}
                  <button
                    type="button"
                    className="text-button"
                    onClick={undoRemove}
                    disabled={questions.length >= 30}
                  >
                    <Undo2 size={16} /> Annuler la suppression
                  </button>
                </p>
              )}
              {before && (
                <p className="info-box undo-box" role="status">
                  Certains réglages n’existent pas dans ce type et ont été retirés.{" "}
                  <button type="button" className="text-button" onClick={undoType}>
                    <Undo2 size={16} /> Revenir au type précédent
                  </button>
                </p>
              )}
              <QuestionFields
                q={q}
                patch={patch}
                profileNames={profileQuiz ? profileNames : undefined}
                mediaKey={index}
                setType={setType}
                onBusy={setBusy}
                onError={onError}
              />
              <div className="row spaced editor-move">
                <button
                  type="button"
                  className="button small secondary"
                  disabled={index === 0}
                  onClick={() => {
                    const items = [...questions];
                    [items[index - 1], items[index]] = [items[index], items[index - 1]];
                    setQuestions(items);
                    setActive(index - 1);
                    setRetyped(null);
                  }}
                >
                  <ArrowUp size={16} /> Monter l’étape
                </button>
                <button
                  type="button"
                  className="button small secondary"
                  disabled={index === questions.length - 1}
                  onClick={() => {
                    const items = [...questions];
                    [items[index + 1], items[index]] = [items[index], items[index + 1]];
                    setQuestions(items);
                    setActive(index + 1);
                    setRetyped(null);
                  }}
                >
                  <ArrowDown size={16} /> Descendre l’étape
                </button>
              </div>
            </section>
          </div>
          <StepWizard
            open={picker}
            number={questions.length + 1}
            profileNames={profileQuiz ? profileNames : undefined}
            onClose={() => setPicker(false)}
            onAdd={add}
            onBusy={setBusy}
          />
          <Dialog.Root open={preview} onOpenChange={setPreview}>
            <Dialog.Portal>
              <Dialog.Overlay className="host-overlay" />
              <Dialog.Content className="host-modal wizard" aria-describedby={undefined}>
                <div className="host-modal-head">
                  <div>
                    <span className="eyebrow">APERÇU · ÉTAPE {index + 1}</span>
                    <Dialog.Title className="host-modal-title">{q.text || "Sans titre"}</Dialog.Title>
                  </div>
                  <Dialog.Close className="host-modal-close" aria-label="Fermer">
                    <X size={22} />
                  </Dialog.Close>
                </div>
                <div className="host-modal-body">
                  <QuestionPreview question={q} index={index} />
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <div className="editor-save">
            <span className={`save-status ${dirty ? "dirty" : ""}`} role="status" aria-live="polite">
              {busy
                ? "Import ou enregistrement en cours…"
                : (status ?? "Tout est prêt ? Enregistrez votre quiz.")}
            </span>
            <button type="submit" className="button" disabled={busy}>
              {busy ? "Un instant…" : editing ? "Enregistrer les modifications" : "Enregistrer le quiz"}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
