"use client";
import { useState } from "react";
import { Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  newQuestion,
  questionTypes,
  durations,
  isScored,
  validateQuestion,
  type Question,
  type QuestionType,
} from "@/lib/question";
import { Choice } from "./settings";
import { MediaEditor, PinImage } from "./media";
export function QuizEditor({
  title,
  questions,
  setTitle,
  setQuestions,
  busy,
  setBusy,
  onError,
  onSave,
}: {
  title: string;
  questions: Question[];
  setTitle: (s: string) => void;
  setQuestions: (q: Question[]) => void;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onError: (s: string) => void;
  onSave: () => void;
}) {
  const [active, setActive] = useState(0);
  const [picker, setPicker] = useState(false);
  const index = Math.min(active, questions.length - 1);
  const q = questions[index];
  const patch = (value: Partial<Question>) =>
    setQuestions(questions.map((x, i) => (i === index ? { ...x, ...value } : x)));
  const setType = (type: QuestionType) =>
    patch({ ...newQuestion(type), text: q.text, media: q.media, duration: q.duration });
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
    onSave();
  }
  return (
    <section className="quiz-editor">
      <div className="editor-title">
        <span className="sticker pink-sticker">À TOI DE CRÉER</span>
        <h1>Ton quiz. Tes règles.</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <fieldset disabled={busy}>
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
          <div className="editor-layout">
            <aside className="editor-steps">
              <h3>Les étapes</h3>
              {questions.map((step, i) => (
                <button
                  key={i}
                  type="button"
                  className={`step-button ${i === index ? "active" : ""}`}
                  onClick={() => setActive(i)}
                >
                  <b>{i + 1}</b>
                  <span>
                    {step.text || "Nouvelle question"}
                    <small>{questionTypes.find((t) => t.id === step.type)?.label}</small>
                  </span>
                </button>
              ))}
              <button
                type="button"
                className="button small secondary"
                disabled={questions.length >= 30}
                onClick={() => setPicker((v) => !v)}
              >
                <Plus size={16} /> Ajouter une étape
              </button>
              <p className="hint">{questions.length} / 30 étapes</p>
            </aside>
            <section className="question-workspace">
              <div className="row spaced">
                <h2>Question {index + 1}</h2>
                {questions.length > 1 && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setQuestions(questions.filter((_, i) => i !== index));
                      setActive(Math.max(0, index - 1));
                    }}
                  >
                    <X size={18} /> Supprimer
                  </button>
                )}
              </div>
              <Choice
                label="Type de question"
                value={q.type}
                options={questionTypes.map((t) => [t.id, t.label])}
                onChange={(v) => setType(v as QuestionType)}
              />
              <p className="hint">{questionTypes.find((t) => t.id === q.type)?.hint}</p>
              <label className="question-label">
                {q.type === "slide" ? "Titre de la diapo" : "Ta question"}
                <textarea
                  value={q.text}
                  onChange={(e) => patch({ text: e.target.value })}
                  maxLength={300}
                  placeholder="Écris ici…"
                  rows={2}
                  required
                />
              </label>
              <div className="question-settings">
                {q.type !== "slide" && (
                  <Choice
                    label="Temps imparti"
                    value={String(q.duration)}
                    options={durations.map((d) => [
                      String(d),
                      d < 60
                        ? `${d} secondes`
                        : d === 90
                          ? "1 min 30 s"
                          : `${d / 60} minute${d > 60 ? "s" : ""}`,
                    ])}
                    onChange={(v) => patch({ duration: Number(v) })}
                  />
                )}{" "}
                {isScored(q.type) && (
                  <Choice
                    label="Points"
                    value={q.points}
                    options={[
                      ["standard", "Standard"],
                      ["double", "Points doubles"],
                      ["none", "Aucun point"],
                    ]}
                    onChange={(v) => patch({ points: v as Question["points"] })}
                  />
                )}{" "}
                {["quiz", "poll"].includes(q.type) && (
                  <Choice
                    label="Limite de réponse"
                    value={q.multiple ? "multiple" : "single"}
                    options={[
                      ["single", "Une seule réponse"],
                      ["multiple", "Réponses multiples"],
                    ]}
                    onChange={(v) =>
                      patch({
                        multiple: v === "multiple",
                        correctAnswers: v === "single" ? [q.correctAnswers[0] ?? 0] : q.correctAnswers,
                      })
                    }
                  />
                )}
              </div>
              {["quiz", "truefalse", "poll", "puzzle"].includes(q.type) && (
                <section className="answer-editor">
                  <h3>{q.type === "puzzle" ? "Les éléments dans le bon ordre" : "Les réponses"}</h3>
                  <p className="hint">
                    {q.type === "puzzle"
                      ? "Saisis l’ordre attendu. Les éléments seront mélangés pour les joueurs."
                      : q.type === "poll"
                        ? "Pas de bonne ou de mauvaise réponse."
                        : q.multiple
                          ? "Coche toutes les bonnes réponses. Le joueur doit trouver la combinaison exacte."
                          : "Coche la bonne réponse."}
                  </p>
                  {q.options.map((opt, j) => (
                    <div className="option-edit" key={j}>
                      {["quiz", "truefalse"].includes(q.type) && (
                        <Checkbox
                          aria-label={`Réponse ${j + 1} correcte`}
                          checked={q.correctAnswers.includes(j)}
                          onCheckedChange={(v) =>
                            patch({
                              correctAnswers: q.multiple
                                ? v
                                  ? [...q.correctAnswers, j]
                                  : q.correctAnswers.filter((i) => i !== j)
                                : [j],
                              correct: j,
                            })
                          }
                        />
                      )}
                      <span className="option-number">{j + 1}</span>
                      <input
                        aria-label={`Réponse ${j + 1}`}
                        readOnly={q.type === "truefalse"}
                        value={opt}
                        maxLength={150}
                        required
                        onChange={(e) =>
                          patch({ options: q.options.map((v, k) => (k === j ? e.target.value : v)) })
                        }
                      />
                      {q.type !== "truefalse" && q.options.length > 2 && (
                        <button
                          type="button"
                          className="text-button"
                          aria-label={`Retirer la réponse ${j + 1}`}
                          onClick={() => {
                            const options = q.options.filter((_, k) => k !== j);
                            patch({
                              options,
                              correctAnswers: q.correctAnswers
                                .filter((k) => k !== j)
                                .map((k) => (k > j ? k - 1 : k)),
                              order: options.map((_, k) => k),
                            });
                          }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {q.type !== "truefalse" && (
                    <button
                      type="button"
                      className="button small secondary"
                      disabled={q.options.length >= 6}
                      onClick={() =>
                        patch({ options: [...q.options, ""], order: [...q.order, q.options.length] })
                      }
                    >
                      Ajouter une réponse
                    </button>
                  )}
                </section>
              )}
              {q.type === "text" && (
                <label className="stack">
                  Réponses acceptées (une par ligne)
                  <textarea
                    value={q.accepted.join("\n")}
                    onChange={(e) => patch({ accepted: e.target.value.split("\n") })}
                    rows={4}
                    required
                  />
                  <span className="hint">
                    Accents, majuscules et espaces superflus sont ignorés. Jusqu’à 10 variantes.
                  </span>
                </label>
              )}
              {q.type === "slider" && (
                <div className="numeric-settings">
                  {(["min", "max", "step", "target", "tolerance"] as const).map((key, i) => (
                    <label key={key}>
                      {["Minimum", "Maximum", "Pas", "Bonne valeur", "Tolérance ±"][i]}
                      <input
                        type="number"
                        step="any"
                        value={q[key]}
                        onChange={(e) => patch({ [key]: e.target.valueAsNumber })}
                        required
                      />
                    </label>
                  ))}
                </div>
              )}
              {q.type === "scale" && (
                <Choice
                  label="Échelle de 1 à…"
                  value={String(q.max)}
                  options={Array.from({ length: 9 }, (_, i) => [String(i + 2), String(i + 2)])}
                  onChange={(v) => patch({ max: Number(v) })}
                />
              )}
              {q.type === "nps" && (
                <p className="info-box">
                  De 0 à 10 : détracteurs (0–6), passifs (7–8), promoteurs (9–10). Le résultat NPS va de −100
                  à +100.
                </p>
              )}
              {q.type === "slide" && (
                <label className="stack">
                  Texte de la diapo
                  <textarea
                    value={q.body}
                    maxLength={4000}
                    rows={7}
                    onChange={(e) => patch({ body: e.target.value })}
                  />
                  <span className="hint">
                    Sans chronomètre ni réponse. L’animateur décide quand poursuivre.
                  </span>
                </label>
              )}
              <MediaEditor
                key={index}
                media={q.media}
                onChange={(media) => patch({ media })}
                onBusy={setBusy}
                onError={onError}
              />
              {["pin", "pinpoll"].includes(q.type) && (
                <section className="pin-config">
                  <h3>{q.type === "pin" ? "La zone à trouver" : "L’image à explorer"}</h3>
                  {q.media.find((m) => m.kind === "image") ? (
                    <>
                      <PinImage
                        media={q.media.find((m) => m.kind === "image")!}
                        value={q.type === "pin" ? q.pin : undefined}
                        radius={q.type === "pin" ? q.pin.radius : undefined}
                        onChange={
                          q.type === "pin" ? (point) => patch({ pin: { ...q.pin, ...point } }) : undefined
                        }
                      />
                      {q.type === "pin" && (
                        <>
                          <p className="hint">
                            Clique sur l’image pour placer le centre. Les réponses dans le cercle sont
                            acceptées.
                          </p>
                          <label>
                            Taille de la zone : {Math.round(q.pin.radius * 100)} %
                            <Slider
                              className="hub-slider"
                              min={2}
                              max={50}
                              step={1}
                              value={[q.pin.radius * 100]}
                              onValueChange={(v) => patch({ pin: { ...q.pin, radius: v[0] / 100 } })}
                              aria-label="Rayon de la zone correcte"
                            />
                          </label>
                        </>
                      )}
                    </>
                  ) : (
                    <p className="info-box">
                      Ajoute une photo ci-dessus pour définir le support de cette question.
                    </p>
                  )}
                </section>
              )}
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
                  }}
                >
                  <ArrowDown size={16} /> Descendre l’étape
                </button>
              </div>
            </section>
          </div>
          {picker && (
            <section className="type-picker">
              <div className="row spaced">
                <h2>Quel type d’étape ?</h2>
                <button type="button" className="text-button" onClick={() => setPicker(false)}>
                  <X /> Fermer
                </button>
              </div>
              {["Tester les connaissances", "Collecter des avis", "Présenter des infos"].map((group) => (
                <div key={group}>
                  <h3>{group}</h3>
                  <div className="type-grid">
                    {questionTypes
                      .filter((t) => t.group === group)
                      .map((t) => (
                        <button
                          type="button"
                          key={t.id}
                          onClick={() => {
                            setQuestions([...questions, newQuestion(t.id)]);
                            setActive(questions.length);
                            setPicker(false);
                          }}
                        >
                          <strong>{t.label}</strong>
                          <span>{t.hint}</span>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </section>
          )}
          <div className="editor-save">
            <span>
              {busy ? "Import ou enregistrement en cours…" : "Tout est prêt ? Enregistre ton quiz."}
            </span>
            <button type="submit" className="button" disabled={busy}>
              {busy ? "Un instant…" : "Enregistrer le quiz"}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
