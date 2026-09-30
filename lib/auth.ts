import "server-only";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyCredentials } from "@/lib/server/credentials";

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

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
        const user = await verifyCredentials(parsed.data.email, parsed.data.password, req?.headers);
        if (!user) return null;
        // The super-admin signs in through its own space (/super-admin/connexion), with its own cookie.
        if (user.role === "SUPER_ADMIN") throw new Error("Ce compte se connecte par l’espace super-admin.");
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
