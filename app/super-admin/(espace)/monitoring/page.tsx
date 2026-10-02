import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { APP_VERSION } from "@/lib/version";
import { recentRooms } from "@/lib/server/game";
import {
  ALERT_WINDOWS,
  CRON_JOBS,
  CRON_STATUS_LABELS,
  MONITORING_RETENTION_DAYS,
  alertLabel,
  cronStatus,
} from "@/lib/monitoring";

export const metadata: Metadata = { title: "Monitoring" };

const DAY = 24 * 60 * 60 * 1000;
const when = (d: Date) => d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

/** Everything the page shows, read at request time. */
async function load(days: number, type?: string) {
  const now = Date.now();
  const since = new Date(now - days * DAY);
  const [alerts, byType, lastDay, runs, games] = await Promise.all([
    prisma.systemAlert.findMany({
      where: { createdAt: { gte: since }, ...(type ? { type } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.systemAlert.groupBy({
      by: ["type"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.systemAlert.count({ where: { createdAt: { gte: new Date(now - DAY) } } }),
    prisma.cronRun.findMany({ orderBy: { startedAt: "desc" }, take: 200 }),
    recentRooms(),
  ]);
  const crons = CRON_JOBS.map((j) => {
    const mine = runs.filter((r) => r.job === j.job);
    return {
      ...j,
      last: mine[0] ?? null,
      recent: mine.slice(0, 7).reverse(),
      status: cronStatus(mine[0] ?? null, j.maxAgeHours, now),
    };
  });
  return { alerts, byType, lastDay, games, crons, total: byType.reduce((n, t) => n + t._count._all, 0) };
}

/** Silent failures and scheduled tasks: what nobody sees on screen when it breaks. */
export default async function MonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{ jours?: string; type?: string }>;
}) {
  const { jours, type } = await searchParams;
  const days = ALERT_WINDOWS.find((d) => d === Number(jours)) ?? ALERT_WINDOWS[0];
  const { alerts, byType, lastDay, games, crons, total } = await load(days, type);
  const href = (d: number, t?: string) => `/super-admin/monitoring?jours=${d}${t ? `&type=${t}` : ""}`;
  return (
    <>
      <div className="dash-heading">
        <div>
          <p className="eyebrow">SUPER-ADMIN</p>
          <h1>Monitoring</h1>
          <p className="hint">
            Les pannes que personne ne voit à l’écran : erreurs, e-mails non partis, tâches de nuit. Chaque
            nouveau type d’alerte est aussi envoyé par e-mail (au plus un par demi-heure).
          </p>
        </div>
      </div>
      <div className="usage-grid">
        <div className={`usage${lastDay ? " warn" : ""}`}>
          <span>Alertes (24 h)</span>
          <strong>{lastDay}</strong>
          <small>{lastDay ? "À regarder ci-dessous" : "Rien à signaler"}</small>
        </div>
        <div className="usage">
          <span>Parties (24 h)</span>
          <strong>{games}</strong>
        </div>
        <div className="usage">
          <span>Version en ligne</span>
          <strong>{APP_VERSION}</strong>
          <small>Base de données : OK</small>
        </div>
      </div>

      <section className="panel">
        <h2>Tâches planifiées</h2>
        <div className="cron-grid">
          {crons.map((c) => (
            <article key={c.job} className={`cron-card ${c.status}`}>
              <div className="row spaced">
                <strong>{c.label}</strong>
                <span className={`cron-status ${c.status}`}>{CRON_STATUS_LABELS[c.status]}</span>
              </div>
              <p className="hint">{c.schedule}</p>
              <p>
                {c.last
                  ? `Dernière exécution le ${when(c.last.startedAt)}${c.last.detail ? ` — ${c.last.detail}` : ""}`
                  : "Aucune exécution enregistrée pour l’instant."}
              </p>
              <div className="cron-dots" aria-label="7 dernières exécutions">
                {c.recent.map((r) => (
                  <i
                    key={r.id}
                    className={r.success ? "ok" : "failed"}
                    title={`${when(r.startedAt)} : ${r.success ? "réussie" : "échec"}`}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
        <p className="hint">
          Le contrôle de santé tourne toutes les 5 minutes sur le serveur : s’il échoue, il apparaît dans les
          alertes ci-dessous (type « {alertLabel("health")} »).
        </p>
      </section>

      <section className="panel">
        <div className="row spaced monitoring-head">
          <h2>Alertes</h2>
          <nav className="window-tabs" aria-label="Période">
            {ALERT_WINDOWS.map((d) => (
              <Link
                key={d}
                href={href(d, type)}
                className={d === days ? "active" : ""}
                aria-current={d === days ? "page" : undefined}
              >
                {d} jours
              </Link>
            ))}
          </nav>
        </div>
        <div className="type-chips">
          <Link href={href(days)} className={!type ? "active" : ""}>
            Toutes <b>{total}</b>
          </Link>
          {byType
            .sort((a, b) => b._count._all - a._count._all)
            .map((t) => (
              <Link key={t.type} href={href(days, t.type)} className={type === t.type ? "active" : ""}>
                {alertLabel(t.type)} <b>{t._count._all}</b>
              </Link>
            ))}
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Message</th>
                <th>Où</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => {
                const context = (a.context ?? {}) as Record<string, unknown>;
                return (
                  <tr key={a.id}>
                    <td>{when(a.createdAt)}</td>
                    <td>{alertLabel(a.type)}</td>
                    <td>{a.message}</td>
                    <td>
                      <code>{[context.method, context.path].filter(Boolean).join(" ")}</code>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!alerts.length && <p className="hint">Aucune alerte sur cette période.</p>}
        </div>
        <p className="hint">
          Les 200 plus récentes. Alertes et exécutions sont supprimées après {MONITORING_RETENTION_DAYS}{" "}
          jours.
        </p>
      </section>
    </>
  );
}
