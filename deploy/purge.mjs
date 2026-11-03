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
const startedAt = new Date();

async function run() {
  // Games, players and answers: 24 hours (players and answers follow by cascade).
  report.parties = (await prisma.room.deleteMany({ where: { created: { lt: BigInt(now - DAY) } } })).count;
  // Self-paced links and their participations (nicknames, answers): one day after they close or expire.
  report.autonomie = (
    await prisma.soloSession.deleteMany({
      where: { OR: [{ expiresAt: { lt: ago(1) } }, { closedAt: { lt: ago(1) } }] },
    })
  ).count;
  // Results kept after the game (nicknames and answers): 12 months.
  report.resultats = (await prisma.gameReport.deleteMany({ where: { playedAt: { lt: ago(365) } } })).count;
  // Sensitive-action log: 12 months.
  report.journal = (await prisma.auditLog.deleteMany({ where: { createdAt: { lt: ago(365) } } })).count;
  // Contact form messages: 3 years after receipt.
  report.contact = (
    await prisma.contactMessage.deleteMany({ where: { createdAt: { lt: ago(3 * 365) } } })
  ).count;
  // Throttling counters, finished or expired invitations and password links.
  report.compteurs = (await prisma.rateLimit.deleteMany({ where: { windowEnd: { lt: ago(1) } } })).count;
  report.invitations = (
    await prisma.invitation.deleteMany({
      where: { OR: [{ expiresAt: { lt: ago(1) } }, { acceptedAt: { lt: ago(30) } }] },
    })
  ).count;
  report.verifications = (
    await prisma.emailVerificationToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: ago(1) } }, { usedAt: { lt: ago(1) } }] },
    })
  ).count;
  // Signups never confirmed after 7 days: the organisation (created empty with its only administrator) goes.
  const abandoned = await prisma.organization.findMany({
    where: {
      createdAt: { lt: ago(7) },
      // Never an organisation known to Stripe: those are deleted from the app, which cancels billing first.
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      users: { every: { emailVerifiedAt: null } },
      NOT: { users: { none: {} } },
    },
    select: { id: true },
  });
  report.inscriptions = (
    await prisma.organization.deleteMany({ where: { id: { in: abandoned.map((o) => o.id) } } })
  ).count;
  // Monitoring (alerts and runs of the scheduled tasks): 90 days, as MONITORING_RETENTION_DAYS says.
  report.alertes = (await prisma.systemAlert.deleteMany({ where: { createdAt: { lt: ago(90) } } })).count;
  await prisma.cronRun.deleteMany({ where: { startedAt: { lt: ago(90) } } });
  report.liens = (
    await prisma.passwordResetToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: ago(1) } }, { usedAt: { not: null } }] },
    })
  ).count;

  // Media no longer used by any quiz, live game or retained self-paced link, after a 7-day grace period: editor
  // drafts are kept 7 days in the browser (DRAFT_DAYS in lib/client/drafts.ts) and must keep their files.
  const candidates = await prisma.media.findMany({
    where: { createdAt: { lt: ago(7) } },
    select: { id: true, organizationId: true },
  });
  const byOrg = new Map();
  for (const m of candidates) byOrg.set(m.organizationId, [...(byOrg.get(m.organizationId) ?? []), m.id]);
  let unused = 0;
  for (const [organizationId, ids] of byOrg) {
    // The organisation's logo is a media file too.
    const [quizzes, rooms, solos, org] = await Promise.all([
      prisma.quiz.findMany({ where: { organizationId }, select: { questions: true } }),
      prisma.room.findMany({ where: { organizationId }, select: { quiz: true, brand: true } }),
      prisma.soloSession.findMany({ where: { organizationId }, select: { quiz: true, brand: true } }),
      prisma.organization.findUnique({ where: { id: organizationId }, select: { brandLogo: true } }),
    ]);
    const used = JSON.stringify([quizzes, rooms, solos, org]);
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

/** Shown on the super-admin's monitoring page (CronRun); a failure to record never changes the outcome. */
const record = (success, detail) =>
  prisma.cronRun
    .create({
      data: { job: "purge", startedAt, finishedAt: new Date(), success, detail: detail.slice(0, 500) },
    })
    .catch((err) => console.error("purge : exécution non enregistrée", err));

run()
  .then(async () => {
    console.log(`${new Date().toISOString()} purge OK ${JSON.stringify(report)}`);
    const removed = Object.values(report).reduce((a, b) => a + b, 0);
    await record(true, `${removed} élément${removed > 1 ? "s" : ""} supprimé${removed > 1 ? "s" : ""}`);
  })
  .catch(async (err) => {
    console.error(`${new Date().toISOString()} purge ÉCHEC`, err);
    process.exitCode = 1;
    await record(false, String(err?.message ?? err));
  })
  .finally(() => prisma.$disconnect());
