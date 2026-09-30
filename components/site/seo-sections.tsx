import { Ban, Globe2, ShieldCheck, Smartphone, Users, UsersRound } from "lucide-react";
import { ADVANTAGES, FAQ } from "@/lib/seo";

const icons = [Globe2, ShieldCheck, UsersRound, Smartphone, Users, Ban];

export function Advantages() {
  return (
    <div className="advantage-grid" data-stagger="pop">
      {ADVANTAGES.map((a, i) => {
        const Icon = icons[i];
        return (
          <article key={a.title}>
            <Icon aria-hidden />
            <h3>{a.title}</h3>
            <p>{a.text}</p>
          </article>
        );
      })}
    </div>
  );
}

export function Faq({ items = FAQ }: { items?: typeof FAQ }) {
  return (
    <div className="faq" data-reveal="up">
      {items.map(({ q, a }) => (
        <details key={q}>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  );
}
