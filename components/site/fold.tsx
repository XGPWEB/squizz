/**
 * A section the visitor opens to learn more: a native <details>, so it works with the keyboard and without
 * script, and its content stays in the page for search engines and AI assistants.
 */
export function Fold({
  title,
  count,
  className = "",
  open,
  children,
}: {
  title: string;
  count?: string;
  className?: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className={`fold ${className}`} open={open}>
      <summary>
        <span className="fold-title">{title}</span>
        {count && <span className="fold-count">{count}</span>}
        <span className="fold-sign" aria-hidden>
          +
        </span>
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}
