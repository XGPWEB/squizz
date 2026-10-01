import "server-only";
import { prisma } from "@/lib/prisma";
import { EMAIL_NOT_VERIFIED } from "@/lib/auth-messages";
import { KNOWN_DEVICE_S, LOGIN_WINDOW_S, loginRefusal } from "@/lib/login-throttle";
import { clearRateLimit, clientIp, limitScale, peekRateLimit, rateLimit } from "./rate-limit";
import { hashToken } from "./tokens";
import { hashPassword, hashPasswordSync, verifyPassword } from "./passwords";

/** Compared against when the account does not exist, so the response time never reveals it. */
const DUMMY_HASH = hashPasswordSync("squizz-compte-inexistant");

/**
 * Email + password check shared by the client login and the super-admin login. Returns the user,
 * or null for wrong credentials; throws a French message when throttled or suspended.
 */
export async function verifyCredentials(rawEmail: string, password: string, headers?: unknown) {
  const email = rawEmail.trim().toLowerCase();
  const ip = clientIp(headers as Parameters<typeof clientIp>[0]);
  const pairKey = `login:pair:${ip}:${email}`;
  const accountKey = `login:email:${email}`;
  // Hashed so the table never lists which address each person signs in from.
  const knownKey = `login:known:${hashToken(`${email}|${ip}`)}`;
  // Throttle before touching bcrypt so brute force costs the attacker, not the server (lib/login-throttle.ts).
  const [pairFailures, accountFailures, known] = await Promise.all([
    peekRateLimit(pairKey),
    peekRateLimit(accountKey),
    peekRateLimit(knownKey).then((n) => n > 0),
  ]);
  const ipAttempts = (await rateLimit(`login:ip:${ip}`, Number.MAX_SAFE_INTEGER, LOGIN_WINDOW_S)).count;
  const refusal = loginRefusal(
    { pairFailures, ipAttempts: ipAttempts - 1, accountFailures, known },
    limitScale(),
  );
  if (refusal) throw new Error(refusal);

  const user = await prisma.user.findUnique({ where: { email }, include: { organization: true } });
  const { ok: valid, upgrade } = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.active || !valid) {
    // Only failures count against the account, so the owner's own sign-ins never use up its allowance.
    await Promise.all([
      rateLimit(pairKey, Number.MAX_SAFE_INTEGER, LOGIN_WINDOW_S),
      rateLimit(accountKey, Number.MAX_SAFE_INTEGER, LOGIN_WINDOW_S),
    ]);
    return null;
  }
  if (user.organization?.status === "SUSPENDED")
    throw new Error("Votre organisation est suspendue. Contactez le support SQuizz.");
  // Checked only after the right password, so it never reveals whether an address has an account.
  if (!user.emailVerifiedAt && user.role !== "SUPER_ADMIN") throw new Error(EMAIL_NOT_VERIFIED);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      // A hash from before the current scheme is replaced now that the password is known to be right.
      ...(upgrade && { passwordHash: await hashPassword(password) }),
    },
  });
  // Only this address+account counter is reset: a successful login must not refill an
  // attacker's allowance for other accounts. This address becomes « known » for this account.
  await clearRateLimit(pairKey);
  await rateLimit(knownKey, Number.MAX_SAFE_INTEGER, KNOWN_DEVICE_S);
  return user;
}
