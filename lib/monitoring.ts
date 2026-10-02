/** What the super-admin's monitoring page shows: kinds of alerts and the scheduled tasks to watch. */
export const ALERT_TYPES = {
  server: "Erreur serveur",
  page: "Erreur d’affichage",
  client: "Erreur dans le navigateur",
  mail: "E-mail non envoyé",
  billing: "Facturation",
  health: "Santé du serveur",
} as const;
export type AlertType = keyof typeof ALERT_TYPES;
export const alertLabel = (type: string) => ALERT_TYPES[type as AlertType] ?? type;

/** Scheduled tasks of the server (deploy/setup-server.sh). A task is late after `maxAgeHours` without a run. */
export const CRON_JOBS = [
  { job: "backup", label: "Sauvegarde", schedule: "Chaque nuit à 2 h 15", maxAgeHours: 26 },
  { job: "purge", label: "Purge des données", schedule: "Chaque nuit à 3 h 30", maxAgeHours: 26 },
] as const;

export type CronStatus = "ok" | "failed" | "late" | "never";
export const CRON_STATUS_LABELS: Record<CronStatus, string> = {
  ok: "OK",
  failed: "Échec",
  late: "En retard",
  never: "Jamais lancée",
};

/** A failed last run is a failure even when recent; a success that is too old means the task stopped running. */
export function cronStatus(
  last: { startedAt: Date; success: boolean } | null,
  maxAgeHours: number,
  now = Date.now(),
): CronStatus {
  if (!last) return "never";
  if (!last.success) return "failed";
  return now - last.startedAt.getTime() > maxAgeHours * 3600_000 ? "late" : "ok";
}

/** Periods offered on the page, in days. */
export const ALERT_WINDOWS = [7, 30, 90] as const;
/** Alerts and runs are deleted after this many days. */
export const MONITORING_RETENTION_DAYS = 90;

/**
 * A path safe to keep in an alert: no query string, and long random parts (invitation, reset or
 * verification tokens, ids) replaced, so a stored alert never holds a working link.
 */
export const safePath = (raw: string) =>
  raw
    .split(/[?#]/)[0]
    .split("/")
    .map((part) => (/^[\w-]{20,}$/.test(part) ? "…" : part))
    .join("/")
    .slice(0, 300);
