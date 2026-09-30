import type { Metadata } from "next";
import { safeNext } from "@/lib/next-path";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  alternates: { canonical: "/inscription" },
  title: "Créer un compte",
  description: "Créez gratuitement l’espace SQuizz de votre organisation.",
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  return <SignupForm next={safeNext((await searchParams).suite)} />;
}
