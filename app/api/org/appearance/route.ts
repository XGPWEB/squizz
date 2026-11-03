import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { brandOf, isHex } from "@/lib/brand";
import { isPaid, orgLimits } from "@/lib/plans";
import { json, route } from "@/lib/server/api";
import { audit } from "@/lib/server/audit";
import { requireMember, requireOrgAdmin } from "@/lib/server/guard";
import { fail } from "@/lib/server/http";

const LOGO_MAX = 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** Whether the organisation may hide the « SQuizz » credit: paid plans, partners and event passes. */
const mayHideCredit = (org: Parameters<typeof orgLimits>[0] & { plan: Parameters<typeof isPaid>[0] }) =>
  isPaid(org.plan) || org.partner || (!!org.eventPassUntil && org.eventPassUntil > new Date());

/** The look of the organisation's games, for every member (the editor shows it in previews). */
export const GET = route(async () => {
  const user = await requireMember();
  return { brand: brandOf(user.organization), mayHideCredit: mayHideCredit(user.organization) };
});

const schema = z.object({
  theme: z.enum(["squizz", "sober"]),
  accent: z.string().refine(isHex, "Couleur invalide : un code comme #1F4E8C."),
  logo: z.string().nullable(),
  credit: z.boolean(),
});

export const PATCH = route(async (req) => {
  const user = await requireOrgAdmin();
  const input = await json(req, schema);
  if (input.logo !== null) {
    const id = /^\/api\/media\/([a-f0-9-]{36})$/.exec(input.logo)?.[1];
    const media = id
      ? await prisma.media.findFirst({ where: { id, organizationId: user.organizationId } })
      : null;
    if (!media) fail("Logo introuvable : envoyez-le à nouveau.");
    if (!IMAGE_TYPES.includes(media.mime)) fail("Le logo doit être une image PNG, JPG, WebP ou GIF.");
    if (media.size > LOGO_MAX) fail("Logo trop lourd : 1 Mo au plus.");
  }
  if (!input.credit && !mayHideCredit(user.organization))
    fail("Masquer la mention SQuizz est réservé aux offres payantes.", 403);
  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      theme: input.theme === "sober" ? "SOBER" : "SQUIZZ",
      brandAccent: input.accent.toUpperCase(),
      brandLogo: input.logo,
      brandCredit: input.credit,
    },
  });
  await audit(user, "organization.appearance", user.organizationId, { theme: input.theme });
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });
  return { brand: brandOf(org) };
});
