import type { Metadata } from "next";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "Rejoindre une partie" };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return <JoinForm initialCode={/^\d{6}$/.test(code ?? "") ? code! : ""} />;
}
