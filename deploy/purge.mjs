// Daily clean-up that makes the privacy policy's retention periods real.
// Runs on the VPS from the app folder (cron, see deploy/setup-server.sh): node purge.mjs
import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DAY = 86400_000;
const now = Date.now();
const ago = (days) => new Date(now - days * DAY);
const mediaDir = path.resolve(process.env.MEDIA_DIR || "/opt/squizz-media");
const report = {};

async function run() {
  // Games, players and answers: 24 hours (players and answers follow by cascade).
  report.parties = (await prisma.room.deleteMany({ where: { created: { lt: BigInt(now - DAY) } } })).count;
  // Sensitive-action log: 12 months.
  report.journal = (await prisma.auditLog.deleteMany({ where: { createdAt: { lt: ago(365) } } })).count;
  // Contact form messages: 3 years after receipt.
  report.contact = (await prisma.contactMessage.deleteMany({ where: { createdAt: { lt: ago(3 * 365) } } })).count;
  // Throttling counters, finished or expired invitations and password links.
  report.compteurs = (await prisma.rateLimit.deleteMany({ where: { windowEnd: { lt: ago(1) } } })).count;
  report.invitations = (
    await prisma.invitation.deleteMany({
      where: { OR: [{ expiresAt: { lt: ago(1) } }, { acceptedAt: { lt: ago(30) } }] },
    })
  ).count;
  report.liens = (
    await prisma.passwordResetToken.deleteMany({ where: { OR: [{ expiresAt: { lt: ago(1) } }, { usedAt: { not: null } }] } })
  ).count;

  // Media no longer used by any quiz or live game of its organisation (after a 1-day grace period,
  // so a file uploaded into an unsaved draft is not removed).
  const candidates = await prisma.media.findMany({ where: { createdAt: { lt: ago(1) } }, select: { id: true, organizationId: true } });
  const byOrg = new Map();
  for (const m of candidates) byOrg.set(m.organizationId, [...(byOrg.get(m.organizationId) ?? []), m.id]);
  let unused = 0;
  for (const [organizationId, ids] of byOrg) {
    const [quizzes, rooms] = await Promise.all([
      prisma.quiz.findMany({ where: { organizationId }, select: { questions: true } }),
      prisma.room.findMany({ where: { organizationId }, select: { quiz: true } }),
    ]);
    const used = JSON.stringify([quizzes, rooms]);
    for (const id of ids)
      if (!used.includes(id)) {
        await prisma.media.delete({ where: { id } });
        await rm(path.join(mediaDir, id), { force: true });
        unused++;
      }
  }
  report.medias = unused;

  // Files left on disk without a database row (e.g. after an organisation was deleted).
  const known = new Set((await prisma.media.findMany({ select: { id: true } })).map((m) => m.id));
  let orphans = 0;
  for (const name of await readdir(mediaDir).catch(() => [])) {
    if (!/^[a-f0-9-]{36}$/.test(name) || known.has(name)) continue;
    const info = await stat(path.join(mediaDir, name));
    if (now - info.mtimeMs > DAY) {
      await rm(path.join(mediaDir, name), { force: true });
      orphans++;
    }
  }
  report.fichiers = orphans;
}

run()
  .then(() => console.log(`${new Date().toISOString()} purge OK ${JSON.stringify(report)}`))
  .catch((err) => {
    console.error(`${new Date().toISOString()} purge ÉCHEC`, err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
