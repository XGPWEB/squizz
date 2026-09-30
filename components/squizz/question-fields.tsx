"use client";
import { X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  questionTypes,
  slideLayouts,
  durations,
  isScored,
  type Question,
  type QuestionType,
  type SlideLayout,
} from "@/lib/question";
import { Choice } from "./settings";
import { MediaEditor, PinImage } from "./media";

/**
 * The fields of one quiz step. The editor shows them all at once; the creation window splits them
 * into "content" and "settings" steps.
 */
export function QuestionFields({
  q,
  patch,
  part,
  mediaKey,
  setType,
  onBusy,
  onError,
}: {
  q: Question;
  patch: (value: Partial<Question>) => void;
  part: "all" | "content" | "settings";
  mediaKey: number | string;
  setType?: (type: QuestionType) => void;
  onBusy: (busy: boolean) => void;
  onError: (message: string) => void;
}) {
  const content = part !== "settings";
  const settings = part !== "content";
  return (
    <>
      {setType && (
        <Choice
          label="Type de question"
          value={q.type}
          options={questionTypes.map((t) => [t.id, t.label, undefined, t.group])}
          onChange={(v) => setType(v as QuestionType)}
        />
      )}
      {content && (
        <>
          {q.type === "slide" ? (
            <>
              <Choice
                label="Mise en page"
                value={q.layout}
                options={slideLayouts.map((l) => [l.id, l.label, l.hint])}
                onChange={(v) => patch({ layout: v as SlideLayout })}
              />
              <p className="hint">{slideLayouts.find((l) => l.id === q.layout)?.hint}</p>
            </>
          ) : (
            <p className="hint">{questionTypes.find((t) => t.id === q.type)?.hint}</p>
          )}
          <label className="question-label">
            {q.type !== "slide"
              ? "Votre question"
              : q.layout === "quote"
                ? "La citation"
                : q.layout === "bigimage"
                  ? "Légende de l’image"
                  : "Titre de la diapo"}
            <textarea
              value={q.text}
              onChange={(e) => patch({ text: e.target.value })}
              maxLength={300}
              placeholder="Écrivez ici…"
              rows={2}
              required
            />
          </label>
        </>
      )}
      {settings && (
        <div className="question-settings">
          {q.type !== "slide" && (
            <Choice
              label="Temps imparti"
              value={String(q.duration)}
              options={durations.map((d) => [
                String(d),
                d < 60 ? `${d} secondes` : d === 90 ? "1 min 30 s" : `${d / 60} minute${d > 60 ? "s" : ""}`,
              ])}
              onChange={(v) => patch({ duration: Number(v) })}
            />
          )}{" "}
          {isScored(q.type) && (
            <Choice
              label="Points"
              value={q.points}
              options={[
                [
                  "standard",
                  "Standard",
                  "Récompense les réponses correctes avec le nombre de points habituel.",
                ],
                ["double", "Points doubles", "Donne deux fois plus de points pour les réponses correctes."],
                ["none", "Aucun point", "Diminue les enjeux de la question et désactive les points."],
              ]}
              onChange={(v) => patch({ points: v as Question["points"] })}
            />
          )}{" "}
          {["quiz", "poll"].includes(q.type) && (
            <Choice
              label="Limite de réponse"
              value={q.multiple ? "multiple" : "single"}
              options={[
                [
                  "single",
                  "Une seule réponse possible",
                  "Les participants ne peuvent sélectionner qu’une seule des réponses.",
                ],
                [
                  "multiple",
                  "Réponses multiples",
                  "Les participants peuvent sélectionner plusieurs réponses avant de les envoyer.",
                ],
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
      )}
      {content && (
        <>
          {["quiz", "truefalse", "poll", "puzzle"].includes(q.type) && (
            <section className="answer-editor">
              <h3>{q.type === "puzzle" ? "Les éléments dans le bon ordre" : "Les réponses"}</h3>
              <p className="hint">
                {q.type === "puzzle"
                  ? "Saisissez l’ordre attendu. Les éléments seront mélangés pour les joueurs."
                  : q.type === "poll"
                    ? "Pas de bonne ou de mauvaise réponse."
                    : q.multiple
                      ? "Cochez toutes les bonnes réponses. Le joueur doit trouver la combinaison exacte."
                      : "Cochez la bonne réponse."}
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
              <label>
                Unité (facultatif)
                <input
                  value={q.unit}
                  maxLength={12}
                  placeholder="€, $, km…"
                  onChange={(e) => patch({ unit: e.target.value })}
                />
              </label>
            </div>
          )}
          {["scale", "nps"].includes(q.type) && (
            <div className="numeric-settings">
              <label>
                Libellé du minimum
                <input
                  value={q.minLabel}
                  maxLength={40}
                  onChange={(e) => patch({ minLabel: e.target.value })}
                />
              </label>
              <label>
                Libellé du maximum
                <input
                  value={q.maxLabel}
                  maxLength={40}
                  onChange={(e) => patch({ maxLabel: e.target.value })}
                />
              </label>
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
              De 0 à 10 : détracteurs (0–6), passifs (7–8), promoteurs (9–10). Le résultat NPS va de −100 à
              +100.
            </p>
          )}
          {q.type === "slide" && (
            <label className="stack">
              {slideBodyLabel[q.layout]}
              <textarea
                value={q.body}
                maxLength={4000}
                rows={q.layout === "quote" || q.layout === "title" ? 2 : 7}
                placeholder={q.layout === "bullets" ? "Premier point\nDeuxième point\nTroisième point" : ""}
                onChange={(e) => patch({ body: e.target.value })}
              />
              <span className="hint">
                {q.layout === "bigimage" || q.layout === "titletext"
                  ? "Ajoutez une image ci-dessous : elle sera mise en avant. "
                  : ""}
                Sans chronomètre ni réponse. L’animateur décide quand poursuivre.
              </span>
            </label>
          )}
          <MediaEditor
            key={mediaKey}
            media={q.media}
            onChange={(media) => patch({ media })}
            onBusy={onBusy}
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
                        Clique sur l’image pour placer le centre. Les réponses dans le cercle sont acceptées.
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
                  Ajoutez une photo ci-dessus pour définir le support de cette question.
                </p>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}

const slideBodyLabel: Record<SlideLayout, string> = {
  classic: "Texte de la diapo",
  title: "Sous-titre (facultatif)",
  titletext: "Texte",
  bullets: "Les puces, une par ligne",
  quote: "Auteur (facultatif)",
  bigimage: "Texte (facultatif)",
};
