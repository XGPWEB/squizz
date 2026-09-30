import type { Metadata } from "next";
import { safeNext } from "@/lib/next-path";
import { VerifyEmail } from "./verify-email";

export const metadata: Metadata = { title: "Confirmation de l’adresse", robots: { index: false } };

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ suite?: string }>;
}) {
  const { token } = await params;
  return <VerifyEmail token={token} next={safeNext((await searchParams).suite)} />;
}
