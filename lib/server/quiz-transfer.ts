import "server-only";
import { readFile } from "node:fs/promises";
import type { Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { orgLimits } from "@/lib/plans";
import { formatSize } from "@/lib/media-limits";
import { validateProfiles } from "@/lib/profiles";
import { validateQuestion, type Question } from "@/lib/question";
import { MAX_TRANSFER_MEDIA_BYTES, TRANSFER_REF, assignRefs } from "@/lib/quiz-file";
import { fail, validated } from "./http";
import { checkMedia, isMediaId, mediaPath, removeMedia, storeMedia } from "./media-store";
import { createQuiz, findQuiz, type OrgQuiz } from "./quiz-store";
import type { SessionUser } from "./guard";

/**
 * A quiz in one file (.squizz): its title, its questions and the organisation's media it uses, embedded
 * in base64, so it can be saved, sent and imported into any SQuizz space. Media references inside the
 * questions become « squizz-media:<n> » and point to `files`.
 */
export type QuizFile = {
  format: "squizz-quiz";
  version: 1;
  exportedAt: string;
  title: string;
  questions: Question[];
  files: { ref: string; mime: string; data: string }[];
};

const tooBig = (bytes: number) =>
  `Ce quiz contient ${formatSize(bytes)} de médias : au-delà de ${formatSize(MAX_TRANSFER_MEDIA_BYTES)}, il ne peut pas tenir dans un fichier .squizz. Remplacez les vidéos lourdes par des liens YouTube, ou allégez les médias.`;

type Member = SessionUser & { organizationId: string; organization: { plan: Plan; partner: boolean } };

/**
 * Exports a quiz. Every distinct media file of the organisation gets its own reference, reused wherever
 * the same file appears; references are assigned before anything is read, so parallel reads cannot share
 * one. A quiz whose media would not fit an import is refused with an explanation, never exported as a
 * file that cannot be imported back.
 */
export async function exportQuiz(user: Member, id: unknown): Promise<QuizFile> {
  const quiz = await findQuiz(user, id);
  if (!quiz) fail("Quiz introuvable.", 404);
  const candidates = quiz.questions.flatMap((q) =>
    q.media.map((m) => (m.url.startsWith("/api/media/") ? m.url.slice("/api/media/".length) : "")),
  );
  // Only this organisation's own files are embedded; external links and Originals' illustrations stay links.
  const owned = await prisma.media.findMany({
    where: { organizationId: user.organizationId, id: { in: candidates.filter(isMediaId) } },
    select: { id: true, mime: true, size: true },
  });
  const byId = new Map(owned.map((m) => [m.id, m]));
  const total = owned.reduce((n, m) => n + m.size, 0);
  if (total > MAX_TRANSFER_MEDIA_BYTES) fail(tooBig(total), 413);
  const refs = assignRefs(candidates.filter((c) => byId.has(c)));
  const files = await Promise.all(
    [...refs].map(async ([mediaId, ref]) => ({
      ref,
      mime: byId.get(mediaId)!.mime,
      data: (await readFile(mediaPath(mediaId))).toString("base64"),
    })),
  );
  const questions = quiz.questions.map((q) => ({
    ...q,
    media: q.media.map((m) => {
      const ref = refs.get(m.url.slice("/api/media/".length));
      return m.url.startsWith("/api/media/") && ref ? { ...m, url: `${TRANSFER_REF}${ref}` } : m;
    }),
  }));
  return {
    format: "squizz-quiz",
    version: 1,
    exportedAt: new Date().toISOString(),
    title: quiz.title,
    questions,
    files,
  };
}

/** A media URL that passes validation, standing for a file not stored yet. */
const PLACEHOLDER = "/api/media/00000000-0000-4000-8000-000000000000";

/**
 * Imports a .squizz file as a new quiz of the person's organisation, with the same checks as the editor and
 * the photo upload, within the quiz and media quotas.
 *
 * Order matters: (1) a repeated request (same `clientKey`) returns the quiz already created, even when the
 * quota is now reached; (2) everything is validated — file, questions, every media file, quotas — before
 * anything is stored; (3) media are stored, then the quiz; (4) if anything fails, or if a concurrent
 * request with the same key created the quiz first, the media stored by this request are removed. A
 * refused import leaves no quiz, no file and no quota used.
 */
export async function importQuiz(user: Member, raw: unknown, clientKey?: unknown): Promise<OrgQuiz> {
  const file = raw as Partial<QuizFile> | null;
  if (!file || file.format !== "squizz-quiz" || file.version !== 1 || !Array.isArray(file.questions))
    fail("Ce fichier n’est pas un quiz SQuizz (.squizz).");

  if (typeof clientKey === "string") {
    const done = await prisma.quiz.findFirst({ where: { organizationId: user.organizationId, clientKey } });
    if (done) return (await findQuiz(user, done.id)) as OrgQuiz;
  }

  // --- Validate everything first, storing nothing ---------------------------------------------------------
  const files = Array.isArray(file.files) ? file.files : [];
  if (files.length > 120) fail("Trop de médias dans ce fichier.");
  const refOf = (m: unknown) => {
    const url = (m as { url?: unknown } | null)?.url;
    return typeof url === "string" && url.startsWith(TRANSFER_REF) ? url.slice(TRANSFER_REF.length) : null;
  };
  const mediaOf = (q: unknown): unknown[] => {
    const media = (q as { media?: unknown } | null)?.media;
    return Array.isArray(media) ? media : [];
  };
  const used = new Set(file.questions.flatMap((q) => mediaOf(q).map(refOf)).filter((r) => r !== null));
  const decoded = new Map<string, { bytes: Uint8Array; mime: string }>();
  for (const f of files) {
    if (!f || typeof f.ref !== "string" || !used.has(f.ref)) continue;
    if (decoded.has(f.ref)) fail("Fichier .squizz incohérent : deux médias portent la même référence.");
    if (typeof f.mime !== "string" || typeof f.data !== "string") fail("Média illisible dans ce fichier.");
    const bytes = new Uint8Array(Buffer.from(f.data, "base64"));
    checkMedia(bytes, f.mime);
    decoded.set(f.ref, { bytes, mime: f.mime });
  }
  for (const ref of used)
    if (!decoded.has(ref)) fail("Fichier .squizz incomplet : un média référencé est absent.");
  const total = [...decoded.values()].reduce((n, f) => n + f.bytes.length, 0);
  if (total > MAX_TRANSFER_MEDIA_BYTES) fail(tooBig(total), 413);

  const withUrls = (urls: Map<string, string> | null) =>
    file.questions!.map((q) => ({
      ...(q as object),
      media: mediaOf(q).map((m) => {
        const ref = refOf(m);
        return ref === null ? m : { ...(m as object), url: urls ? urls.get(ref) : PLACEHOLDER };
      }),
    }));
  if (typeof file.title !== "string" || !file.title.trim() || file.title.length > 90)
    fail("Ajoutez un titre et de 1 à 30 questions.");
  if (file.questions.length < 1 || file.questions.length > 30)
    fail("Ajoutez un titre et de 1 à 30 questions.");
  validated(() => validateProfiles(withUrls(null).map(validateQuestion)));

  const limits = orgLimits(user.organization);
  const [quizzes, usage] = await Promise.all([
    prisma.quiz.count({ where: { organizationId: user.organizationId } }),
    prisma.media.aggregate({ where: { organizationId: user.organizationId }, _sum: { size: true } }),
  ]);
  if (limits.maxQuizzes !== null && quizzes >= limits.maxQuizzes)
    fail(
      `Votre offre permet ${limits.maxQuizzes} quiz. Supprimez-en un ou passez à une offre supérieure (page Tarifs).`,
      403,
    );
  if ((usage._sum.size ?? 0) + total > limits.mediaBytes)
    fail(
      `Ce quiz contient ${formatSize(total)} de médias : votre organisation dépasserait sa limite de ${formatSize(limits.mediaBytes)}. Passez à une offre supérieure (page Tarifs) ou libérez de la place.`,
      429,
    );

  // --- Store, then create; undo the media on any failure ---------------------------------------------------
  const urls = new Map<string, string>();
  try {
    for (const [ref, f] of decoded) urls.set(ref, await storeMedia(user, f.bytes, f.mime));
    const quiz = await createQuiz(user, { title: file.title, questions: withUrls(urls) }, clientKey);
    // A concurrent request with the same key may have created the quiz first: keep only what it uses.
    const kept = new Set(quiz.questions.flatMap((q) => q.media.map((m) => m.url)));
    await removeMedia(
      user.organizationId,
      [...urls.values()].filter((u) => !kept.has(u)),
    );
    return quiz;
  } catch (e) {
    await removeMedia(user.organizationId, [...urls.values()]).catch(() => null);
    throw e;
  }
}
