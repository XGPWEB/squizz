/** An endless scrolling band of words, duplicated so the loop has no gap. */
export function Marquee({ items, tone = "ink" }: { items: string[]; tone?: "ink" | "acid" | "pink" }) {
  const row = items.map((item, i) => (
    <span key={i}>
      {item}
      <b aria-hidden>✦</b>
    </span>
  ));
  return (
    <div className={`marquee marquee-${tone}`} aria-hidden="true">
      <div className="marquee-track">
        <div>{row}</div>
        <div>{row}</div>
      </div>
    </div>
  );
}
