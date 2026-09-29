// Creates (or reactivates) the platform super-admin on the server and prints a one-hour link
// to choose its password, so no password is ever typed into a terminal or sent anywhere.
// Usage (on the VPS, from /opt/squizz/app): node create-super-admin.mjs email@example.com
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Usage : node create-super-admin.mjs email@exemple.fr");
  process.exit(1);
}
const prisma = new PrismaClient();
const unusable = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
const user = await prisma.user.upsert({
  where: { email },
  update: { role: "SUPER_ADMIN", active: true },
  create: { email, name: "Super-admin SQuizz", passwordHash: unusable, role: "SUPER_ADMIN" },
});
const token = randomBytes(32).toString("base64url");
await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
await prisma.passwordResetToken.create({
  data: {
    tokenHash: createHash("sha256").update(token).digest("hex"),
    userId: user.id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  },
});
const base = (process.env.APP_URL || "https://www.squizz.fun").replace(/\/$/, "");
console.log(`Super-admin : ${email}\nChoisissez le mot de passe ici (valable 1 heure) :\n${base}/reinitialiser/${token}`);
await prisma.$disconnect();
