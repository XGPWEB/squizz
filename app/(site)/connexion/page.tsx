import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/guard";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ suspendu?: string; email?: string }>;
}) {
  const user = await getSessionUser();
  const params = await searchParams;
  if (user && !params.suspendu)
    redirect(user.role === "SUPER_ADMIN" && !user.organizationId ? "/admin" : "/app");
  return <LoginForm suspended={!!params.suspendu} email={params.email ?? ""} />;
}
