import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href} aria-label="SQuizz, accueil">
      S<span>Q</span>uizz<span className="brand-dot">.</span>
    </Link>
  );
}
