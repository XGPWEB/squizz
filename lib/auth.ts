import "server-only";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clearRateLimit, clientIp, rateLimit } from "@/lib/server/rate-limit";

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
/** Compared against when the account does not exist, so the response time never reveals it. */
const DUMMY_HASH = bcrypt.hashSync("squizz-compte-inexistant", 12);
const WINDOW = 15 * 60;

if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET)
  throw new Error("AUTH_SECRET est obligatoire en production.");

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  secret: process.env.AUTH_SECRET,
  pages: { signIn: "/connexion" },
  providers: [
    CredentialsProvider({
      name: "Email et mot de passe",
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials, req) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();
        // Throttle before touching bcrypt so brute force costs the attacker, not the server.
        // No account is ever locked outright (that would let anyone lock anyone out): the tight
        // limit applies to one address guessing one account, looser ones to each side alone.
        const ip = clientIp(req?.headers);
        const pairKey = `login:pair:${ip}:${email}`;
        if (!(await rateLimit(pairKey, 8, WINDOW)).allowed)
          throw new Error("Trop de tentatives. Réessayez dans 15 minutes.");
        if (!(await rateLimit(`login:ip:${ip}`, 30, WINDOW)).allowed)
          throw new Error("Trop de tentatives depuis votre adresse. Réessayez plus tard.");
        if (!(await rateLimit(`login:email:${email}`, 60, WINDOW)).allowed)
          throw new Error("Trop de tentatives sur ce compte. Réessayez plus tard.");

        const user = await prisma.user.findUnique({ where: { email }, include: { organization: true } });
        const valid = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
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
        return { id: user.id, email: user.email, name: user.name, sessionVersion: user.sessionVersion };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.sessionVersion = (user as unknown as { sessionVersion: number }).sessionVersion;
        return token;
      }
      // Re-checked on every read, so a password change or deactivation logs the user out everywhere.
      if (typeof token.id !== "string") return token;
      const current = await prisma.user.findUnique({
        where: { id: token.id },
        select: { sessionVersion: true, active: true },
      });
      if (!current || !current.active || current.sessionVersion !== token.sessionVersion)
        throw new Error("SESSION_REVOKED");
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
};
