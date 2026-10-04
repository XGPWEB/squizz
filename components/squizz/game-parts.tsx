import { Trophy } from "lucide-react";
import { type PublicQuestion, type Aggregate, type AnswerPayload } from "@/lib/question";

export type RankedPlayer = {
  name: string;
  score: number;
  me: boolean;
  rank: number;
  movement: number | null;
  correctCount?: number;
};
export type Game = {
  code: string;
  host: boolean;
  title: string;
  phase: string;
  index: number;
  total: number;
  totalScored: number;
  duration: number;
  remaining: number;
  revealed: boolean;
  maxPlayers: number;
  question: PublicQuestion | null;
  aggregate: Aggregate | null;
  players: RankedPlayer[];
  personal:
    | (RankedPlayer & { points: number; outcome: "correct" | "incorrect" | "timeout" | "opinion" | "slide" })
    | null;
  answered: number;
  myAnswer: { choice: number; answer: AnswerPayload; points?: number } | null;
  /** Milliseconds before the current question opens (the "Ready?" countdown). */
  startsIn: number;
  /** Local time at which this state was received, to run the timers between polls. */
  receivedAt: number;
};

export function Leaderboard({ players }: { players: Game["players"] }) {
  return (
    <ol className="leaderboard">
      {players.map((p) => (
        <li key={p.name} className={`score-row ${p.me ? "is-me" : ""}`}>
          <span>
            <strong className="rank">{p.rank}</strong> {p.name}
            {p.me ? " (toi)" : ""}
          </span>
          <span className="score-end">
            {p.movement !== null && (
              <span
                className={`movement ${p.movement > 0 ? "up" : p.movement < 0 ? "down" : "same"}`}
                aria-label={
                  p.movement === 0
                    ? "Même place"
                    : `${p.movement > 0 ? "Gagne" : "Perd"} ${Math.abs(p.movement)} place${Math.abs(p.movement) > 1 ? "s" : ""}`
                }
                title={p.movement === 0 ? "Même place" : undefined}
              >
                {p.movement > 0 ? `▲ ${p.movement}` : p.movement < 0 ? `▼ ${-p.movement}` : "="}
              </span>
            )}
            <strong>{p.score.toLocaleString("fr-FR")} pts</strong>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** A word for the player according to where they stand in the ranking, between two questions. */
export function rankMessage(rank: number, players: Pick<RankedPlayer, "rank">[]) {
  const count = players.length;
  const tied = players.filter((p) => p.rank === rank).length > 1;
  const last = Math.max(...players.map((p) => p.rank));
  if (count < 2) return "Tu ouvres le bal : aux autres de te rattraper !";
  if (rank === 1)
    return tied
      ? "En tête, à égalité : ça va se jouer à un cheveu !"
      : "Tu mènes la danse : tout le monde te court après !";
  if (rank === 2) return "Dauphin du leader : une bonne réponse et tu passes devant.";
  if (rank === 3) return "Sur le podium ! Accroche-toi, ça pousse derrière.";
  if (rank === last) return "Dernière place pour l’instant… la remontada commence maintenant !";
  return `En embuscade à la ${rank}e place : un bon coup et tu grimpes.`;
}

export function PersonalResult({ game, final = false }: { game: Game; final?: boolean }) {
  const p = game.personal;
  if (!p) return null;
  const message =
    p.outcome === "correct"
      ? "Bien joué !"
      : p.outcome === "opinion"
        ? "Ta voix compte !"
        : p.outcome === "incorrect"
          ? "Raté… mais rien n’est joué !"
          : "Le chrono t’a devancé !";
  return (
    <div
      className={`personal-result ${p.outcome === "correct" || p.outcome === "opinion" || final ? "won" : "missed"}`}
      role="status"
    >
      <div>
        <p className="eyebrow">{final ? "TON RÉSULTAT FINAL" : "TON RÉSULTAT"}</p>
        <h2>{final ? `${p.correctCount} / ${game.totalScored} bonnes réponses` : message}</h2>
        <p>
          {final
            ? `${p.score.toLocaleString("fr-FR")} points au total`
            : p.outcome === "opinion"
              ? "Réponse enregistrée · question sans points"
              : `+${p.points} points · ${p.score.toLocaleString("fr-FR")} au total`}
        </p>
        <span className="movement-copy">
          {final
            ? "Merci d’avoir joué !"
            : p.movement === null
              ? "Le classement est lancé."
              : p.movement > 0
                ? `Tu gagnes ${p.movement} place${p.movement > 1 ? "s" : ""} !`
                : p.movement < 0
                  ? `Tu recules de ${-p.movement} place${p.movement < -1 ? "s" : ""}. À toi de rebondir !`
                  : "Tu gardes ta place. Garde le rythme !"}
        </span>
        {!final && <p className="rank-copy">{rankMessage(p.rank, game.players)}</p>}
      </div>
      <div className="place-sticker">
        <strong>#{p.rank}</strong>
        <span>TA PLACE</span>
        <small>SUR {game.players.length}</small>
      </div>
    </div>
  );
}
export function Podium({ players }: { players: RankedPlayer[] }) {
  const top = players.filter((p) => p.rank <= 3);
  const order = top.length >= 2 ? [top[1], top[0], ...top.slice(2)] : top;
  return (
    <div className="podium" aria-label="Podium final">
      {order.map((p) => (
        <div key={p.name} className={`podium-player place-${Math.min(p.rank, 3)}`}>
          <span className="podium-name">
            {p.rank === 1 && <Trophy size={30} />} {p.name}
          </span>
          <div className="podium-step">
            <strong>{p.rank}</strong>
            <span>{p.score.toLocaleString("fr-FR")} pts</span>
            {p.me && <b>C’EST TOI !</b>}
          </div>
        </div>
      ))}
    </div>
  );
}
