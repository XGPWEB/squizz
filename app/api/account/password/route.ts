import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, json, nameSchema, passwordSchema } from "@/lib/server/api";
import { getSessionUser } from "@/lib/server/guard";
import { setPassword } from "@/lib/server/accounts";
import { fail } from "@/lib/server/http";

const schema = z.object({
  current: z.string().min(1, "Indique ton mot de passe actuel."),
  next: passwordSchema,
});

/** Changing the password signs the user out everywhere; the page signs them back in. */
export const POST = route(async (req) => {
  const user = await getSessionUser();
  if (!user) fail("Connecte-toi pour continuer.", 401);
  const input = await json(req, schema);
  const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await bcrypt.compare(input.current, row.passwordHash))) fail("Mot de passe actuel incorrect.", 403);
  await setPassword(user.id, input.next);
});

export const PATCH = route(async (req) => {
  const user = await getSessionUser();
  if (!user) fail("Connecte-toi pour continuer.", 401);
  const { name } = await json(req, z.object({ name: nameSchema }));
  await prisma.user.update({ where: { id: user.id }, data: { name } });
});
