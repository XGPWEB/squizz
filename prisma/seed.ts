import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Creates (or updates the password of) the platform super-admin from SEED_SUPER_ADMIN_*.
 * With SEED_DEMO=1 it also creates a demo organisation for local development.
 */
async function main() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  if (!email || !password || password.length < 10)
    throw new Error(
      "Définissez SEED_SUPER_ADMIN_EMAIL et SEED_SUPER_ADMIN_PASSWORD (10 caractères minimum).",
    );
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "SUPER_ADMIN",
      active: true,
      sessionVersion: { increment: 1 },
      emailVerifiedAt: new Date(),
    },
    create: {
      email,
      name: "Super-admin SQuizz",
      passwordHash,
      role: "SUPER_ADMIN",
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`Super-admin prêt : ${email}`);

  if (process.env.SEED_DEMO === "1") {
    const demoPassword = process.env.SEED_DEMO_PASSWORD || password;
    const hash = await bcrypt.hash(demoPassword, 12);
    const existing = await prisma.user.findUnique({ where: { email: "admin@demo.squizz.fun" } });
    if (!existing) {
      await prisma.organization.create({
        data: {
          name: "Organisation de démo",
          users: {
            create: [
              {
                email: "admin@demo.squizz.fun",
                name: "Alice Admin",
                passwordHash: hash,
                role: "ORG_ADMIN",
                emailVerifiedAt: new Date(),
              },
              {
                email: "animateur@demo.squizz.fun",
                name: "Hugo Animateur",
                passwordHash: hash,
                role: "HOST",
                emailVerifiedAt: new Date(),
              },
            ],
          },
        },
      });
    }
    console.log("Organisation de démo prête : admin@demo.squizz.fun / animateur@demo.squizz.fun");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
