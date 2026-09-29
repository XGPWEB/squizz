import { COMPANY_INFO } from "@/lib/company-info";

/** Shared layout of the legal pages, with the date of last update. */
export function Legal({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <article className="panel legal">
      <p className="eyebrow">{eyebrow.toUpperCase()}</p>
      <h1>{title}</h1>
      <p className="hint">
        Dernière mise à jour : {COMPANY_INFO.lastUpdated.toLocaleDateString("fr-FR", { dateStyle: "long" })}
      </p>
      {children}
    </article>
  );
}

export const Mail = ({ email = COMPANY_INFO.editor.email }: { email?: string }) => (
  <a href={`mailto:${email}`}>{email}</a>
);
