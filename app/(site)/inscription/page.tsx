import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  alternates: { canonical: "/inscription" },
  title: "Créer un compte",
  description: "Créez gratuitement l’espace SQuizz de votre organisation.",
};

export default function SignupPage() {
  return <SignupForm />;
}
