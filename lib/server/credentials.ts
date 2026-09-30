import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { clearRateLimit, clientIp, rateLimit } from "./rate-limit";

/** Compared against when the account does not exist, so the response time never reveals it. */
const DUMMY_HASH = bcrypt.hashSync("squizz-compte-inexistant", 12);
const WINDOW = 15 * 60;

/**
 * Email + password check shared by the client login and the super-admin login. Returns the user,
 * or null for wrong credentials; throws a French message when throttled or suspended.
 */
export async function verifyCredentials(rawEmail: string, password: string, headers?: unknown) {
  const email = rawEmail.trim().toLowerCase();
  // Throttle before touching bcrypt so brute force costs the attacker, not the server.
  // No account is ever locked outright (that would let anyone lock anyone out): the tight
  // limit applies to one address guessing one account, looser ones to each side alone.
  const ip = clientIp(headers as Parameters<typeof clientIp>[0]);
  const pairKey = `login:pair:${ip}:${email}`;
  if (!(await rateLimit(pairKey, 8, WINDOW)).allowed)
    throw new Error("Trop de tentatives. Réessayez dans 15 minutes.");
  if (!(await rateLimit(`login:ip:${ip}`, 30, WINDOW)).allowed)
    throw new Error("Trop de tentatives depuis votre adresse. Réessayez plus tard.");
  if (!(await rateLimit(`login:email:${email}`, 60, WINDOW)).allowed)
    throw new Error("Trop de tentatives sur ce compte. Réessayez plus tard.");

  const user = await prisma.user.findUnique({ where: { email }, include: { organization: true } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.active || !valid) return null;
  if (user.organization?.status === "SUSPENDED")
    throw new Error("Votre organisation est suspendue. Contactez le support SQuizz.");
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  // Only this address+account counter is reset: a successful login must not refill an
  // attacker's allowance for other accounts.
  await clearRateLimit(pairKey);
  return user;
}
