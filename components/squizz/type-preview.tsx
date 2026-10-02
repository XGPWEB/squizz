import { Check, ImageIcon, MapPin, Music, Star } from "lucide-react";
import type { QuestionType, SlideLayout } from "@/lib/question";

/**
 * Miniature mock-ups shown on the step picker cards and the homepage, one per question type or
 * slide layout. Same visual language as the game itself: ink outlines and shadows, the four
 * answer colours of SQuizz with their A–D letters, sticker-like images.
 */
const LETTERS = ["A", "B", "C", "D"];

const Img = ({ tall = false, label = "IMAGE" }: { tall?: boolean; label?: string }) => (
  <span className={`pv-img ${tall ? "tall" : ""}`}>
    <ImageIcon size={16} />
    <b>{label}</b>
  </span>
);
const Tiles = ({
  labels,
  correct,
  column = false,
}: {
  labels: string[];
  correct?: number;
  column?: boolean;
}) => (
  <span className={`pv-tiles n${labels.length} ${column ? "column" : ""}`}>
    {labels.map((l, i) => (
      <span key={l} className={`pv-tile t${i} ${i === correct ? "good" : ""}`}>
        <i>{LETTERS[i]}</i>
        <span>{l}</span>
        {i === correct && <Check size={12} strokeWidth={4} className="pv-check" />}
      </span>
    ))}
  </span>
);
const Dots = ({ count, active }: { count: number; active: number }) => (
  <span className="pv-dots">
    {Array.from({ length: count }, (_, i) => (
      <i key={i} className={i === active ? "on" : ""}>
        {count <= 5 ? i + 1 : ""}
      </i>
    ))}
  </span>
);
const Pins = ({ correct = false }: { correct?: boolean }) => (
  <span className="pv-map">
    <span className="pv-land a" />
    <span className="pv-land b" />
    {correct && <span className="pv-zone" />}
    {[
      [20, 30],
      [47, 22],
      [72, 38],
      [34, 64],
      [80, 70],
    ].map(([x, y], i) => (
      <MapPin
        key={i}
        size={20}
        className={`pv-pin p${i % 4} ${correct && i === 1 ? "good" : ""}`}
        style={{ left: `${x}%`, top: `${y}%` }}
      />
    ))}
  </span>
);
const Lines = ({ n = 3 }: { n?: number }) => (
  <span className="pv-lines">
    {Array.from({ length: n }, (_, i) => (
      <i key={i} style={{ width: `${92 - i * 17}%` }} />
    ))}
  </span>
);

const typePreviews: Record<QuestionType, [string, React.ReactNode]> = {
  quiz: [
    "Capitale de l’Australie ?",
    <Tiles key="t" labels={["Sydney", "Canberra", "Melbourne", "Perth"]} correct={1} />,
  ],
  truefalse: ["Le Soleil est une étoile.", <Tiles key="t" labels={["Vrai", "Faux"]} correct={0} />],
  text: [
    "Symbole chimique de l’or ?",
    <span key="t" className="pv-input">
      Au
      <i />
    </span>,
  ],
  blindtest: [
    "Quel est ce titre ?",
    <span key="t" className="pv-blind">
      <span className="pv-sound">
        <Music size={16} />
        {[9, 16, 7, 13, 18, 10, 15, 6].map((h, i) => (
          <i key={i} style={{ height: h }} />
        ))}
      </span>
      <span className="pv-input">
        La Bohème
        <i />
      </span>
    </span>,
  ],
  slider: [
    "Hauteur de la tour Eiffel ?",
    <span key="t" className="pv-slider">
      <b>330 m</b>
      <span className="pv-track">
        <span className="pv-fill" />
        <span className="pv-thumb" />
      </span>
    </span>,
  ],
  pin: ["Où se trouve le trésor ?", <Pins key="t" correct />],
  puzzle: [
    "Du plus ancien au plus récent",
    <Tiles key="t" column labels={["Pyramides", "Colisée", "Tour Eiffel", "Burj Khalifa"]} />,
  ],
  poll: ["Ta pizza préférée ?", <Tiles key="t" labels={["Margherita", "Reine", "4 fromages", "Chorizo"]} />],
  scale: [
    "Ce quiz était-il fun ?",
    <span key="t" className="pv-scale">
      <span>
        <small>Bof</small>
        <small>Génial</small>
      </span>
      <Dots count={5} active={3} />
    </span>,
  ],
  nps: [
    "Recommanderais-tu l’atelier ?",
    <span key="t" className="pv-scale">
      <span>
        <small>0 · Non</small>
        <small>10 · Oui</small>
      </span>
      <Dots count={11} active={9} />
    </span>,
  ],
  pinpoll: ["D’où viens-tu ?", <Pins key="t" />],
  wordcloud: [
    "Un mot pour cette soirée ?",
    <span key="t" className="pv-cloud">
      <b className="t1">Fun</b>
      <b className="t0 big">Rythmé</b>
      <b className="t2 big">Collectif</b>
      <b className="t3">Top</b>
      <b className="t1">Instructif</b>
    </span>,
  ],
  open: [
    "Une idée pour la prochaine fois ?",
    <span key="t" className="pv-cards">
      {["Karaoké", "Blind test", "Escape game", "Quiz photo"].map((l, i) => (
        <span key={l} className={`t${i}`}>
          <b>{l}</b>
          <Lines n={2} />
        </span>
      ))}
    </span>,
  ],
  brainstorm: [
    "Un nom pour l’équipe ?",
    <span key="t" className="pv-ideas">
      {["Les Cerveaux", "Quiz Team", "Les Futés", "Mode Turbo"].map((l, i) => (
        <span key={l} className={`t${i}`}>
          {l}
          <Star size={11} fill="currentColor" />
        </span>
      ))}
    </span>,
  ],
  slide: ["Diapo", <Lines key="t" />],
};

export function TypePreview({ type }: { type: QuestionType }) {
  const [title, body] = typePreviews[type];
  const hasImage = ["quiz", "truefalse", "text", "slider", "poll", "scale", "nps"].includes(type);
  return (
    <span className="pv" aria-hidden>
      <b className="pv-title">{title}</b>
      {hasImage && <Img />}
      {body}
    </span>
  );
}

export function LayoutPreview({ layout }: { layout: SlideLayout }) {
  return (
    <span className={`pv pv-slide-${layout}`} aria-hidden>
      {layout === "classic" && (
        <>
          <b className="pv-title">Bienvenue à tous !</b>
          <Img />
          <Lines n={3} />
        </>
      )}
      {layout === "title" && (
        <span className="pv-split">
          <span>
            <b className="pv-sticker">MANCHE 1</b>
            <b className="pv-big">Culture générale</b>
          </span>
          <Img tall />
        </span>
      )}
      {layout === "titletext" && (
        <span className="pv-split">
          <span>
            <b className="pv-title left">Les règles du jeu</b>
            <Lines n={4} />
          </span>
          <Img tall />
        </span>
      )}
      {layout === "bullets" && (
        <span className="pv-split">
          <span>
            <b className="pv-title left">Au programme</b>
            <span className="pv-bullets">
              {["Quiz", "Pause", "Blind test", "Podium"].map((l) => (
                <span key={l}>{l}</span>
              ))}
            </span>
          </span>
          <Img tall />
        </span>
      )}
      {layout === "quote" && (
        <>
          <span className="pv-avatar">
            <ImageIcon size={16} />
          </span>
          <b className="pv-quote">« Le savoir, ça se partage. »</b>
          <small className="pv-author">— L’animateur</small>
        </>
      )}
      {layout === "bigimage" && (
        <>
          <Img label="PHOTO" />
          <small className="pv-caption">La photo de groupe</small>
        </>
      )}
    </span>
  );
}
