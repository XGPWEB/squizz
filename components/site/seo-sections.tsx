import { Ban, Globe2, ShieldCheck, Smartphone, Users, UsersRound } from "lucide-react";
import { ADVANTAGES, FAQ } from "@/lib/seo";
import { Fold } from "./fold";

const icons = [Globe2, ShieldCheck, UsersRound, Smartphone, Users, Ban];

/** The advantages as titles; each opens on its explanation. */
export function Advantages() {
  return (
    <div className="advantage-grid" data-stagger="pop">
      {ADVANTAGES.map((a, i) => {
        const Icon = icons[i];
        return (
          <details key={a.title} className="advantage">
            <summary>
              <Icon aria-hidden />
              <h3>{a.title}</h3>
              <span className="fold-sign" aria-hidden>
                +
              </span>
            </summary>
            <p>{a.text}</p>
          </details>
        );
      })}
    </div>
  );
}

const QuestionList = ({ items }: { items: typeof FAQ }) =>
  items.map(({ q, a }) => (
    <details key={q}>
      <summary>{q}</summary>
      <p>{a}</p>
    </details>
  ));

/** The questions, the first `shown` in the open and the others behind one more fold. */
export function Faq({ items = FAQ, shown }: { items?: typeof FAQ; shown?: number }) {
  const rest = shown === undefined ? [] : items.slice(shown);
  return (
    <div className="faq" data-reveal="up">
      <QuestionList items={shown === undefined ? items : items.slice(0, shown)} />
      {rest.length > 0 && (
        <Fold className="faq-more" title="Les autres questions" count={String(rest.length)}>
          <div className="faq">
            <QuestionList items={rest} />
          </div>
        </Fold>
      )}
    </div>
  );
}
