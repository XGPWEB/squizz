import Link from "next/link";

/** The SQuizz logo; `href={null}` renders it without a link (in a game, a tap must not leave it). */
export function Brand({ href = "/", className = "" }: { href?: string | null; className?: string }) {
  const content = (
    <>
      S<span>Q</span>uizz<span className="brand-dot">.</span>
    </>
  );
  return href === null ? (
    <span className={`brand ${className}`} aria-label="SQuizz" role="img">
      {content}
    </span>
  ) : (
    <Link className={`brand ${className}`} href={href} aria-label="SQuizz, accueil">
      {content}
    </Link>
  );
}
