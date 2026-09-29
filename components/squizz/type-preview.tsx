import { Check, ImageIcon, MapPin, Star } from "lucide-react";
import type { QuestionType, SlideLayout } from "@/lib/question";

/** Miniature mock-ups shown on the step picker cards, one per question type or slide layout. */
const Img = ({ tall = false }: { tall?: boolean }) => (
  <span className={`pv-img ${tall ? "tall" : ""}`}>
    <ImageIcon size={18} />
  </span>
);
const Tiles = ({ labels, correct }: { labels: string[]; correct?: number }) => (
  <span className={`pv-tiles n${labels.length}`}>
    {labels.map((l, i) => (
      <span key={l} className={`pv-tile c${i}`}>
        {l}
        {i === correct && <Check size={12} strokeWidth={4} />}
      </span>
    ))}
  </span>
);
const Dots = ({ count, active }: { count: number; active: number }) => (
  <span className="pv-dots">
    {Array.from({ length: count }, (_, i) => (
      <i key={i} className={i === active ? "on" : ""} />
    ))}
  </span>
);
const Pins = ({ correct = false }: { correct?: boolean }) => (
  <span className="pv-map">
    <ImageIcon size={18} />
    {[
      [18, 22],
      [42, 12],
      [70, 28],
      [30, 60],
      [78, 62],
    ].map(([x, y], i) => (
      <MapPin
        key={i}
        size={20}
        className={`pv-pin p${i % 4} ${correct && i === 1 ? "good" : ""}`}
        style={{ left: `${x}%`, top: `${y}%` }}
      />
    ))}
    {correct && <span className="pv-zone" />}
  </span>
);
const Lines = ({ n = 3 }: { n?: number }) => (
  <span className="pv-lines">
    {Array.from({ length: n }, (_, i) => (
      <i key={i} style={{ width: `${90 - i * 18}%` }} />
    ))}
  </span>
);

const typePreviews: Record<QuestionType, [string, React.ReactNode]> = {
  quiz: [
    "Où a ouvert notre 1re filiale ?",
    <Tiles key="t" labels={["New York", "Londres", "Sydney", "Pékin"]} correct={1} />,
  ],
  truefalse: ["Nos bureaux sont dans 5 pays", <Tiles key="t" labels={["Vrai", "Faux"]} correct={0} />],
  text: [
    "Quel service embauche ?",
    <span key="t" className="pv-input">
      RH
      <i />
    </span>,
  ],
  slider: [
    "Notre chiffre d’affaires ?",
    <span key="t" className="pv-slider">
      <b>2 380 000 $</b>
      <span>
        {Array.from({ length: 15 }, (_, i) => (
          <i key={i} className={i === 9 ? "on" : ""} />
        ))}
      </span>
    </span>,
  ],
  pin: ["Où est le siège ?", <Pins key="t" correct />],
  puzzle: [
    "Du plus petit au plus grand",
    <span key="t" className="pv-puzzle">
      <Img tall />
      <Tiles labels={["États-Unis", "Europe", "Asie", "AMLAT"]} />
    </span>,
  ],
  poll: ["D’où aimes-tu travailler ?", <Tiles key="t" labels={["Maison", "Bureau", "Coworking", "Autre"]} />],
  scale: [
    "Je suis motivé(e) au travail",
    <span key="t" className="pv-scale">
      <span>
        <small>Pas d’accord</small>
        <small>D’accord</small>
      </span>
      <Dots count={5} active={3} />
    </span>,
  ],
  nps: [
    "Recommanderais-tu SQuizz ?",
    <span key="t" className="pv-scale">
      <span>
        <small>Peu probable</small>
        <small>Très probable</small>
      </span>
      <Dots count={11} active={8} />
    </span>,
  ],
  pinpoll: ["D’où viens-tu ?", <Pins key="t" />],
  wordcloud: [
    "Dans quel service es-tu ?",
    <span key="t" className="pv-cloud">
      <b className="c2">Marketing</b>
      <b className="c1 big">Ingénierie</b>
      <b className="c0 big">Technologie</b>
      <b className="c3">Ventes</b>
      <b className="c1">Support</b>
    </span>,
  ],
  open: [
    "Comment aimes-tu te former ?",
    <span key="t" className="pv-cards">
      {["Physique", "Mélangé", "Virtuel", "Vidéo"].map((l, i) => (
        <span key={l}>
          <Lines n={2} />
          <b className={`c${i}`}>{l}</b>
        </span>
      ))}
    </span>,
  ],
  brainstorm: [
    "Quel sujet pour le projet ?",
    <span key="t" className="pv-ideas">
      {["Réunions virtuelles", "Bien-être", "Formation", "Bureau hybride"].map((l, i) => (
        <span key={l} className={`c${i}`}>
          {l}
          <Star size={12} fill="currentColor" />
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
          <b className="pv-title">Félicitations à l’équipe !</b>
          <Img />
          <Lines n={3} />
        </>
      )}
      {layout === "title" && (
        <span className="pv-split">
          <span>
            <b className="pv-big">Formation de ventes</b>
            <b className="pv-sub">Nouveau produit</b>
          </span>
          <Img tall />
        </span>
      )}
      {layout === "titletext" && (
        <span className="pv-split">
          <span>
            <b className="pv-title left">Voir les choses en grand</b>
            <Lines n={4} />
          </span>
          <Img tall />
        </span>
      )}
      {layout === "bullets" && (
        <span className="pv-split">
          <span>
            <b className="pv-title left">Nos 5 valeurs :</b>
            <ul className="pv-bullets">
              {["Honnêteté", "Passion", "Inclusion", "Diversité"].map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </span>
          <Img tall />
        </span>
      )}
      {layout === "quote" && (
        <>
          <span className="pv-avatar">
            <ImageIcon size={16} />
          </span>
          <b className="pv-title">« Heureux de vous accueillir. »</b>
          <small className="pv-author">— PDG</small>
        </>
      )}
      {layout === "bigimage" && (
        <>
          <span className="pv-img hero">
            <ImageIcon size={26} />
          </span>
          <small className="pv-author">Rencontre l’équipe</small>
        </>
      )}
    </span>
  );
}
