import { reportCsv } from "@/lib/report";
import { route } from "@/lib/server/api";
import { requireMember } from "@/lib/server/guard";
import { fail } from "@/lib/server/http";
import { deleteReport, findReport } from "@/lib/server/reports";

export const dynamic = "force-dynamic";

const fileName = (title: string, date: Date) =>
  `${
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "partie"
  }-${date.toISOString().slice(0, 10)}.csv`;

/** The results of a game as a CSV file for Excel. */
export const GET = route<{ id: string }>(async (_req, { id }) => {
  const report = await findReport(await requireMember(), id);
  if (!report) fail("Résultats introuvables.", 404);
  return new Response(reportCsv(report, report.data), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName(report.title, report.playedAt)}"`,
      "Cache-Control": "no-store",
    },
  });
});

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  await deleteReport(await requireMember(), id);
  return { ok: true };
});
