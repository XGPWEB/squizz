"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
import { Lock, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { QuestionPlay, QuestionResults } from "@/components/squizz/question-play";
import {
  type Game,
  Leaderboard,
  GroupProfile,
  PersonalResult,
  Podium,
  ProfileSpread,
  ProfileStep,
  GameMark,
  TeamBoard,
  TeamPodium,
  TeamTag,
  finaleWords,
} from "./game-parts";
import { HostStage } from "./host-stage";
import { Wheel } from "./wheel";
import { QaPlayer } from "./qa";
import { asksNothing } from "@/lib/question";
import { invitationOrigin } from "@/lib/invitation";
import { gameApi as api, getJson, UncertainError } from "@/lib/client/api";

const LOST = "Connexion perdue, reconnexion…";

/**
 * The live game for hosts and players. Polls the server state: every 0.9 s during a question,
 * every 1.5 s in the lobby, not at all once the game is over or while the tab is hidden.
 */
export function GameView({ code }: { code: string }) {
  const [game, setGame] = useState<Game | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [clock, setClock] = useState(() => Date.now());
  // Read on the client only; the server render has no window (empty until hydration).
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => invitationOrigin(location.origin, process.env.NEXT_PUBLIC_LAN_HOST ?? ""),
    () => "",
  );
  // Once the answers are in, the player's own result and place are at the top of the phone: brought into view.
  const revealedStep = game && !game.host && game.revealed ? game.index : -1;
  useEffect(() => {
    if (revealedStep >= 0) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [revealedStep]);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = (ms: number) => {
      if (active) timer = setTimeout(poll, ms);
    };
    async function poll() {
      if (!active || document.hidden) return; // resumed by the visibility listener
      let next = 900;
      try {
        // A phone switching networks can hang a request: give up after 5 s and try again.
        const r = await fetch(`/api/game?action=state&code=${code}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        });
        const d = await r.json().catch(() => null);
        if (!r.ok || !d) {
          if (r.status === 403 || r.status === 404) {
            if (active) setError(d?.error ?? "Cette partie est introuvable.");
            return; // nothing more to wait for
          }
          throw new Error(d?.error ?? LOST);
        }
        if (!active) return;
        setGame({ ...d, receivedAt: Date.now() });
        setError("");
        if (d.phase === "finished") return;
        next = d.phase === "lobby" ? 1500 : d.startsIn > 0 ? Math.min(900, d.startsIn + 60) : 900;
      } catch (e) {
        if (active)
          setError(e instanceof TypeError || e instanceof DOMException ? LOST : (e as Error).message);
        next = 2000;
      }
      schedule(next);
    }
    const onVisibility = () => {
      if (document.hidden) return;
      clearTimeout(timer);
      poll();
    };
    document.addEventListener("visibilitychange", onVisibility);
    poll();
    const tick = setInterval(() => setClock(Date.now()), 200);
    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [code]);
  /** Reads the game once (after an uncertain action), and shows it. */
  async function loadState() {
    const d = await getJson<Omit<Game, "receivedAt">>(`/api/game?action=state&code=${code}`, 5000);
    const fresh = { ...d, receivedAt: Date.now() } as Game;
    setGame(fresh);
    return fresh;
  }
  /**
   * Runs a game action. If the connection drops before the answer, the game is re-read: when it shows the
   * action happened, all is well; otherwise a clear message invites to try again (the server ignores a
   * second answer, start or « next » for the same step, so trying again is always safe).
   */
  async function settle(action: () => Promise<unknown>, done: (g: Game) => boolean, message: string) {
    try {
      await action();
    } catch (e) {
      if (!(e instanceof UncertainError)) throw e;
      const fresh = await loadState().catch(() => null);
      if (!fresh || !done(fresh)) throw new Error(message);
    }
  }
  async function run(task: () => Promise<void>) {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await task();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const elapsed = game ? Math.max(0, clock - game.receivedAt) : 0;
  const startsLeft = game ? Math.max(0, game.startsIn - elapsed) : 0;
  // A slide or the wheel: nothing to answer on the phone.
  const silent = !!game?.question && asksNothing(game.question.type);
  const remaining = game
    ? Math.max(0, Math.ceil((game.remaining - Math.max(0, elapsed - game.startsIn)) / 1000))
    : 0;
  const joinUrl = `${origin}/jouer?code=${code}`;
  const brand = game?.brand;
  return (
    <div
      className={`game-theme theme-${brand?.theme ?? "squizz"}`}
      style={brand ? ({ "--brand": brand.accent } as React.CSSProperties) : undefined}
    >
      {error && (
        <div className="error" role="alert">
          {error}{" "}
          <button className="text-button" onClick={() => setError("")} aria-label="Fermer le message">
            <X size={16} />
          </button>
        </div>
      )}
      {!game && !error && (
        <div className="panel center" role="status">
          Connexion à la partie…
        </div>
      )}
      {!game && error && (
        <div className="center" style={{ marginTop: 20 }}>
          <Link className="button" href="/jouer">
            Rejoindre une autre partie
          </Link>
        </div>
      )}
      {game?.host ? (
        <HostStage
          game={game}
          busy={busy}
          run={run}
          settle={settle}
          joinUrl={joinUrl}
          origin={origin}
          remaining={remaining}
          startsLeft={startsLeft}
          onError={setError}
        />
      ) : game && game.phase === "lobby" ? (
        <PlayerWaiting
          game={game}
          busy={busy}
          onPickTeam={(team) =>
            run(async () => {
              await settle(
                () => api("team", { code, team }),
                (g) => g.teams?.mine === team,
                "Choix d’équipe non confirmé : vérifie ta connexion, puis touche à nouveau.",
              );
            })
          }
        />
      ) : (
        game && (
          <>
            <div className="play-top">
              <GameMark brand={game.brand} href={null} />
            </div>
            <section className={`panel game-panel ${game.phase === "finished" ? "final-panel" : ""}`}>
              {game.phase === "finished" && game.profileQuiz ? (
                <>
                  <div className="center final-heading">
                    <span className="sticker pink-sticker">LE PORTRAIT DU GROUPE</span>
                    <h1>Et votre profil est…</h1>
                  </div>
                  <GroupProfile game={game} />
                  <div className="section-heading">
                    <h2>Dans le détail</h2>
                    <span className="eyebrow">
                      {game.profiles?.total ?? 0} RÉPONSE{(game.profiles?.total ?? 0) > 1 ? "S" : ""}
                    </span>
                  </div>
                  <ProfileSpread game={game} />
                  <div className="center" style={{ marginTop: 25 }}>
                    <Link className="button" href="/">
                      On remet ça ?
                    </Link>
                  </div>
                </>
              ) : game.phase === "finished" ? (
                <>
                  <div className="center final-heading">
                    <span className="sticker pink-sticker">{finaleWords(game).tag}</span>
                    <h1>{finaleWords(game).title}</h1>
                    <p className="handnote">{finaleWords(game).verdict}</p>
                  </div>
                  {game.teams ? (
                    <TeamPodium standings={game.teams.standings} mine={game.teams.mine} />
                  ) : (
                    <Podium players={game.players} />
                  )}
                  {game.personal && <PersonalResult game={game} final />}
                  <div className="section-heading">
                    <h2>{game.teams ? "Les joueurs" : "Tout le classement"}</h2>
                    <span className="eyebrow">
                      {game.total} QUESTIONS · {game.players.length} JOUEURS
                    </span>
                  </div>
                  <Leaderboard players={game.players} />
                  <div className="center" style={{ marginTop: 25 }}>
                    <Link className="button" href="/">
                      On remet ça ?
                    </Link>
                  </div>
                </>
              ) : !game.question ? (
                // "Ready?" countdown: the question opens at the same moment on every screen.
                <div className="ready-countdown" role="status" aria-live="assertive">
                  <span className="eyebrow">
                    ÉTAPE {game.index + 1} / {game.total}
                  </span>
                  <strong>Prêt ?</strong>
                  <span className="ready-number" key={Math.ceil(startsLeft / 1000)}>
                    {Math.max(1, Math.ceil(startsLeft / 1000))}
                  </span>
                </div>
              ) : (
                <>
                  <div className="row spaced" style={{ marginTop: 22 }}>
                    <span>
                      {silent ? "Étape" : "Question"} {game.index + 1} / {game.total}
                    </span>
                    <span className="timer">
                      {silent
                        ? game.question?.type === "wheel"
                          ? "Roue"
                          : "Diapo"
                        : game.revealed
                          ? "Terminé"
                          : `${remaining} s`}
                    </span>
                  </div>
                  <Progress
                    value={game.revealed ? 0 : (remaining / game.duration) * 100}
                    className="question-progress"
                    aria-label="Temps restant"
                  />
                  {/* Each player's own result and place, first thing on the phone once the answers are in. */}
                  {game.revealed &&
                    game.personal &&
                    !silent &&
                    (game.profileQuiz ? <ProfileStep game={game} /> : <PersonalResult game={game} />)}
                  {game.question?.anonymous && (
                    <p className="anonymous-badge">
                      <Lock size={15} aria-hidden /> Réponse anonyme : personne ne saura ce que tu as répondu.
                    </p>
                  )}
                  {game.question && game.question.type !== "slide" && (
                    <h2 className="question-title" aria-live="polite">
                      {game.question?.text}
                    </h2>
                  )}
                  {game.question && (
                    <QuestionPlay
                      key={`${code}-${game.index}`}
                      question={game.question}
                      revealed={game.revealed}
                      disabled={busy || game.revealed || remaining === 0 || !game.players.some((p) => p.me)}
                      submitted={game.myAnswer?.answer ?? null}
                      onSubmit={(answer) =>
                        run(async () => {
                          await settle(
                            () => api("answer", { code, question: game.index, answer }),
                            (g) => g.index === game.index && !!g.myAnswer,
                            "Réponse non confirmée : vérifie ta connexion, puis renvoie-la.",
                          );
                          setGame((g) =>
                            g ? { ...g, myAnswer: { choice: answer.choices?.[0] ?? -1, answer } } : g,
                          );
                        })
                      }
                    />
                  )}{" "}
                  {game.question?.type === "wheel" && (
                    <Wheel
                      size="phone"
                      entries={game.wheel?.entries ?? []}
                      spin={game.wheel?.spin ?? null}
                      me={game.players.find((p) => p.me)?.name}
                    />
                  )}
                  {!silent && (
                    <p className="center hint" role="status">
                      {game.myAnswer && !game.revealed
                        ? "Réponse envoyée. On attend les autres…"
                        : `${game.answered} / ${game.players.length} réponses reçues`}
                    </p>
                  )}
                  {game.revealed && (
                    <>
                      {game.question && (
                        <QuestionResults
                          question={game.question}
                          aggregate={game.aggregate}
                          players={game.players.length}
                        />
                      )}{" "}
                      {!silent && !game.profileQuiz && (
                        <>
                          <h2 style={{ marginTop: 24 }}>Qui mène le jeu ?</h2>
                          {game.teams && (
                            <TeamBoard standings={game.teams.standings} mine={game.teams.mine} />
                          )}
                          <Leaderboard players={game.players} />
                        </>
                      )}
                      <p className="center lead">L’animateur prépare la suite…</p>
                    </>
                  )}
                </>
              )}
            </section>
          </>
        )
      )}
      {game && !game.host && (
        <QaPlayer
          game={game}
          busy={busy}
          send={(action, data) =>
            run(async () => {
              await api(action, { code, ...data });
            })
          }
        />
      )}
    </div>
  );
}

/** What a player sees once registered, until the host starts the quiz. */
function PlayerWaiting({
  game,
  busy,
  onPickTeam,
}: {
  game: Game;
  busy: boolean;
  onPickTeam: (team: number) => void;
}) {
  const me = game.players.find((p) => p.me);
  const others = game.players.length - (me ? 1 : 0);
  return (
    <div className="play-waiting" role="status" aria-live="polite">
      <GameMark brand={game.brand} href={null} className="brand-live brand-big" />
      {me ? (
        <>
          <h1>
            {game.brand?.theme === "sober" ? "Bienvenue, " : "C’est bon, "}
            <span>{me.name}</span>
            {game.brand?.theme === "sober" ? "." : " !"}
          </h1>
          <p className="lead">Tu es bien inscrit·e à la partie.</p>
          <p className="play-waiting-note">
            On attend tous les joueurs
            <span className="dots" aria-hidden>
              <i>.</i>
              <i>.</i>
              <i>.</i>
            </span>
          </p>
          {game.teams && (
            <section className="team-picker" aria-label="Choisis ton équipe">
              <h2>{game.teams.mine === null ? "Choisis ton équipe" : "Ton équipe"}</h2>
              <div>
                {Array.from({ length: game.teams.count }, (_, team) => {
                  const size = game.players.filter((p) => p.team === team).length;
                  return (
                    <button
                      key={team}
                      type="button"
                      disabled={busy}
                      aria-pressed={game.teams!.mine === team}
                      className={game.teams!.mine === team ? "on" : ""}
                      onClick={() => onPickTeam(team)}
                    >
                      <TeamTag team={team} />
                      <small>
                        {size} joueur{size > 1 ? "s" : ""}
                      </small>
                    </button>
                  );
                })}
              </div>
              {game.teams.mine === null && (
                <p className="hint">Sinon, l’animateur te placera au lancement.</p>
              )}
            </section>
          )}
          <p className="hint">
            {others === 0
              ? "Tu es le premier joueur arrivé."
              : `${others} autre${others > 1 ? "s" : ""} joueur${others > 1 ? "s" : ""} avec toi.`}{" "}
            L’animateur va lancer le quiz.
          </p>
        </>
      ) : (
        <>
          <h1>Presque prêt !</h1>
          <p className="lead">Choisis un pseudo pour rejoindre cette partie.</p>
          <Link className="button" href={`/jouer?code=${game.code}`}>
            Rejoindre la partie
          </Link>
        </>
      )}
    </div>
  );
}
