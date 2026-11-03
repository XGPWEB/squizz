"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileSpreadsheet, Printer, Trash2 } from "lucide-react";
import { postJson } from "@/lib/client/api";

/** Export, print (or save as PDF) and delete one game's results. */
export function ReportActions({ id, canDelete }: { id: string; canDelete: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const remove = async () => {
    if (!confirm("Supprimer les résultats de cette partie ? Cette action est définitive.")) return;
    setBusy(true);
    setError("");
    try {
      await postJson(`/api/reports/${encodeURIComponent(id)}`, undefined, "DELETE");
      router.push("/app/resultats");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <div className="report-actions no-print">
      <a className="button secondary" href={`/api/reports/${encodeURIComponent(id)}`} download>
        <FileSpreadsheet size={18} /> Excel
      </a>
      <button className="button secondary" onClick={() => window.print()}>
        <Printer size={18} /> Imprimer ou PDF
      </button>
      {canDelete && (
        <button className="button secondary" disabled={busy} onClick={remove} title="Supprimer">
          <Trash2 size={18} /> Supprimer
        </button>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
