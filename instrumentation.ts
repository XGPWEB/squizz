import type { Instrumentation } from "next";

/**
 * Errors caught by Next.js while rendering a page (the visitor sees app/error.tsx) go to the monitoring page
 * of the super-admin. API routes report their own errors (lib/server/api.ts).
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { isVisitorGone } = await import("@/lib/monitoring");
  // Not an error of the site: no alert, no e-mail.
  if (isVisitorGone(err)) return;
  const { reportAlert, errorMessage } = await import("@/lib/server/monitoring");
  await reportAlert({
    type: context.routeType === "render" ? "page" : "server",
    message: errorMessage(err),
    // The route file (« /reinitialiser/[token] »), not the address: no token is kept.
    path: context.routePath,
    context: { method: request.method },
  });
};
