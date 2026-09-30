import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/server/guard";
import { Brand } from "@/components/site/brand";
import { AdminLoginForm } from "./admin-login-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Super-admin", robots: { index: false, follow: false } };

/** Sign-in for the super-admin space: its own session, independent of any client account. */
export default async function AdminLoginPage() {
  if (await getAdminUser()) redirect("/super-admin");
  return (
    <main id="contenu" className="admin-login">
      <Brand href={null} className="brand-big" />
      <AdminLoginForm />
    </main>
  );
}
