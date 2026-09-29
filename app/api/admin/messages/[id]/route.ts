import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, json } from "@/lib/server/api";
import { requireSuperAdmin } from "@/lib/server/guard";
import { fail } from "@/lib/server/http";

export const PATCH = route<{ id: string }>(async (req, { id }) => {
  await requireSuperAdmin();
  const { handled } = await json(req, z.object({ handled: z.boolean() }));
  const { count } = await prisma.contactMessage.updateMany({ where: { id }, data: { handled } });
  if (!count) fail("Message introuvable.", 404);
});

export const DELETE = route<{ id: string }>(async (_, { id }) => {
  await requireSuperAdmin();
  const { count } = await prisma.contactMessage.deleteMany({ where: { id } });
  if (!count) fail("Message introuvable.", 404);
});
