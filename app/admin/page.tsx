import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ROOM_TTL } from "@/lib/server/game";
import { Organizations } from "./organizations";

export const metadata: Metadata = { title: "Super-admin" };

export default async function AdminHome() {
  const since = BigInt(Date.now() - ROOM_TTL);
  const [orgs, pro, suspended, users, quizzes, games] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { plan: "PRO" } }),
    prisma.organization.count({ where: { status: "SUSPENDED" } }),
    prisma.user.count({ where: { role: { not: "SUPER_ADMIN" } } }),
    prisma.quiz.count(),
    prisma.room.count({ where: { created: { gt: since } } }),
  ]);
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
          note={`${pro} Pro · ${suspended} suspendue${suspended > 1 ? "s" : ""}`}
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
