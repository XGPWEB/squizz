import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { recentRooms } from "@/lib/server/game";
import { PLANS } from "@/lib/plans";
import { Organizations } from "./organizations";

export const metadata: Metadata = { title: "Super-admin" };

export default async function AdminHome() {
  const [orgs, byPlan, partners, suspended, users, quizzes, games] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.groupBy({
      by: ["plan"],
      where: { plan: { not: "FREE" }, status: "ACTIVE", partner: false },
      _count: true,
    }),
    prisma.organization.count({ where: { partner: true } }),
    prisma.organization.count({ where: { status: "SUSPENDED" } }),
    prisma.user.count({ where: { role: { not: "SUPER_ADMIN" } } }),
    prisma.quiz.count(),
    recentRooms(),
  ]);
  const paid = byPlan.reduce((n, p) => n + p._count, 0);
  // Monthly equivalent of the active paid plans (annual price spread over 12 months).
  const monthly = byPlan.reduce((sum, p) => {
    const { price, period } = PLANS[p.plan];
    return sum + (p._count * price) / (period === "an" ? 12 : 1);
  }, 0);
  return (
    <>
      <div className="dash-heading">
        <div>
          <p className="eyebrow">SUPER-ADMIN</p>
          <h1>Vue d’ensemble</h1>
        </div>
      </div>
      <div className="usage-grid">
        <Stat
          label="Organisations"
          value={orgs}
          note={`${paid} payante${paid > 1 ? "s" : ""} (≈ ${Math.round(monthly)} € / mois) · ${partners} partenaire${partners > 1 ? "s" : ""} · ${suspended} suspendue${suspended > 1 ? "s" : ""}`}
        />
        <Stat label="Utilisateurs" value={users} />
        <Stat label="Quiz" value={quizzes} />
        <Stat label="Parties (24 h)" value={games} />
      </div>
      <Organizations />
    </>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="usage">
      <span>{label}</span>
      <strong>{value.toLocaleString("fr-FR")}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}
