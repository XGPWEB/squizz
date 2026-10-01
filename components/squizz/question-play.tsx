"use client";
import { useState } from "react";
import { ArrowUp, ArrowDown, Check } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  type AnswerPayload,
  type PublicQuestion,
  type Aggregate,
  formatValue,
  isScored,
  safeMediaUrl,
  choiceStats,
} from "@/lib/question";
import { MediaView, PinImage } from "./media";
import { WordCloud } from "./word-cloud";
export function QuestionPlay({
  question: q,
  disabled,
  submitted,
  revealed,
  onSubmit,
}: {
  question: PublicQuestion;
  disabled: boolean;
  submitted: AnswerPayload | null;
  revealed: boolean;
  onSubmit: (answer: AnswerPayload) => void;
}) {
  const [choices, setChoices] = useState<number[]>([]),
    [text, setText] = useState(""),
    [value, setValue] = useState(q.min),
    [pin, setPin] = useState<{ x: number; y: number } | undefined>(),
    [order, setOrder] = useState(q.puzzleOrder ?? q.options.map((_, i) => i)),
    [ideas, setIdeas] = useState(["", "", ""]);
  const pinMedia = ["pin", "pinpoll"].includes(q.type) ? q.media.find((m) => m.kind === "image") : undefined;
  const selected = submitted?.choices ?? choices;
  const locked = disabled || !!submitted;
  const send = (answer: AnswerPayload) => {
    if (!locked) onSubmit(answer);
  };
  if (q.type === "slide") return <SlideView slide={q} />;
  return (
    <>
      <MediaView media={pinMedia ? q.media.filter((m) => m !== pinMedia) : q.media} />

      {["quiz", "truefalse", "poll"].includes(q.type) && (
        <>
          <p className="hint center">
            {q.multiple
              ? "Plusieurs choix possibles. Sélectionne tes réponses, puis valide."
              : "Sélectionne une réponse."}
            {q.points === "double" ? " · Points doubles !" : q.points === "none" ? " · Sans points" : ""}
          </p>
          <div className="answers">
            {q.options.map((opt, i) => (
              <button
                type="button"
                key={i}
                className={`answer ${selected.includes(i) ? "selected" : ""} ${revealed && q.correctAnswers?.includes(i) ? "correct" : ""}`}
                disabled={locked}
                aria-pressed={selected.includes(i)}
                onClick={() => {
                  if (q.multiple)
                    setChoices(selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i]);
                  else send({ choices: [i] });
                }}
              >
                <span className="answer-letter">{String.fromCharCode(65 + i)}</span>
                <span>{opt}</span>
                {(selected.includes(i) || (revealed && q.correctAnswers?.includes(i))) && <Check size={23} />}
              </button>
            ))}
          </div>
          {q.multiple && !submitted && !revealed && (
            <button disabled={locked || !choices.length} className="button" onClick={() => send({ choices })}>
              Valider {choices.length} réponse{choices.length > 1 ? "s" : ""}
            </button>
          )}
        </>
      )}
      {["text", "open", "wordcloud"].includes(q.type) && (
        <form
          method="post"
          className="response-form"
          onSubmit={(e) => {
            e.preventDefault();
            send({ text });
          }}
        >
          <label>
            {q.type === "wordcloud"
              ? "Ton mot ou ta courte expression"
              : q.type === "open"
                ? "Ton avis"
                : "Ta réponse"}
            {q.type === "open" ? (
              <textarea
                rows={4}
                value={submitted?.text ?? text}
                disabled={locked}
                maxLength={1000}
                onChange={(e) => setText(e.target.value)}
                required
              />
            ) : (
              <input
                value={submitted?.text ?? text}
                disabled={locked}
                maxLength={q.type === "wordcloud" ? 40 : 150}
                onChange={(e) => setText(e.target.value)}
                required
                autoComplete="off"
              />
            )}
          </label>
          {!submitted && !revealed && (
            <button className="button" disabled={locked || !text.trim()}>
              Envoyer ma réponse
            </button>
          )}
        </form>
      )}
      {["slider", "scale", "nps"].includes(q.type) && (
        <section className="numeric-answer">
          <strong className="numeric-value">{formatValue(submitted?.value ?? value, q.unit)}</strong>
          <Slider
            className="hub-slider"
            value={[submitted?.value ?? value]}
            min={q.min}
            max={q.max}
            step={q.step}
            disabled={locked}
            onValueChange={(v) => setValue(v[0])}
            aria-label="Ta valeur"
          />
          <div className="row spaced scale-ends">
            <span>
              <b>{formatValue(q.min, q.unit)}</b>
              {q.minLabel && <small>{q.minLabel}</small>}
            </span>
            <span>
              <b>{formatValue(q.max, q.unit)}</b>
              {q.maxLabel && <small>{q.maxLabel}</small>}
            </span>
          </div>
          <label className="exact-number">
            Ou saisis une valeur
            <input
              aria-label="Valeur précise"
              type="number"
              min={q.min}
              max={q.max}
              step={q.step}
              disabled={locked}
              value={submitted?.value ?? value}
              onChange={(e) => setValue(e.target.valueAsNumber)}
            />
          </label>
          {!submitted && !revealed && (
            <button
              className="button"
              disabled={locked || !Number.isFinite(value) || value < q.min || value > q.max}
              onClick={() => send({ value })}
            >
              Valider ma valeur
            </button>
          )}
        </section>
      )}
      {pinMedia && (
        <section className="pin-answer">
          <p className="hint">Touche l’image pour placer ton repère, puis valide.</p>
          <PinImage
            media={pinMedia}
            value={submitted?.x !== undefined ? { x: submitted.x, y: submitted.y! } : pin}
            onChange={setPin}
            disabled={locked}
          />
          {!submitted && !revealed && (
            <button className="button" disabled={locked || !pin} onClick={() => pin && send(pin)}>
              Valider mon repère
            </button>
          )}
        </section>
      )}
      {q.type === "puzzle" && (
        <section className="puzzle-answer">
          <p className="hint">Remets les éléments dans l’ordre avec les flèches, puis valide.</p>
          {(submitted?.order ?? order).map((id, i) => (
            <div className="puzzle-piece" key={id}>
              <b>{i + 1}</b>
              <span>{q.options[id]}</span>
              <button
                className="text-button"
                aria-label={`Monter ${q.options[id]}`}
                disabled={locked || i === 0}
                onClick={() => {
                  const next = [...order];
                  [next[i], next[i - 1]] = [next[i - 1], next[i]];
                  setOrder(next);
                }}
              >
                <ArrowUp size={20} />
              </button>
              <button
                className="text-button"
                aria-label={`Descendre ${q.options[id]}`}
                disabled={locked || i === order.length - 1}
                onClick={() => {
                  const next = [...order];
                  [next[i], next[i + 1]] = [next[i + 1], next[i]];
                  setOrder(next);
                }}
              >
                <ArrowDown size={20} />
              </button>
            </div>
          ))}
          {!submitted && !revealed && (
            <button className="button" disabled={locked} onClick={() => send({ order })}>
              Valider cet ordre
            </button>
          )}
        </section>
      )}
      {q.type === "brainstorm" && (
        <form
          method="post"
          className="response-form"
          onSubmit={(e) => {
            e.preventDefault();
            send({ ideas: ideas.filter((s) => s.trim()) });
          }}
        >
          <p>Propose jusqu’à trois idées.</p>
          {ideas.map((idea, i) => (
            <label key={i}>
              Idée {i + 1}
              <textarea
                rows={2}
                value={submitted?.ideas?.[i] ?? idea}
                maxLength={200}
                disabled={locked}
                onChange={(e) => setIdeas(ideas.map((v, j) => (j === i ? e.target.value : v)))}
              />
            </label>
          ))}
          {!submitted && !revealed && (
            <button className="button" disabled={locked || ideas.every((s) => !s.trim())}>
              Partager mes idées
            </button>
          )}
        </form>
      )}
    </>
  );
}

/** A slide never asks for an answer; each layout arranges the title, text and media differently. */
function SlideView({ slide: q }: { slide: PublicQuestion }) {
  const image = q.media.find((m) => m.kind === "image" && safeMediaUrl(m.url));
  const others = image ? q.media.filter((m) => m !== image) : q.media;
  const layout = q.layout ?? "classic";
  const sideImage = image && (
    <img className="slide-side-image" src={image.url} alt={image.caption || q.text} />
  );
  if (layout === "title")
    return (
      <div className={`slide slide-title ${image ? "with-image" : ""}`}>
        <div>
          <h2>{q.text}</h2>
          {q.body && <p className="slide-subtitle">{q.body}</p>}
        </div>
        {sideImage}
        {others.length > 0 && <MediaView media={others} />}
      </div>
    );
  if (layout === "quote")
    return (
      <figure className="slide slide-quote">
        {image && <img className="slide-avatar" src={image.url} alt={image.caption || q.body || "Auteur"} />}
        <blockquote>{q.text}</blockquote>
        {q.body && <figcaption>— {q.body}</figcaption>}
        {others.length > 0 && <MediaView media={others} />}
      </figure>
    );
  if (layout === "bigimage") {
    const hero = q.media.find((m) => ["image", "video"].includes(m.kind) && safeMediaUrl(m.url));
    const rest = hero ? q.media.filter((m) => m !== hero) : q.media;
    return (
      <div className="slide slide-bigimage">
        {hero ? (
          <figure className="slide-hero">
            {hero.kind === "image" ? (
              <img src={hero.url} alt={hero.caption || q.text} />
            ) : (
              <video
                src={hero.url}
                controls
                autoPlay
                muted
                loop
                playsInline
                aria-label={hero.caption || q.text}
              />
            )}
            <figcaption>{q.text}</figcaption>
          </figure>
        ) : (
          <h2 className="question-title">{q.text}</h2>
        )}
        {q.body && <div className="slide-body">{q.body}</div>}
        <MediaView media={rest} />
      </div>
    );
  }
  if (layout === "titletext")
    return (
      <div className={`slide slide-titletext ${image ? "with-image" : ""}`}>
        <div>
          <h2>{q.text}</h2>
          {q.body && <div className="slide-body">{q.body}</div>}
        </div>
        {sideImage}
        {others.length > 0 && <MediaView media={others} />}
      </div>
    );
  if (layout === "bullets") {
    const bullets = q.body
      .split("\n")
      .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
      .filter(Boolean);
    return (
      <div className={`slide slide-bullets ${image ? "with-image" : ""}`}>
        <div>
          <h2>{q.text}</h2>
          <ul>
            {bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
        {sideImage}
        {others.length > 0 && <MediaView media={others} />}
      </div>
    );
  }
  return (
    <div className="slide">
      <h2 className="question-title">{q.text}</h2>
      <MediaView media={q.media} />
      {q.body && <div className="slide-body">{q.body}</div>}
    </div>
  );
}
export function QuestionResults({
  question: q,
  aggregate: a,
  players,
  host = false,
}: {
  question: PublicQuestion;
  aggregate: Aggregate | null;
  /** Number of players in the game, to show the participation rate. */
  players?: number;
  /** The host can download the word cloud as an image. */
  host?: boolean;
}) {
  if (q.type === "slide") return null;
  const stats = a ? choiceStats(a.counts, a.responses, players) : null;
  const pinMedia = q.media.find((m) => m.kind === "image");
  return (
    <section className="question-results">
      <h3>{isScored(q.type) ? "La correction" : "Les réponses"}</h3>
      {q.explanation && <Explanation text={q.explanation} />}
      {["quiz", "truefalse"].includes(q.type) && (
        <p className="info-box">
          Bonne{(q.correctAnswers?.length ?? 0) > 1 ? "s" : ""} réponse
          {(q.correctAnswers?.length ?? 0) > 1 ? "s" : ""} :{" "}
          <strong>{q.correctAnswers?.map((i) => q.options[i]).join(" · ")}</strong>
        </p>
      )}
      {q.type === "text" && (
        <p className="info-box">
          Réponse{(q.accepted?.length ?? 0) > 1 ? "s" : ""} acceptée{(q.accepted?.length ?? 0) > 1 ? "s" : ""}{" "}
          : <strong>{q.accepted?.join(" · ")}</strong>
        </p>
      )}
      {q.type === "slider" && (
        <p className="info-box">
          Valeur attendue : <strong>{formatValue(q.target ?? 0, q.unit)}</strong>
          {!!q.tolerance && ` (tolérance ±${formatValue(q.tolerance, q.unit)})`}
        </p>
      )}
      {q.type === "puzzle" && (
        <ol className="puzzle-solution">
          {q.order?.map((i) => (
            <li key={i}>{q.options[i]}</li>
          ))}
        </ol>
      )}
      {["pin", "pinpoll"].includes(q.type) && pinMedia && (
        <>
          <PinImage
            media={pinMedia}
            value={q.type === "pin" ? q.pin : undefined}
            radius={q.type === "pin" ? q.pin?.radius : undefined}
            points={a?.pins ?? []}
          />
          <p className="hint">
            {q.type === "pin" ? "La zone verte indique la réponse attendue. " : ""}Les repères numérotés
            montrent les réponses du groupe.
          </p>
        </>
      )}
      {a && (
        <>
          <p className="hint">
            {a.responses} réponse{a.responses > 1 ? "s" : ""} reçue{a.responses > 1 ? "s" : ""}
            {stats?.participation != null && players
              ? ` sur ${players} joueur${players > 1 ? "s" : ""} (${stats.participation} % de participation)`
              : ""}
          </p>
          {q.type === "poll" && stats && (
            <div className="stats-row poll-stats">
              <div>
                <span>Réponses</span>
                <strong>{a.responses}</strong>
              </div>
              {stats.participation != null && (
                <div>
                  <span>Participation</span>
                  <strong>{stats.participation} %</strong>
                </div>
              )}
              <div>
                <span>{stats.leaders.length > 1 ? "Ex æquo en tête" : "En tête"}</span>
                <strong className="poll-leader">
                  {stats.leaders.length ? stats.leaders.join(" · ") : "—"}
                </strong>
              </div>
            </div>
          )}
          {["quiz", "truefalse", "poll"].includes(q.type) && stats && (
            <div className="distribution">
              {stats.rows.map((c, i) => (
                <div key={i} className={q.type === "poll" && c.leading ? "leading" : undefined}>
                  <div className="row spaced">
                    <span>{c.label}</span>
                    <b>
                      {c.count} <small>vote{c.count > 1 ? "s" : ""}</small> · {c.percent} %
                    </b>
                  </div>
                  <div className="bar-track">
                    <span style={{ width: `${c.percent}%` }} />
                  </div>
                </div>
              ))}
              {q.multiple && (
                <p className="hint">
                  Plusieurs réponses possibles : les pourcentages sont calculés sur le nombre de personnes
                  ayant répondu, leur total peut dépasser 100 %.
                </p>
              )}
            </div>
          )}
          {["slider", "scale", "nps"].includes(q.type) && (
            <>
              <div className="stats-row">
                <div>
                  <span>Moyenne</span>
                  <strong>
                    {a.average === null
                      ? "—"
                      : a.average.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
                  </strong>
                </div>
                {q.type === "nps" && (
                  <div>
                    <span>Score NPS</span>
                    <strong>{a.nps === null ? "—" : a.nps > 0 ? `+${a.nps}` : a.nps}</strong>
                  </div>
                )}
              </div>
              <div className="distribution">
                {a.values.map((v) => (
                  <div key={v.value}>
                    <div className="row spaced">
                      <span>{v.value}</span>
                      <b>
                        {v.count} vote{v.count > 1 ? "s" : ""} · {Math.round((100 * v.count) / a.responses)} %
                      </b>
                    </div>
                    <div className="bar-track">
                      <span style={{ width: `${(100 * v.count) / a.responses}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {q.type === "wordcloud" && (
            <WordCloud words={a.texts} title={q.text} responses={a.responses} canDownload={host} />
          )}
          {["open", "brainstorm", "text"].includes(q.type) && (
            <div className="idea-board">
              {a.texts.map((t, i) => (
                <article key={i}>
                  <p>{t.label}</p>
                  {t.count > 1 && <b>{t.count} personnes</b>}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** The author's explanation of the answer, shown with the correction. */
export function Explanation({ text }: { text: string }) {
  return (
    <aside className="explanation" aria-label="Explication">
      <b>L’EXPLICATION</b>
      <p>{text}</p>
    </aside>
  );
}
