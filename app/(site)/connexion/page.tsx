import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/guard";
import { safeNext } from "@/lib/next-path";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  description:
    "Connectez-vous à l’espace SQuizz de votre organisation pour créer vos quiz et lancer vos parties.",
  alternates: { canonical: "/connexion" },
  title: "Connexion",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ suspendu?: string; email?: string; suite?: string }>;
}) {
  const user = await getSessionUser();
  const params = await searchParams;
  const next = safeNext(params.suite);
  if (user && !params.suspendu) redirect(next);
  return <LoginForm suspended={!!params.suspendu} email={params.email ?? ""} next={next} />;
}
