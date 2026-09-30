import type { Metadata } from "next";
import Link from "next/link";
import { findInvitation } from "@/lib/server/accounts";
import { HttpError } from "@/lib/server/http";
import { AcceptForm } from "./accept-form";

export const metadata: Metadata = { title: "Invitation", robots: { index: false } };

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Resolve first, render after: an expired link becomes an HttpError value, anything else is rethrown.
  const inv = await findInvitation(token).catch((e: unknown) => {
    if (e instanceof HttpError) return e;
    throw e;
  });
  if (!(inv instanceof HttpError))
    return (
      <AcceptForm
        token={token}
        email={inv.email}
        organization={inv.organization.name}
        role={inv.role === "ORG_ADMIN" ? "administrateur" : "animateur"}
      />
    );
  return (
    <section className="panel narrow">
      <p className="eyebrow">INVITATION</p>
      <h1 className="auth-title">Lien expiré.</h1>
      <p>{inv.message}</p>
      <Link className="button secondary" href="/connexion">
        Aller à la connexion
      </Link>
    </section>
  );
}
