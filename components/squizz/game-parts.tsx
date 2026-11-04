import { Lock, Trophy } from "lucide-react";
import { type PublicQuestion, type Aggregate, type AnswerPayload } from "@/lib/question";
import { leadingProfiles, type ProfileShare } from "@/lib/profiles";
import type { WheelSpin } from "./wheel";
import { TEAMS, teamName, type TeamStanding } from "@/lib/teams";
import type { Brand as GameBrand } from "@/lib/brand";
import { Brand } from "@/components/site/brand";
import { useSay, type Say } from "./voice";

export type RankedPlayer = {
  name: string;
  score: number;
  me: boolean;
  rank: number;
  movement: number | null;
  correctCount?: number;
  team?: number | null;
};
export type Game = {
  code: string;
  host: boolean;
  title: string;
  phase: string;
  index: number;
  total: number;
  totalScored: number;
  profileQuiz: boolean;
  profiles: { shares: ProfileShare[]; total: number; voters: number } | null;
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
  /** The wheel of the current step, once it is on screen. */
  wheel: { entries: string[]; spin: WheelSpin | null } | null;
  /** Questions from the audience (lib/server/qa.ts), when the wall is open or has questions. */
  qa: {
    open: boolean;
    moderated: boolean;
    questions: {
      id: string;
      text: string;
      author: string | null;
      status: "pending" | "visible" | "answered" | "hidden";
      votes: number;
      mine: boolean;
      voted: boolean;
    }[];
  } | null;
  /** « Replay at your own pace », opened by the host at the end of the game (/solo/<id>). */
  replay: string | null;
  /** How the screens look (lib/brand.ts). */
  brand: GameBrand;
  /** Team mode: the teams in ranking order, and the player's own team. */
  teams: { count: number; names?: string[]; standings: TeamStanding[]; mine: number | null } | null;
};

/**
 * The mark at the top of the game screens: the SQuizz logo, with the organisation's logo on a sticker next
 * to it when it has one; in the sober theme, the organisation's logo and, unless it is hidden, a discreet
 * « SQuizz ».
 */
export function GameMark({
  brand,
  href,
  className,
}: {
  brand: GameBrand | undefined;
  href: string | null;
  className?: string;
}) {
  if (brand?.theme !== "sober") {
    if (!brand?.logo) return <Brand href={href} className={className} />;
    return (
      <span className={`squizz-mark ${className?.includes("brand-big") ? "big" : ""}`}>
        <span className="squizz-mark-logo">
          <img src={brand.logo} alt="Logo de l’organisation" />
        </span>
        <Brand href={href} className={className} />
      </span>
    );
  }
  if (!brand.logo && !brand.credit) return null;
  return (
    <span className="sober-mark">
      {brand.logo && <img src={brand.logo} alt="Logo de l’organisation" />}
      {brand.logo && brand.credit && <i aria-hidden />}
      {brand.credit && <small>SQUIZZ</small>}
    </span>
  );
}

/** The words that close a game: festive with the SQuizz theme, neutral with the sober one. */
export function finaleWords(game: Game) {
  const sober = game.brand?.theme === "sober";
  const tie = game.players.filter((p) => p.rank === 1).length > 1;
  return {
    tag: sober ? "FIN DE LA PARTIE" : "FIN DU GAME",
    title: sober ? "Résultats" : "Place aux légendes.",
    verdict: game.teams
      ? teamVerdict(game.teams.standings)
      : tie
        ? sober
          ? "Égalité en tête."
          : "Ex æquo au sommet. Bien joué !"
        : sober
          ? `${game.players[0]?.name} termine en tête.`
          : `${game.players[0]?.name} prend la couronne !`,
  };
}

/** A team's colour badge with its name. */
export function TeamTag({ team, names, small = false }: { team: number; names?: string[]; small?: boolean }) {
  return (
    <span className={`team-tag team-${TEAMS[team]?.color ?? "electric"} ${small ? "small" : ""}`}>
      {teamName(team, names)}
    </span>
  );
}

/** The teams in ranking order: average score, size and places won or lost. */
export function TeamBoard({ standings, mine }: { standings: TeamStanding[]; mine?: number | null }) {
  const say = useSay();
  const best = Math.max(1, ...standings.map((t) => t.score));
  return (
    <ol className="team-board">
      {standings.map((t, i) => (
        <li
          key={t.index}
          className={`team-row team-${t.color} ${t.index === mine ? "is-mine" : ""}`}
          style={{ "--i": i } as React.CSSProperties}
        >
          <strong className="rank">{t.rank}</strong>
          <span className="team-row-name">
            {t.name}
            {t.index === mine ? say(" (ton équipe)", " (votre équipe)") : ""}
            <small>
              {t.players} joueur{t.players > 1 ? "s" : ""}
            </small>
          </span>
          <span className="team-row-bar" aria-hidden>
            <i style={{ width: `${(100 * t.score) / best}%` }} />
          </span>
          {t.movement !== null && (
            <span
              className={`movement ${t.movement > 0 ? "up" : t.movement < 0 ? "down" : "same"}`}
              aria-label={
                t.movement === 0
                  ? "Même place"
                  : `${t.movement > 0 ? "Gagne" : "Perd"} ${Math.abs(t.movement)} place${Math.abs(t.movement) > 1 ? "s" : ""}`
              }
            >
              {t.movement > 0 ? `▲ ${t.movement}` : t.movement < 0 ? `▼ ${-t.movement}` : "="}
            </span>
          )}
          <b>{t.score.toLocaleString("fr-FR")} pts</b>
        </li>
      ))}
    </ol>
  );
}

/** The final podium of the teams. */
export function TeamPodium({ standings, mine }: { standings: TeamStanding[]; mine?: number | null }) {
  const top = standings.filter((t) => t.rank <= 3);
  const order = top.length >= 2 ? [top[1], top[0], ...top.slice(2)] : top;
  return (
    <div className="podium team-podium" aria-label="Podium des équipes">
      {order.map((t) => (
        <div key={t.index} className={`podium-player place-${Math.min(t.rank, 3)} team-${t.color}`}>
          <span className="podium-name">
            {t.rank === 1 && <Trophy size={30} />} {t.name}
          </span>
          <div className="podium-step">
            <strong>{t.rank}</strong>
            <span>{t.score.toLocaleString("fr-FR")} pts</span>
            {t.index === mine && <b>TON ÉQUIPE !</b>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** How a team mode game ended, in one line. */
export function teamVerdict(standings: TeamStanding[]) {
  const winners = standings.filter((t) => t.rank === 1);
  return winners.length > 1
    ? `Égalité au sommet : ${winners.map((t) => t.name).join(" et ")} !`
    : `Victoire des ${winners[0]?.name.replace(/^Les /, "") ?? ""} !`;
}

export function Leaderboard({ players }: { players: Game["players"] }) {
  const say = useSay();
  return (
    <ol className="leaderboard">
      {players.map((p) => (
        <li key={p.name} className={`score-row ${p.me ? "is-me" : ""}`}>
          <span>
            <strong className="rank">{p.rank}</strong> {p.name}
            {p.me ? say(" (toi)", " (vous)") : ""}
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
export function rankMessage(rank: number, players: Pick<RankedPlayer, "rank">[], say: Say = (t) => t) {
  const count = players.length;
  const tied = players.filter((p) => p.rank === rank).length > 1;
  const last = Math.max(...players.map((p) => p.rank));
  if (count < 2) return say("Tu ouvres le bal : aux autres de te rattraper !", "Vous ouvrez le classement.");
  if (rank === 1)
    return tied
      ? say("En tête, à égalité : ça va se jouer à un cheveu !", "En tête, à égalité.")
      : say("Tu mènes la danse : tout le monde te court après !", "Vous êtes en tête du classement.");
  if (rank === 2)
    return say(
      "Dauphin du leader : une bonne réponse et tu passes devant.",
      "Deuxième place : une bonne réponse peut vous faire passer devant.",
    );
  if (rank === 3)
    return say("Sur le podium ! Accroche-toi, ça pousse derrière.", "Troisième place, sur le podium.");
  if (rank === last)
    return say(
      "Dernière place pour l’instant… la remontada commence maintenant !",
      "Dernière place pour l’instant : rien n’est joué.",
    );
  return say(
    `En embuscade à la ${rank}e place : un bon coup et tu grimpes.`,
    `${rank}e place : chaque bonne réponse vous fait progresser.`,
  );
}

export function PersonalResult({ game, final = false }: { game: Game; final?: boolean }) {
  const p = game.personal;
  const say = useSay();
  if (!p) return null;
  const message =
    p.outcome === "correct"
      ? "Bien joué !"
      : p.outcome === "opinion"
        ? say("Ta voix compte !", "Votre avis compte.")
        : p.outcome === "incorrect"
          ? say("Raté… mais rien n’est joué !", "Mauvaise réponse : rien n’est joué.")
          : say("Le chrono t’a devancé !", "Temps écoulé.");
  return (
    <div
      className={`personal-result ${p.outcome === "correct" || p.outcome === "opinion" || final ? "won" : "missed"}`}
      role="status"
    >
      <div>
        <p className="eyebrow">
          {final ? say("TON RÉSULTAT FINAL", "VOTRE RÉSULTAT FINAL") : say("TON RÉSULTAT", "VOTRE RÉSULTAT")}
        </p>
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
                ? say(
                    `Tu gagnes ${p.movement} place${p.movement > 1 ? "s" : ""} !`,
                    `Vous gagnez ${p.movement} place${p.movement > 1 ? "s" : ""}.`,
                  )
                : p.movement < 0
                  ? say(
                      `Tu recules de ${-p.movement} place${p.movement < -1 ? "s" : ""}. À toi de rebondir !`,
                      `Vous reculez de ${-p.movement} place${p.movement < -1 ? "s" : ""}.`,
                    )
                  : say("Tu gardes ta place. Garde le rythme !", "Vous gardez votre place.")}
        </span>
        {!final && <p className="rank-copy">{rankMessage(p.rank, game.players, say)}</p>}
        {game.teams && game.teams.mine !== null && (
          <p className="team-line">
            <TeamTag team={game.teams.mine} names={game.teams.names} small />{" "}
            {(() => {
              const t = game.teams.standings.find((s) => s.index === game.teams!.mine);
              return t ? `${t.rank}${t.rank === 1 ? "re" : "e"} sur ${game.teams.count}` : "";
            })()}
          </p>
        )}
      </div>
      <div className="place-sticker">
        <strong>#{p.rank}</strong>
        <span>{say("TA PLACE", "VOTRE PLACE")}</span>
        <small>SUR {game.players.length}</small>
      </div>
    </div>
  );
}

/** After a question of a profile quiz: the answer is in, nothing to win or lose. */
export function ProfileStep({ game }: { game: Game }) {
  const answered = game.personal?.outcome === "opinion";
  const say = useSay();
  return (
    <div className={`personal-result profile-step ${answered ? "won" : "missed"}`} role="status">
      <div>
        <p className="eyebrow">QUIZ À PROFILS</p>
        <h2>{answered ? "C’est noté !" : say("Le chrono t’a devancé !", "Temps écoulé.")}</h2>
        <p>
          {answered
            ? "Pas de bonne ni de mauvaise réponse : le profil du groupe se dessine."
            : say(
                "Ta voix manquera au profil du groupe sur cette question.",
                "Votre avis manquera au profil du groupe sur cette question.",
              )}
        </p>
        <span className="movement-copy">Le profil du groupe sera révélé à la fin.</span>
      </div>
    </div>
  );
}

/** How the answers of the whole group spread over the profiles, biggest first. */
export function ProfileSpread({ game }: { game: Game }) {
  const result = game.profiles;
  if (!result) return null;
  const shares = [...result.shares].sort((a, b) => b.votes - a.votes);
  const top = shares[0]?.votes ?? 0;
  return (
    <div className="profile-spread" aria-label="Répartition des réponses du groupe par profil">
      {shares.map((share, i) => (
        <div
          key={share.name}
          className={`profile-bar ${top > 0 && share.votes === top ? "leading" : ""}`}
          style={{ "--i": i, "--share": `${share.percent}%` } as React.CSSProperties}
        >
          <div className="profile-bar-label">
            <strong>{share.name}</strong>
            <span>
              {share.votes} réponse{share.votes > 1 ? "s" : ""}
            </span>
          </div>
          <div className="profile-bar-track">
            <i />
            <b>{share.percent} %</b>
          </div>
        </div>
      ))}
    </div>
  );
}

/** The profile of the whole group, the same on every phone: nobody gets a profile of their own. */
export function GroupProfile({ game }: { game: Game }) {
  const leaders = leadingProfiles(game.profiles?.shares ?? []);
  if (!leaders.length)
    return (
      <div className="personal-result missed" role="status">
        <div>
          <p className="eyebrow">LE PROFIL DU GROUPE</p>
          <h2>Pas assez de réponses</h2>
          <p>Il faut au moins une réponse pour dessiner le profil du groupe.</p>
        </div>
      </div>
    );
  return (
    <div className="personal-result won group-profile" role="status">
      <div>
        <p className="eyebrow">
          {leaders.length > 1 ? "LES PROFILS DU GROUPE, À ÉGALITÉ" : "LE PROFIL DU GROUPE"}
        </p>
        <h2>{leaders.join(" · ")}</h2>
        <span className="movement-copy">
          Calculé sur les réponses de tout le groupe · aucun résultat individuel
        </span>
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

/** Above an anonymous question on the phone: nobody will know who answered what. */
export function AnonymousBadge() {
  const say = useSay();
  return (
    <p className="anonymous-badge">
      <Lock size={15} aria-hidden />{" "}
      {say(
        "Réponse anonyme : personne ne saura ce que tu as répondu.",
        "Réponse anonyme : personne ne saura ce que vous avez répondu.",
      )}
    </p>
  );
}
