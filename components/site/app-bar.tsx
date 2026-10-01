"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { openCookiePreferences } from "@/components/site/cookie-consent";
import { useEffect, useRef, useState } from "react";
import {
  Building2,
  ChevronDown,
  Cookie,
  CreditCard,
  History,
  LayoutGrid,
  LogOut,
  Mail,
  Shield,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean };
type Props = {
  area: "app" | "admin";
  name: string;
  email: string;
  roleLabel: string;
  organization: string | null;
  plan: { label: string; className: string } | null;
  canTeam: boolean;
  isSuperAdmin: boolean;
  viewingAs: boolean;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

/** Tabs of the signed-in areas, with the current page highlighted, and the account menu. */
export function AppBar(p: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  // A disclosure (not an ARIA menu): focus moves in on open, Escape returns it to the button,
  // and the panel closes on a click or a Tab outside it.
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onPointer = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onFocus = (e: FocusEvent) => {
      if (!menu.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
    };
  }, [open]);

  const items: Item[] =
    p.area === "app"
      ? [
          { href: "/app", label: "Mes quiz", icon: LayoutGrid, exact: true },
          { href: "/app/equipe", label: p.canTeam ? "Équipe" : "Organisation", icon: Users },
          ...(p.canTeam ? [{ href: "/app/abonnement", label: "Abonnement", icon: CreditCard }] : []),
          ...(p.isSuperAdmin && !p.viewingAs
            ? [{ href: "/super-admin", label: "Super-admin", icon: Shield }]
            : []),
        ]
      : [
          { href: "/super-admin", label: "Organisations", icon: Building2, exact: true },
          { href: "/super-admin/utilisateurs", label: "Utilisateurs", icon: Users },
          { href: "/super-admin/messages", label: "Messages", icon: Mail },
          { href: "/super-admin/journal", label: "Journal", icon: History },
        ];
  const active = (i: Item) =>
    i.exact
      ? pathname === i.href ||
        (i.href === "/app" && pathname.startsWith("/app/quiz")) ||
        (i.href === "/super-admin" && pathname.startsWith("/super-admin/organisations"))
      : pathname.startsWith(i.href);
  const accountHref = p.area === "admin" || p.viewingAs ? "/super-admin/compte" : "/app/compte";

  return (
    <div className="app-bar">
      <nav className="app-tabs" aria-label="Navigation de l’espace">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`app-tab ${active(i) ? "active" : ""}`}
            aria-current={active(i) ? "page" : undefined}
          >
            <i.icon size={18} aria-hidden />
            <span>{i.label}</span>
          </Link>
        ))}
      </nav>
      <div className="app-bar-end">
        {p.organization && (
          <span className="org-chip" title={p.organization}>
            <span className="org-name">{p.organization}</span>
            {p.plan && <span className={`plan-badge ${p.plan.className}`}>{p.plan.label}</span>}
          </span>
        )}
        <div className="account" ref={menu}>
          <button
            ref={button}
            className="account-button"
            aria-controls="account-panel"
            aria-expanded={open}
            aria-label={`Mon compte : ${p.name}`}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="avatar" aria-hidden>
              {initials(p.name)}
            </span>
            <span className="account-name">{p.name.split(" ")[0]}</span>
            <ChevronDown size={16} aria-hidden className={open ? "flip" : ""} />
          </button>
          {open && (
            <div className="account-menu" id="account-panel" ref={panel}>
              <div className="account-head">
                <span className="avatar big" aria-hidden>
                  {initials(p.name)}
                </span>
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.email}</small>
                  <span className="role-pill">{p.roleLabel}</span>
                </span>
              </div>
              <Link href={accountHref} className="menu-item" onClick={() => setOpen(false)}>
                <UserRound size={18} /> Mon compte
              </Link>
              <button
                className="menu-item"
                onClick={() => {
                  setOpen(false);
                  openCookiePreferences();
                }}
              >
                <Cookie size={18} /> Gérer les cookies
              </button>
              {p.isSuperAdmin && p.area === "app" && !p.viewingAs && (
                <Link href="/super-admin" className="menu-item" onClick={() => setOpen(false)}>
                  <Shield size={18} /> Super-admin
                </Link>
              )}
              <button
                className="menu-item danger"
                onClick={async () => {
                  // Each space has its own session: signing out of one leaves the other open.
                  if (p.area === "admin" || p.viewingAs) {
                    await fetch("/api/admin/session", { method: "DELETE" }).catch(() => null);
                    router.push("/super-admin/connexion");
                    router.refresh();
                  } else await signOut({ callbackUrl: "/" });
                }}
              >
                <LogOut size={18} /> Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
