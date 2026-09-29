import { z } from "zod";
import { route, json, emailSchema } from "@/lib/server/api";
import { requireOrgAdmin } from "@/lib/server/guard";
import { createInvitation } from "@/lib/server/accounts";
import { audit } from "@/lib/server/audit";

const schema = z.object({ email: emailSchema, role: z.enum(["HOST", "ORG_ADMIN"]) });

/** Returns the link too, so the admin can share it even without email configured. */
export const POST = route(async (req) => {
  const user = await requireOrgAdmin();
  const input = await json(req, schema);
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
