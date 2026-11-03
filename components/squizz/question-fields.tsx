"use client";
import { X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  canBeAnonymous,
  MAX_BLANKS,
  parseBlanks,
  questionGroups,
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
 * The fields of one quiz step, shown the same way in the editor and in the creation window.
 */
export function QuestionFields({
  q,
  patch,
  profileNames,
  mediaKey,
  setType,
  onBusy,
  onError,
}: {
  q: Question;
  patch: (value: Partial<Question>) => void;
  /** Set in a profile quiz: the profiles already named, offered for each answer of a poll. */
  profileNames?: string[];
  mediaKey: number | string;
  setType?: (type: QuestionType) => void;
  onBusy: (busy: boolean) => void;
  onError: (message: string) => void;
}) {
  return (
    <>
      {setType && (
        <Choice
          label="Type de question"
          value={q.type}
          options={questionTypes
            .filter((t) => !profileNames || !isScored(t.id))
            .map((t) => {
              const group = questionGroups.find((g) => g.label === t.group);
              return [
                t.id,
                t.label,
                undefined,
                group ? `${group.label} · ${group.tag.toLowerCase()}` : t.group,
              ];
            })}
          onChange={(v) => setType(v as QuestionType)}
        />
      )}
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
      {q.type !== "slide" && (
        <div className="question-settings">
          <Choice
            label="Temps imparti"
            value={String(q.duration)}
            options={durations.map((d) => [
              String(d),
              d < 60 ? `${d} secondes` : d === 90 ? "1 min 30 s" : `${d / 60} minute${d > 60 ? "s" : ""}`,
            ])}
            onChange={(v) => patch({ duration: Number(v) })}
          />{" "}
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
          {canBeAnonymous(q.type) && (
            <Choice
              label="Réponses"
              value={q.anonymous ? "anonymous" : "named"}
              options={[
                [
                  "named",
                  "Avec le pseudo",
                  "Les résultats gardés après la partie montrent la réponse de chacun.",
                ],
                [
                  "anonymous",
                  "Anonymes",
                  "Personne ne voit qui a répondu quoi : seuls les chiffres et les réponses sans nom sont gardés.",
                ],
              ]}
              onChange={(v) => patch({ anonymous: v === "anonymous" })}
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
      {["quiz", "truefalse", "poll", "puzzle"].includes(q.type) && (
        <section className="answer-editor">
          {profileNames && (
            <datalist id="quiz-profile-names">
              {profileNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          )}
          <h3>{q.type === "puzzle" ? "Les éléments dans le bon ordre" : "Les réponses"}</h3>
          <p className="hint">
            {q.type === "puzzle"
              ? "Saisissez l’ordre attendu. Les éléments seront mélangés pour les joueurs."
              : q.type === "poll"
                ? profileNames
                  ? "Pas de bonne ou de mauvaise réponse. Indiquez à droite le profil vers lequel pointe chaque réponse (laissez vide si elle ne compte pas)."
                  : "Pas de bonne ou de mauvaise réponse."
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
                onChange={(e) => patch({ options: q.options.map((v, k) => (k === j ? e.target.value : v)) })}
              />
              {profileNames && q.type === "poll" && (
                <input
                  className="option-profile"
                  aria-label={`Profil de la réponse ${j + 1}`}
                  placeholder="Profil"
                  list="quiz-profile-names"
                  maxLength={40}
                  value={q.profiles[j] ?? ""}
                  onChange={(e) =>
                    patch({
                      profiles: q.options.map((_, k) => (k === j ? e.target.value : (q.profiles[k] ?? ""))),
                    })
                  }
                />
              )}
              {q.type !== "truefalse" && q.options.length > 2 && (
                <button
                  type="button"
                  className="text-button"
                  aria-label={`Retirer la réponse ${j + 1}`}
                  onClick={() => {
                    const options = q.options.filter((_, k) => k !== j);
                    patch({
                      options,
                      correctAnswers: q.correctAnswers.filter((k) => k !== j).map((k) => (k > j ? k - 1 : k)),
                      profiles: q.profiles.filter((_, k) => k !== j),
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
              onClick={() => patch({ options: [...q.options, ""], order: [...q.order, q.options.length] })}
            >
              Ajouter une réponse
            </button>
          )}
        </section>
      )}
      {q.type === "fill" && <FillEditor q={q} patch={patch} />}
      {q.type === "match" && (
        <section className="answer-editor match-editor">
          <h3>Les paires</h3>
          <p className="hint">
            Écrivez chaque élément avec celui qui lui correspond. Les éléments de droite seront mélangés pour
            les joueurs.
          </p>
          {q.options.map((left, j) => (
            <div className="option-edit match-pair" key={j}>
              <span className="option-number">{j + 1}</span>
              <input
                aria-label={`Élément ${j + 1}`}
                placeholder="Ex. Italie"
                value={left}
                maxLength={100}
                required
                onChange={(e) => patch({ options: q.options.map((v, k) => (k === j ? e.target.value : v)) })}
              />
              <span className="match-link" aria-hidden>
                <i />
              </span>
              <input
                aria-label={`Correspondance de l’élément ${j + 1}`}
                placeholder="Ex. Rome"
                value={q.targets[q.order[j]] ?? ""}
                maxLength={100}
                required
                onChange={(e) =>
                  patch({ targets: q.targets.map((v, k) => (k === q.order[j] ? e.target.value : v)) })
                }
              />
              {q.options.length > 2 && (
                <button
                  type="button"
                  className="text-button"
                  aria-label={`Retirer la paire ${j + 1}`}
                  onClick={() => {
                    // Kept in the editor's order: target i belongs to option i.
                    const pairs = q.options
                      .map((o, k) => [o, q.targets[q.order[k]] ?? ""] as const)
                      .filter((_, k) => k !== j);
                    patch({
                      options: pairs.map((p) => p[0]),
                      targets: pairs.map((p) => p[1]),
                      order: pairs.map((_, k) => k),
                    });
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="button small secondary"
            disabled={q.options.length >= 6}
            onClick={() =>
              patch({
                options: [...q.options, ""],
                targets: [...q.targets, ""],
                order: [...q.order, q.targets.length],
              })
            }
          >
            Ajouter une paire
          </button>
        </section>
      )}
      {q.type === "blindtest" && (
        <p className="info-box">
          Ajoutez l’extrait plus bas : un fichier audio (MP3, M4A, OGG) ou un lien YouTube. Il est joué sur
          l’écran de l’animateur seulement, sans image ni titre ; les joueurs écrivent leur réponse sur leur
          téléphone. La diffusion de musique en public relève de vos droits (SACEM).
        </p>
      )}
      {["text", "blindtest"].includes(q.type) && (
        <label className="stack">
          {q.type === "blindtest"
            ? "Réponses acceptées : titre, artiste, variantes (une par ligne)"
            : "Réponses acceptées (une par ligne)"}
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
            <input value={q.minLabel} maxLength={40} onChange={(e) => patch({ minLabel: e.target.value })} />
          </label>
          <label>
            Libellé du maximum
            <input value={q.maxLabel} maxLength={40} onChange={(e) => patch({ maxLabel: e.target.value })} />
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
          De 0 à 10 : détracteurs (0–6), passifs (7–8), promoteurs (9–10). Le résultat NPS va de −100 à +100.
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
      {q.type !== "slide" && (
        <label className="stack explanation-field">
          Explication de la réponse (facultatif)
          <textarea
            value={q.explanation}
            maxLength={600}
            rows={3}
            placeholder={
              isScored(q.type)
                ? "Ex. Canberra a été choisie en 1908 comme compromis entre Sydney et Melbourne."
                : "Ex. Merci ! Vos avis nous aident à préparer la prochaine séance."
            }
            onChange={(e) => patch({ explanation: e.target.value })}
          />
          <span className="hint">
            Affichée avec la correction, sur l’écran et sur les téléphones. {q.explanation.length} / 600
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
                onChange={q.type === "pin" ? (point) => patch({ pin: { ...q.pin, ...point } }) : undefined}
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
            <p className="info-box">Ajoutez une photo ci-dessus pour définir le support de cette question.</p>
          )}
        </section>
      )}
    </>
  );
}

/** The text with its blanks between brackets, and a live look at what players will see. */
function FillEditor({ q, patch }: { q: Question; patch: (value: Partial<Question>) => void }) {
  const { parts, answers } = parseBlanks(q.body);
  return (
    <section className="answer-editor fill-editor">
      <h3>Le texte à compléter</h3>
      <p className="hint">
        Mettez chaque mot à trouver entre crochets : <code>[Paris]</code>. Plusieurs réponses acceptées ?
        Séparez-les par une barre : <code>[Rome|Roma]</code>. Majuscules et accents ne comptent pas.
      </p>
      <textarea
        aria-label="Texte à trous"
        rows={4}
        maxLength={1000}
        value={q.body}
        placeholder="Ex. La capitale de la France est [Paris] et celle de l’Italie est [Rome|Roma]."
        onChange={(e) => patch({ body: e.target.value })}
      />
      <p className={`fill-count ${answers.length ? "" : "empty"}`}>
        {answers.length
          ? `${answers.length} trou${answers.length > 1 ? "s" : ""} sur ${MAX_BLANKS} au plus`
          : "Aucun trou pour l’instant : mettez un mot entre crochets."}
      </p>
      {answers.length > 0 && (
        <p className="fill-sentence editor">
          {parts.map((part, i) => (
            <span key={i}>
              {part}
              {i < answers.length && <b title={answers[i].join(" / ")}>{answers[i][0] || "…"}</b>}
            </span>
          ))}
        </p>
      )}
    </section>
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
