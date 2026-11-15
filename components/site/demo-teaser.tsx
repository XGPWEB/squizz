import Link from "next/link";
import { Check, Play } from "lucide-react";

/**
 * Home page, under « Comment ça marche ? »: the player's screen as it really looks (the game's own classes:
 * .answers, .answer, .leaderboard, .score-row) and one button to play the demo. Few words on purpose: the
 * picture explains, the demo convinces. The names are the demo's fictional players, not testimonials.
 */
export function DemoTeaser() {
  return (
    <section className="demo-teaser" aria-labelledby="demo-teaser-title" data-reveal="up">
      <div className="demo-teaser-copy">
        <p className="eyebrow">DÉMO · 2 MIN · SANS INSCRIPTION</p>
        <h2 id="demo-teaser-title">Jouez une partie, là, maintenant.</h2>
        <Link className="button dark" href="/demo" data-conversion="demo_cta_click">
          <Play size={18} aria-hidden /> Essayer une démo
        </Link>
      </div>
      <figure className="demo-shot">
        <div
          className="demo-phone"
          role="img"
          aria-label="Écran d’un joueur : une question vrai ou faux avec sa correction, puis le classement."
        >
          <div className="demo-phone-top" aria-hidden="true">
            <span>Question 1 / 5</span>
            <span className="timer">Terminé</span>
          </div>
          <p className="demo-phone-question" aria-hidden="true">
            La Grande Muraille est visible à l’œil nu depuis la Lune.
          </p>
          <div className="answers" aria-hidden="true">
            <span className="answer">
              <span className="answer-letter">A</span> Vrai
            </span>
            <span className="answer selected correct">
              <span className="answer-letter">B</span> Faux <Check size={18} />
            </span>
          </div>
        </div>
        <ol className="leaderboard demo-board" aria-hidden="true">
          <li className="score-row is-me">
            <span>
              <strong className="rank">1</strong> Toi
            </span>
            <span className="score-end">
              <span className="movement up">▲ 2</span> 1 875 pts
            </span>
          </li>
          <li className="score-row">
            <span>
              <strong className="rank">2</strong> Nova
            </span>
            <span className="score-end">
              <span className="movement down">▼ 1</span> 1 700 pts
            </span>
          </li>
        </ol>
      </figure>
    </section>
  );
}
