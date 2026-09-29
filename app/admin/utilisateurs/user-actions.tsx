"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, KeyRound } from "lucide-react";
import { postJson } from "@/lib/client/api";

export function UserActions({ id, name, active }: { id: string; name: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [link, setLink] = useState(""),
    [error, setError] = useState("");
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="row-actions stacked">
      <div className="row-actions">
        <button
          className="button small secondary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await postJson(`/api/admin/users/${id}`, { active: !active }, "PATCH");
              router.refresh();
            })
          }
        >
          {active ? "Désactiver" : "Réactiver"}
        </button>
        <button
          className="button small secondary"
          disabled={busy}
          title={`Créer un lien de mot de passe pour ${name}`}
          onClick={() =>
            run(async () => setLink((await postJson<{ link: string }>(`/api/admin/users/${id}/reset`)).link))
          }
        >
          <KeyRound size={16} /> Lien
        </button>
      </div>
      {link && (
        <div className="row inline-link">
          <input
            readOnly
            value={link}
            aria-label={`Lien de réinitialisation de ${name}`}
            onFocus={(e) => e.currentTarget.select()}
          />
          <button className="card-action" title="Copier" onClick={() => navigator.clipboard?.writeText(link)}>
            <Copy size={16} />
          </button>
        </div>
      )}
      {error && <small className="inline-error">{error}</small>}
    </div>
  );
}
