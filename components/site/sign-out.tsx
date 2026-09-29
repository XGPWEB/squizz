"use client";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button className="nav-link" onClick={() => signOut({ callbackUrl: "/" })}>
      <LogOut size={16} /> Déconnexion
    </button>
  );
}
