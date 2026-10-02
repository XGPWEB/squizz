import { HttpError } from "@/lib/server/http";
import { handleWebhook } from "@/lib/server/billing";
import { errorMessage, reportAlert } from "@/lib/server/monitoring";

export const dynamic = "force-dynamic";

/**
 * Stripe calls this on every subscription change. Not wrapped in `route()`: the body must stay raw for the
 * signature check, and the call comes from Stripe, not from this site.
 */
export async function POST(req: Request) {
  try {
    await handleWebhook(await req.text(), req.headers.get("stripe-signature"));
    return Response.json({ received: true });
  } catch (err) {
    if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
    console.error("Webhook Stripe", err);
    void reportAlert({
      type: "billing",
      message: `Webhook Stripe en échec — ${errorMessage(err)}`,
      path: "/api/billing/webhook",
    });
    // 500 makes Stripe retry later.
    return Response.json({ error: "Erreur interne." }, { status: 500 });
  }
}
