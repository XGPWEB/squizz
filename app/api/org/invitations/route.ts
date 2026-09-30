import { z } from "zod";
import { route, json, emailSchema } from "@/lib/server/api";
import { requireOrgAdmin } from "@/lib/server/guard";
import { createInvitation } from "@/lib/server/accounts";
import { audit } from "@/lib/server/audit";
import { rateLimit } from "@/lib/server/rate-limit";
import { fail } from "@/lib/server/http";

const schema = z.object({ email: emailSchema, role: z.enum(["HOST", "ORG_ADMIN"]) });

/** Returns the link too, so the admin can share it even without email configured. */
export const POST = route(async (req) => {
  const user = await requireOrgAdmin();
  const input = await json(req, schema);
  // Counted when sent and never refunded on cancel, so invite/cancel loops cannot mass-mail anyone.
  if (!(await rateLimit(`invite:${user.organizationId}`, 30, 24 * 60 * 60)).allowed)
    fail("Limite de 30 invitations par jour atteinte. Réessayez demain ou écrivez-nous.", 429);
  const { link, sent } = await createInvitation(
    user.organizationId,
    input.email,
    input.role,
    user.id,
    user.name,
  );
  await audit(user, "invitation.create", user.organizationId, input);
  return { link, sent };
});
