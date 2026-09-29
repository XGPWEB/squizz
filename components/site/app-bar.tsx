"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  Building2,
  ChevronDown,
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
  plan: { label: string; pro: boolean } | null;
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
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menu.current?.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  useEffect(() => setOpen(false), [pathname]);

  const items: Item[] =
    p.area === "app"
      ? [
          { href: "/app", label: "Mes quiz", icon: LayoutGrid, exact: true },
          { href: "/app/equipe", label: p.canTeam ? "Équipe" : "Organisation", icon: Users },
          ...(p.isSuperAdmin && !p.viewingAs ? [{ href: "/admin", label: "Super-admin", icon: Shield }] : []),
        ]
      : [
          { href: "/admin", label: "Organisations", icon: Building2, exact: true },
          { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
          { href: "/admin/messages", label: "Messages", icon: Mail },
          { href: "/admin/journal", label: "Journal", icon: History },
        ];
  const active = (i: Item) =>
    i.exact
      ? pathname === i.href ||
        (i.href === "/app" && pathname.startsWith("/app/quiz")) ||
        (i.href === "/admin" && pathname.startsWith("/admin/organisations"))
      : pathname.startsWith(i.href);
  const accountHref = p.area === "admin" || p.viewingAs ? "/admin/compte" : "/app/compte";

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
            {p.plan && <span className={`plan-badge ${p.plan.pro ? "pro" : ""}`}>{p.plan.label}</span>}
          </span>
        )}
        <div className="account" ref={menu}>
          <button
            className="account-button"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="avatar" aria-hidden>
              {initials(p.name)}
            </span>
            <span className="account-name">{p.name.split(" ")[0]}</span>
            <ChevronDown size={16} aria-hidden className={open ? "flip" : ""} />
          </button>
          {open && (
            <div className="account-menu" role="menu">
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
              <Link href={accountHref} role="menuitem" className="menu-item">
                <UserRound size={18} /> Mon compte
              </Link>
              {p.isSuperAdmin && p.area === "app" && !p.viewingAs && (
                <Link href="/admin" role="menuitem" className="menu-item">
                  <Shield size={18} /> Super-admin
                </Link>
              )}
              <button
                role="menuitem"
                className="menu-item danger"
                onClick={() => signOut({ callbackUrl: "/" })}
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
