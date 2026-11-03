"use client";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Dialog } from "radix-ui";
import { useState } from "react";
import {
  BarChart3,
  Copy,
  Gauge,
  Lock,
  Play,
  Shuffle,
  Smartphone,
  SkipForward,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { FillSentence, MatchBoard, QuestionPlay, QuestionResults } from "@/components/squizz/question-play";
import { asksNothing } from "@/lib/question";
import { Wheel } from "./wheel";
import { MediaView } from "@/components/squizz/media";
import { FullscreenButton } from "@/components/squizz/fullscreen-button";
import { gameApi as api } from "@/lib/client/api";
import { leadingProfiles } from "@/lib/profiles";
import {
  type Game,
  Leaderboard,
  Podium,
  ProfileSpread,
  GameMark,
  TeamBoard,
  TeamPodium,
  TeamTag,
  finaleWords,
} from "./game-parts";
import { MAX_TEAMS, TEAMS } from "@/lib/teams";

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
        ? game.profileQuiz
          ? "LE PROFIL DU GROUPE"
          : "RÉSULTATS FINAUX"
        : `${q && asksNothing(q.type) ? "ÉTAPE" : "QUESTION"} ${game.index + 1} / ${game.total}`;
  return (
    <div className={`host-stage phase-${game.phase}`}>
      <header className="host-top">
        <div className="host-top-info">
          <span className="eyebrow">{step}</span>
          <strong>{game.title}</strong>
        </div>
        {q && !counting && !asksNothing(q.type) && game.phase === "question" && (
          <Timer seconds={remaining} total={game.duration} done={game.revealed} />
        )}
        <div className="host-top-side">
          {game.phase !== "finished" && <RemoteButton game={game} origin={props.origin} />}
          <FullscreenButton />
          <GameMark brand={game.brand} href="/app" />
        </div>
      </header>
      {game.phase === "lobby" ? (
        <Lobby {...props} />
      ) : game.phase === "finished" ? (
        game.profileQuiz ? (
          <ProfileFinale game={game} />
        ) : (
          <Finale game={game} />
        )
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

/**
 * Shows the secret link of the remote control as a QR code: the host scans it with their phone to drive
 * the game from anywhere in the room. Whoever has the link can drive the game, so it is never shown to
 * the players' screens and only opens on demand.
 */
function RemoteButton({ game, origin }: { game: Game; origin: string }) {
  const [link, setLink] = useState(""),
    [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const show = async () => {
    setOpen(true);
    if (link) return;
    try {
      const { token } = await api<{ token: string }>("remote", { code: game.code });
      setLink(`${origin}/telecommande/${game.code}#${token}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <>
      <button type="button" className="button secondary small host-remote" onClick={show}>
        <Gauge size={16} /> <span>Télécommande</span>
      </button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={`host-overlay ${themeOf(game)}`} />
          <Dialog.Content
            className={`host-modal remote-modal ${themeOf(game)}`}
            style={brandStyle(game)}
            aria-describedby="remote-help"
          >
            <div className="host-modal-head">
              <Dialog.Title className="host-modal-title">Piloter depuis votre téléphone</Dialog.Title>
              <Dialog.Close className="host-modal-close" aria-label="Fermer">
                <X size={22} />
              </Dialog.Close>
            </div>
            <div className="host-modal-body remote-modal-body">
              {error ? (
                <p className="error">{error}</p>
              ) : link ? (
                <div className="qr-sticker">
                  <QRCodeSVG value={link} size={240} level="M" marginSize={3} title="Télécommande" />
                </div>
              ) : (
                <p className="hint">Préparation du lien…</p>
              )}
              <p id="remote-help">
                Scannez ce code avec l’appareil photo de votre téléphone : vous pourrez lancer le quiz, passer
                à la suite, arrêter une question, lancer la roue et retirer un joueur, depuis n’importe où
                dans la salle.
              </p>
              <p className="hint">
                Toute personne qui scanne ce code peut piloter la partie : ouvrez-le avant de projeter
                l’écran, ou refermez-le dès que votre téléphone affiche la télécommande. Il ne sert que pour
                cette partie.
              </p>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

/** The pop-up windows open outside the game's frame: they carry its theme themselves. */
const themeOf = (game: Game) => (game.brand?.theme === "sober" ? "theme-sober" : "");
const brandStyle = (game: Game) =>
  game.brand?.theme === "sober" ? ({ "--brand": game.brand.accent } as React.CSSProperties) : undefined;

/** Removes a player from the lobby, after a confirmation: they cannot come back. */
function KickButton({ name, busy, onKick }: { name: string; busy: boolean; onKick: (name: string) => void }) {
  return (
    <button
      className="kick"
      disabled={busy}
      aria-label={`Retirer ${name} de la partie`}
      title="Retirer ce joueur"
      onClick={() => {
        if (confirm(`Retirer ${name} de la partie ? Ce joueur ne pourra pas revenir.`)) onKick(name);
      }}
    >
      <X size={14} />
    </button>
  );
}

function Lobby({ game, busy, run, settle, joinUrl, origin, onError }: Props) {
  const [copied, setCopied] = useState(false),
    [name, setName] = useState("");
  const address = origin.replace(/^https?:\/\//, "");
  const hostPlays = game.players.some((p) => p.me);
  const kick = (name: string) =>
    run(async () => {
      await api("kick", { code: game.code, name });
    });
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
          <div className="team-controls" role="group" aria-label="Mode équipes">
            <span className="eyebrow">ÉQUIPES</span>
            {[0, ...Array.from({ length: MAX_TEAMS - 1 }, (_, i) => i + 2)].map((n) => (
              <button
                key={n}
                type="button"
                className={(game.teams?.count ?? 0) === n ? "on" : ""}
                aria-pressed={(game.teams?.count ?? 0) === n}
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await api("teams", { code: game.code, count: n });
                  })
                }
              >
                {n ? n : "Seul"}
              </button>
            ))}
            {game.teams && (
              <button
                type="button"
                className="team-shuffle"
                disabled={busy || !game.players.length}
                onClick={() =>
                  run(async () => {
                    await api("shuffle", { code: game.code });
                  })
                }
              >
                <Shuffle size={15} /> Répartir au hasard
              </button>
            )}
          </div>
          {game.teams && game.players.length > 0 && (
            <div className="team-columns">
              {[...Array.from({ length: game.teams.count }, (_, i) => i), null].map((team) => {
                const members = game.players.filter((p) => (p.team ?? null) === team);
                if (team === null && !members.length) return null;
                return (
                  <div
                    key={team ?? "none"}
                    className={`team-column ${team === null ? "" : `team-${TEAMS[team]?.color ?? "electric"}`}`}
                  >
                    {team === null ? (
                      <span className="team-tag none">Sans équipe</span>
                    ) : (
                      <TeamTag team={team} />
                    )}
                    <small>{members.length}</small>
                    <ul>
                      {members.map((p) => (
                        <li key={p.name}>
                          <span>
                            {p.name}
                            {p.me ? " (vous)" : ""}
                          </span>
                          {!p.me && <KickButton name={p.name} busy={busy} onKick={kick} />}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
          {game.teams && game.players.length > 0 ? (
            <p className="hint team-hint">
              Chacun choisit son équipe sur son téléphone. Au lancement, ceux qui n’ont pas choisi rejoignent
              les équipes les moins remplies.
            </p>
          ) : game.players.length ? (
            <div className="host-chips">
              {game.players.map((p) => (
                <span className="player" key={p.name}>
                  {p.name}
                  {p.me ? " (vous)" : ""}
                  {!p.me && <KickButton name={p.name} busy={busy} onKick={kick} />}
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
            method="post"
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
  // A slide or the wheel: nothing to answer, the host moves on when ready.
  const slide = asksNothing(q.type);
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
  const nextLabel = last
    ? game.profileQuiz
      ? "Révéler le profil du groupe"
      : "Voir le podium"
    : slide
      ? "Continuer"
      : "Question suivante";
  return (
    <>
      <div className={`host-main host-question ${q.type === "slide" ? "is-slide" : ""}`} key={game.index}>
        {q.anonymous && (
          <span className="anonymous-badge host">
            <Lock size={18} aria-hidden /> Réponses anonymes
          </span>
        )}
        {q.type !== "slide" && <h1 className="host-question-title">{q.text}</h1>}
        {q.type === "wheel" ? (
          <div className="host-answers">
            <Wheel
              entries={game.wheel?.entries ?? []}
              spin={game.wheel?.spin ?? null}
              busy={busy}
              onSpin={() =>
                run(() =>
                  settle(
                    () =>
                      api("spin", {
                        code: game.code,
                        question: game.index,
                        after: game.wheel?.spin?.id ?? null,
                      }),
                    (g) => (g.wheel?.spin?.id ?? null) !== (game.wheel?.spin?.id ?? null),
                    "Lancement de la roue non confirmé : vérifiez la connexion, puis cliquez à nouveau.",
                  ),
                )
              }
            />
          </div>
        ) : SHOWN_AS_IS.includes(q.type) || hostPlays ? (
          <div className="host-answers">
            <QuestionPlay
              question={q}
              revealed={game.revealed}
              autoPlay
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
            <MediaView media={q.media} masked={q.type === "blindtest" && !game.revealed} autoPlay />
            {q.type === "fill" && q.fillParts && <FillSentence parts={q.fillParts} />}
            {q.type === "match" && <MatchBoard q={q} revealed={false} />}
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
          <Dialog.Overlay className={`host-overlay ${themeOf(game)}`} />
          <Dialog.Content
            className={`host-modal ${themeOf(game)}`}
            style={brandStyle(game)}
            aria-describedby={undefined}
          >
            <div className="host-modal-head">
              <div className="host-tabs" role="tablist">
                <button
                  role="tab"
                  aria-selected={tab === "results"}
                  onClick={() => setView({ index: game.index, tab: "results" })}
                >
                  <BarChart3 size={18} /> Réponses
                </button>
                {!game.profileQuiz && (
                  <button
                    role="tab"
                    aria-selected={tab === "ranking"}
                    onClick={() => setView({ index: game.index, tab: "ranking" })}
                  >
                    <Trophy size={18} /> Classement
                  </button>
                )}
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
                <QuestionResults question={q} aggregate={game.aggregate} players={game.players.length} host />
              ) : game.teams ? (
                <TeamBoard standings={game.teams.standings} />
              ) : (
                <Leaderboard players={game.players.slice(0, 5)} />
              )}
            </div>
            <div className="host-modal-foot">
              {game.profileQuiz ? (
                <span className="hint">Quiz à profils : pas de points, pas de classement.</span>
              ) : tab === "results" ? (
                <button
                  className="button secondary"
                  onClick={() => setView({ index: game.index, tab: "ranking" })}
                >
                  <Trophy size={18} /> Voir le classement
                </button>
              ) : (
                <span className="hint">
                  {game.teams
                    ? "Score d’une équipe : la moyenne de ses joueurs"
                    : game.players.length > 5
                      ? `Top 5 sur ${game.players.length} joueurs`
                      : ""}
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

/** The end of a profile quiz: the profile of the whole group, with nobody named or singled out. */
function ProfileFinale({ game }: { game: Game }) {
  const leaders = leadingProfiles(game.profiles?.shares ?? []);
  const voters = game.profiles?.voters ?? 0;
  return (
    <>
      <div className="host-main host-finale host-profiles">
        <span className="sticker pink-sticker">LE PORTRAIT DU GROUPE</span>
        <h1>Qui êtes-vous ?</h1>
        <p className="handnote">
          {leaders.length === 0
            ? "Pas encore de profil à afficher."
            : leaders.length === 1
              ? `Le profil du groupe : ${leaders[0]} !`
              : `En tête, à égalité : ${leaders.join(" et ")} !`}
        </p>
        <ProfileSpread game={game} />
      </div>
      <footer className="host-bottom">
        <span className="hint">
          {game.profiles?.total ?? 0} réponse{(game.profiles?.total ?? 0) > 1 ? "s" : ""} de {voters}{" "}
          participant
          {voters > 1 ? "s" : ""} sur {game.players.length} · un bilan du groupe, aucun résultat individuel
        </span>
        <div className="row">
          <Link className="button secondary" href="/app/resultats">
            <BarChart3 size={18} /> Résultats détaillés
          </Link>
          <Link className="button host-primary" href="/app">
            Retour à mes quiz
          </Link>
        </div>
      </footer>
    </>
  );
}

function Finale({ game }: { game: Game }) {
  const [full, setFull] = useState(false);
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
        <span className="sticker pink-sticker">{finaleWords(game).tag}</span>
        <h1>{finaleWords(game).title}</h1>
        <p className="handnote">{finaleWords(game).verdict}</p>
        {game.teams ? <TeamPodium standings={game.teams.standings} /> : <Podium players={game.players} />}
      </div>
      <footer className="host-bottom">
        <span className="hint">
          {game.total} étapes · {game.players.length} joueur{game.players.length > 1 ? "s" : ""}
        </span>
        <div className="row">
          <button className="button secondary" onClick={() => setFull(true)}>
            <Trophy size={18} /> Classement complet
          </button>
          <Link className="button secondary" href="/app/resultats">
            <BarChart3 size={18} /> Résultats détaillés
          </Link>
          <Link className="button host-primary" href="/app">
            Retour à mes quiz
          </Link>
        </div>
      </footer>
      <Dialog.Root open={full} onOpenChange={setFull}>
        <Dialog.Portal>
          <Dialog.Overlay className={`host-overlay ${themeOf(game)}`} />
          <Dialog.Content
            className={`host-modal ${themeOf(game)}`}
            style={brandStyle(game)}
            aria-describedby={undefined}
          >
            <div className="host-modal-head">
              <Dialog.Title className="host-modal-title">Tout le classement</Dialog.Title>
              <Dialog.Close className="host-modal-close" aria-label="Fermer">
                <X size={22} />
              </Dialog.Close>
            </div>
            <div className="host-modal-body">
              {game.teams && <TeamBoard standings={game.teams.standings} />}
              <Leaderboard players={game.players} />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
