import { identity, identityHeaders } from "@/lib/identity";
import { assertSameOrigin, fail, HttpError, readBody } from "@/lib/server/http";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { errorMessage, reportAlert } from "@/lib/server/monitoring";
import { soloAnswer, soloJoin, soloNext, soloState } from "@/lib/server/solo";

export const dynamic = "force-dynamic";

/** A self-paced game: anyone with the link plays alone, at their own pace (lib/server/solo.ts). */
export async function POST(req: Request) {
  const who = await identity(req);
  const reply = (data: unknown, status = 200) =>
    Response.json(data, { status, headers: identityHeaders(req, who) });
  try {
    assertSameOrigin(req);
    const body = await readBody(req);
    const action = String(body.action || "");
    if (action === "join") {
      if (!(await rateLimit(`solo:${clientIp(req.headers)}`, 300, 10 * 60)).allowed)
        fail("Trop de tentatives depuis votre connexion. Réessayez dans quelques minutes.", 429);
      await soloJoin(who.id, body.id, body.name);
    } else if (action === "answer") await soloAnswer(who.id, body.id, body);
    else if (action === "next") await soloNext(who.id, body.id, body);
    else if (action !== "state") fail("Action inconnue.");
    return reply(await soloState(who.id, body.id));
  } catch (error) {
    if (error instanceof HttpError) return reply({ error: error.message }, error.status);
    console.error(error);
    void reportAlert({ type: "server", message: errorMessage(error), path: "/api/solo" });
    return reply({ error: "Une erreur empêche cette action. Réessaie dans un instant." }, 500);
  }
}
