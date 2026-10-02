import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/guard";
import { safeNext } from "@/lib/next-path";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  alternates: { canonical: "/inscription" },
  title: "Créer un compte",
  description: "Créez gratuitement l’espace SQuizz de votre organisation.",
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const next = safeNext((await searchParams).suite);
  // Already signed in (an offer button of /tarifs leads here): straight to where they were going.
  if (await getSessionUser()) redirect(next);
  return <SignupForm next={next} />;
}
