import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/guard";
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
  searchParams: Promise<{ suspendu?: string; email?: string }>;
}) {
  const user = await getSessionUser();
  const params = await searchParams;
  if (user && !params.suspendu) redirect("/app");
  return <LoginForm suspended={!!params.suspendu} email={params.email ?? ""} />;
}
