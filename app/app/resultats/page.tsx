import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ChevronRight, Users } from "lucide-react";
import { pageUser } from "@/lib/server/guard";
import { listReports, REPORT_DAYS } from "@/lib/server/reports";
import { listSolos } from "@/lib/server/solo";
import { SoloLinks } from "./solo-links";

export const metadata: Metadata = { title: "Résultats" };

const when = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "long",
    timeStyle: "short",
  });

export default async function ReportsPage() {
  const user = await pageUser();
  const member = user as typeof user & { organizationId: string };
  const [reports, solos] = await Promise.all([listReports(member), listSolos(member.organizationId)]);
  return (
    <>
      <div className="dash-heading">
        <div>
          <p className="eyebrow">APRÈS LA PARTIE</p>
          <h1>Résultats</h1>
          <p className="hint">
            Le classement et les réponses de chaque partie de votre organisation, à consulter, imprimer ou
            exporter pour Excel. Gardés {Math.round(REPORT_DAYS / 30)} mois.
          </p>
        </div>
      </div>
      <SoloLinks solos={solos} />
      {reports.length ? (
        <ul className="report-list">
          {reports.map((r, i) => (
            <li key={r.id} style={{ "--i": i } as React.CSSProperties}>
              <Link href={`/app/resultats/${encodeURIComponent(r.id)}`} className="report-row">
                <span className="report-icon" aria-hidden>
                  <BarChart3 size={22} />
                </span>
                <span className="report-main">
                  <strong>{r.title}</strong>
                  <small>
                    {when(r.playedAt)} · {r.mine ? "par vous" : `par ${r.hostName}`}
                  </small>
                </span>
                <span className="report-meta">
                  <span>
                    <Users size={15} aria-hidden /> {r.players} joueur{r.players > 1 ? "s" : ""}
                  </span>
                  <span className={`status ${r.finished ? "on" : "off"}`}>
                    {r.id.startsWith("solo-")
                      ? "En autonomie"
                      : r.finished
                        ? "Terminée"
                        : `Arrêtée à ${r.questions}/${r.total}`}
                  </span>
                </span>
                <ChevronRight size={20} aria-hidden className="report-go" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="creator">
          <BarChart3 />
          <div>
            <h3>Pas encore de résultats.</h3>
            <p>
              Lancez une partie : dès la première question passée, son classement et les réponses de chacun
              arrivent ici.
            </p>
          </div>
          <Link className="button dark" href="/app">
            Mes quiz
          </Link>
        </div>
      )}
    </>
  );
}
