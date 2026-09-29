"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, LogOut } from "lucide-react";
import { postJson } from "@/lib/client/api";

/** Always visible while the super-admin views an organisation, with a way back. */
export function ViewAsBanner({
  organization,
  organizationId,
}: {
  organization: string;
  organizationId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="view-as-banner" role="status">
      <Eye size={18} />
      <span>
        Vue super-admin : vous consultez <strong>{organization}</strong> comme son administrateur. Vos actions
        sont enregistrées dans le journal.
      </span>
      <button
        className="button small dark"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await postJson("/api/admin/view", undefined, "DELETE").catch(() => {});
          router.push(`/admin/organisations/${organizationId}`);
          router.refresh();
        }}
      >
        <LogOut size={16} /> Quitter la vue
      </button>
    </div>
  );
}
