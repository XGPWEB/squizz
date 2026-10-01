"use client";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { BarChart3, Copy, Play, Smartphone, SkipForward, Trophy, Users, X } from "lucide-react";
import { Brand } from "@/components/site/brand";
import { QuestionPlay, QuestionResults } from "@/components/squizz/question-play";
import { MediaView } from "@/components/squizz/media";
import { gameApi as api } from "@/lib/client/api";
import { type Game, Leaderboard, Podium } from "./game-parts";

/** Question types whose answers the projected screen can show as they are (the tiles, the slide, the map). */
const SHOWN_AS_IS = ["quiz", "truefalse", "poll", "slide", "pin", "pinpoll"];

type Props = {
  game: Game;
  busy: boolean;
  run: (task: () => Promise<void>) => void;
  /** Runs an action; when its outcome is uncertain, re-reads the game and succeeds if `done` holds. */
  settle: (action: () => Promise<unknown>, done: (g: Game) => boolean, message: string) => Promise<void>;
  joinUrl: string;
  origin: string;
  remaining: number;
  startsLeft: number;
  onError: (message: string) => void;
};

/**
 * The projected host screen. Everything fits in the window: the stage shows the current step, and
 * the results and rankings open in pop-up windows instead of stacking below.
 */
export function HostStage(props: Props) {
  const { game, remaining } = props;
  const q = game.question;
  const counting = game.phase === "question" && !q;
  const step =
    game.phase === "lobby"
      ? "SALLE D’ATTENTE"
      : game.phase === "finished"
        ? "RÉSULTATS FINAUX"
        : `${q?.type === "slide" ? "ÉTAPE" : "QUESTION"} ${game.index + 1} / ${game.total}`;
  return (
    <div className={`host-stage phase-${game.phase}`}>
      <header className="host-top">
        <div className="host-top-info">
          <span className="eyebrow">{step}</span>
          <strong>{game.title}</strong>
        </div>
        {q && !counting && q.type !== "slide" && game.phase === "question" && (
          <Timer seconds={remaining} total={game.duration} done={game.revealed} />
        )}
        <Brand href="/app" />
      </header>
      {game.phase === "lobby" ? (
        <Lobby {...props} />
      ) : game.phase === "finished" ? (
        <Finale game={game} />
      ) : counting ? (
        <div className="host-main host-countdown" role="status" aria-live="assertive">
          <strong>Prêt ?</strong>
          <span className="ready-number" key={Math.ceil(props.startsLeft / 1000)}>
            {Math.max(1, Math.ceil(props.startsLeft / 1000))}
          </span>
        </div>
      ) : (
        <Question {...props} />
      )}
    </div>
  );
}

function Timer({ seconds, total, done }: { seconds: number; total: number; done: boolean }) {
  const ratio = done ? 0 : Math.min(1, seconds / Math.max(1, total));
  return (
    <div
      className={`host-timer ${!done && seconds <= 5 ? "urgent" : ""}`}
      style={{ "--p": ratio } as React.CSSProperties}
      role="timer"
      aria-label={done ? "Temps écoulé" : `${seconds} secondes restantes`}
    >
      <span>{done ? "0" : seconds}</span>
    </div>
  );
}

function Lobby({ game, busy, run, settle, joinUrl, origin, onError }: Props) {
  const [copied, setCopied] = useState(false),
    [name, setName] = useState("");
  const address = origin.replace(/^https?:\/\//, "");
  const hostPlays = game.players.some((p) => p.me);
  return (
    <>
      <div className="host-main host-lobby">
        <section className="host-join" aria-label="Rejoindre la partie">
          <div className="host-join-text">
            <span className="eyebrow">POUR JOUER, ALLEZ SUR</span>
            <strong className="host-url">{address ? `${address}/jouer` : "…"}</strong>
            <span className="eyebrow">ET ENTREZ LE CODE</span>
            <div className="host-code" aria-label={`Code ${game.code}`}>
              {game.code.slice(0, 3)}
              <span> </span>
              {game.code.slice(3)}
            </div>
            <button
              className="button secondary small"
              onClick={() =>
                run(async () => {
                  if (!navigator.clipboard) return onError(`Copiez ce lien : ${joinUrl}`);
                  await navigator.clipboard.writeText(joinUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                })
              }
            >
              <Copy size={16} />
              {copied ? "Lien copié !" : "Copier l’invitation"}
            </button>
          </div>
          <div className="qr-sticker">
            {origin && (
              <QRCodeSVG
                value={joinUrl}
                size={260}
                level="M"
                marginSize={3}
                title="Scanner pour rejoindre cette partie SQuizz"
              />
            )}
            <strong>SCANNE & JOUE</strong>
          </div>
        </section>
        <section className="host-players" aria-label="Joueurs">
          <div className="host-count">
            <Users aria-hidden />
            <b key={game.players.length}>{game.players.length}</b>
            <span>
              joueur{game.players.length > 1 ? "s" : ""}
              <small> / {game.maxPlayers} max.</small>
            </span>
          </div>
          {game.players.length ? (
            <div className="host-chips">
              {game.players.map((p) => (
                <span className="player" key={p.name}>
                  {p.name}
                  {p.me ? " (vous)" : ""}
                  {!p.me && (
                    <button
                      className="kick"
                      disabled={busy}
                      aria-label={`Retirer ${p.name} de la partie`}
                      title="Retirer ce joueur"
                      onClick={() => {
                        if (confirm(`Retirer ${p.name} de la partie ? Ce joueur ne pourra pas revenir.`))
                          run(async () => {
                            await api("kick", { code: game.code, name: p.name });
                          });
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p className="host-empty">
              En attente des joueurs
              <span className="dots" aria-hidden>
                <i>.</i>
                <i>.</i>
                <i>.</i>
              </span>
            </p>
          )}
        </section>
      </div>
      <footer className="host-bottom">
        {hostPlays ? (
          <span className="hint">Vous jouez aussi depuis cet écran.</span>
        ) : (
          <form
            className="host-self-join"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await api("join", { code: game.code, name });
              });
            }}
          >
            <input
              aria-label="Votre pseudo pour jouer aussi"
              placeholder="Votre pseudo pour jouer aussi"
              required
              maxLength={24}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button disabled={busy} className="button secondary small">
              Jouer aussi
            </button>
          </form>
        )}
        <button
          className="button host-primary"
          disabled={busy || game.players.length === 0}
          onClick={() =>
            run(() =>
              settle(
                () => api("start", { code: game.code }),
                (g) => g.phase !== "lobby",
                "Lancement non confirmé : vérifiez la connexion, puis cliquez à nouveau.",
              ),
            )
          }
        >
          <Play size={20} /> Lancer le quiz
        </button>
      </footer>
    </>
  );
}

function Question({ game, busy, run, settle, remaining }: Props) {
  const q = game.question!;
  const slide = q.type === "slide";
  const hostPlays = game.players.some((p) => p.me);
  // The pop-up opens by itself when the answers are revealed; closing it keeps it closed for this step.
  const [closedAt, setClosedAt] = useState(-1),
    [view, setView] = useState<{ index: number; tab: "results" | "ranking" }>({ index: -1, tab: "results" });
  const open = game.revealed && !slide && closedAt !== game.index;
  const tab = view.index === game.index ? view.tab : "results";
  const last = game.index + 1 === game.total;
  const next = () =>
    run(() =>
      settle(
        () => api("next", { code: game.code, question: game.index }),
        (g) => g.phase === "finished" || g.index > game.index,
        "Passage à la suite non confirmé : vérifiez la connexion, puis cliquez à nouveau.",
      ),
    );
  const nextLabel = last ? "Voir le podium" : slide ? "Continuer" : "Question suivante";
  return (
    <>
      <div className={`host-main host-question ${slide ? "is-slide" : ""}`} key={game.index}>
        {!slide && <h1 className="host-question-title">{q.text}</h1>}
        {SHOWN_AS_IS.includes(q.type) || hostPlays ? (
          <div className="host-answers">
            <QuestionPlay
              question={q}
              revealed={game.revealed}
              disabled={busy || game.revealed || remaining === 0 || !hostPlays}
              submitted={game.myAnswer?.answer ?? null}
              onSubmit={(answer) =>
                run(async () => {
                  await settle(
                    () => api("answer", { code: game.code, question: game.index, answer }),
                    (g) => g.index === game.index && !!g.myAnswer,
                    "Réponse non confirmée : vérifiez la connexion, puis renvoyez-la.",
                  );
                })
              }
            />
          </div>
        ) : (
          <div className="host-answers">
            <MediaView media={q.media} />
            <p className="host-phones">
              <Smartphone aria-hidden />
              Répondez sur votre téléphone !
            </p>
          </div>
        )}
      </div>
      <footer className="host-bottom">
        {slide ? (
          <span />
        ) : (
          <div className="host-answered" aria-live="polite">
            <b key={game.answered}>{game.answered}</b>
            <span>
              / {game.players.length} réponse{game.players.length > 1 ? "s" : ""}
            </span>
            <i style={{ width: `${(100 * game.answered) / Math.max(1, game.players.length)}%` }} />
          </div>
        )}
        <div className="row">
          {game.revealed && !slide && (
            <button
              className="button secondary"
              onClick={() => {
                setClosedAt(-1);
                setView({ index: game.index, tab: "results" });
              }}
            >
              <BarChart3 size={18} /> Résultats
            </button>
          )}
          {(game.revealed || slide) && (
            <button className="button host-primary" disabled={busy} onClick={next}>
              <SkipForward size={20} /> {nextLabel}
            </button>
          )}
          {!game.revealed && !slide && (
            <span className="hint">Correction à la fin du temps ou dès que tout le monde a répondu.</span>
          )}
        </div>
      </footer>
      <Dialog.Root open={open} onOpenChange={(o) => !o && setClosedAt(game.index)}>
        <Dialog.Portal>
          <Dialog.Overlay className="host-overlay" />
          <Dialog.Content className="host-modal" aria-describedby={undefined}>
            <div className="host-modal-head">
              <div className="host-tabs" role="tablist">
                <button
                  role="tab"
                  aria-selected={tab === "results"}
                  onClick={() => setView({ index: game.index, tab: "results" })}
                >
                  <BarChart3 size={18} /> Réponses
                </button>
                <button
                  role="tab"
                  aria-selected={tab === "ranking"}
                  onClick={() => setView({ index: game.index, tab: "ranking" })}
                >
                  <Trophy size={18} /> Classement
                </button>
              </div>
              <Dialog.Close className="host-modal-close" aria-label="Fermer">
                <X size={22} />
              </Dialog.Close>
            </div>
            <Dialog.Title className="host-modal-title">
              {tab === "results" ? q.text : "Qui mène le jeu ?"}
            </Dialog.Title>
            <div className="host-modal-body" key={tab}>
              {tab === "results" ? (
                <QuestionResults question={q} aggregate={game.aggregate} players={game.players.length} />
              ) : (
                <Leaderboard players={game.players.slice(0, 5)} />
              )}
            </div>
            <div className="host-modal-foot">
              {tab === "results" ? (
                <button
                  className="button secondary"
                  onClick={() => setView({ index: game.index, tab: "ranking" })}
                >
                  <Trophy size={18} /> Voir le classement
                </button>
              ) : (
                <span className="hint">
                  {game.players.length > 5 ? `Top 5 sur ${game.players.length} joueurs` : ""}
                </span>
              )}
              <button className="button host-primary" disabled={busy} onClick={next}>
                <SkipForward size={20} /> {nextLabel}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

const CONFETTI = Array.from({ length: 36 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 9) * 0.35,
  duration: 3.2 + (i % 5) * 0.5,
  color: ["var(--acid)", "var(--pink)", "var(--electric)", "var(--orange)"][i % 4],
  tilt: (i * 47) % 360,
}));

function Finale({ game }: { game: Game }) {
  const [full, setFull] = useState(false);
  const tie = game.players.filter((p) => p.rank === 1).length > 1;
  return (
    <>
      <div className="host-main host-finale">
        <div className="confetti" aria-hidden>
          {CONFETTI.map((c, i) => (
            <i
              key={i}
              style={{
                left: `${c.left}%`,
                background: c.color,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
                rotate: `${c.tilt}deg`,
              }}
            />
          ))}
        </div>
        <span className="sticker pink-sticker">FIN DU GAME</span>
        <h1>Place aux légendes.</h1>
        <p className="handnote">
          {tie ? "Ex æquo au sommet. Bien joué !" : `${game.players[0]?.name} prend la couronne !`}
        </p>
        <Podium players={game.players} />
      </div>
      <footer className="host-bottom">
        <span className="hint">
          {game.total} étapes · {game.players.length} joueur{game.players.length > 1 ? "s" : ""}
        </span>
        <div className="row">
          <button className="button secondary" onClick={() => setFull(true)}>
            <Trophy size={18} /> Classement complet
          </button>
          <Link className="button host-primary" href="/app">
            Retour à mes quiz
          </Link>
        </div>
      </footer>
      <Dialog.Root open={full} onOpenChange={setFull}>
        <Dialog.Portal>
          <Dialog.Overlay className="host-overlay" />
          <Dialog.Content className="host-modal" aria-describedby={undefined}>
            <div className="host-modal-head">
              <Dialog.Title className="host-modal-title">Tout le classement</Dialog.Title>
              <Dialog.Close className="host-modal-close" aria-label="Fermer">
                <X size={22} />
              </Dialog.Close>
            </div>
            <div className="host-modal-body">
              <Leaderboard players={game.players} />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
