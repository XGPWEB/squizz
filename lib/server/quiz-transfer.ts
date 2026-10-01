import "server-only";
import { readFile } from "node:fs/promises";
import type { Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { orgLimits } from "@/lib/plans";
import type { Question } from "@/lib/question";
import { fail } from "./http";
import { isMediaId, mediaPath, storeMedia } from "./media-store";
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

const REF = "squizz-media:";
/** The whole file, media included, must fit the server's upload limit (Nginx: 22 MB). */
export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

type Member = SessionUser & { organizationId: string; organization: { plan: Plan; partner: boolean } };

export async function exportQuiz(user: Member, id: unknown): Promise<QuizFile> {
  const quiz = await findQuiz(user, id);
  if (!quiz) fail("Quiz introuvable.", 404);
  const files: QuizFile["files"] = [];
  const refs = new Map<string, string>();
  const questions = await Promise.all(
    quiz.questions.map(async (q) => ({
      ...q,
      media: await Promise.all(
        q.media.map(async (m) => {
          const mediaId = m.url.startsWith("/api/media/") ? m.url.slice("/api/media/".length) : null;
          if (!mediaId || !isMediaId(mediaId)) return m; // external links and Originals' illustrations stay as they are
          if (!refs.has(mediaId)) {
            // Only this organisation's own files are embedded.
            const row = await prisma.media.findFirst({
              where: { id: mediaId, organizationId: user.organizationId },
            });
            if (!row) return m;
            const ref = String(files.length + 1);
            files.push({
              ref,
              mime: row.mime,
              data: (await readFile(mediaPath(mediaId))).toString("base64"),
            });
            refs.set(mediaId, ref);
          }
          return { ...m, url: `${REF}${refs.get(mediaId)}` };
        }),
      ),
    })),
  );
  return {
    format: "squizz-quiz",
    version: 1,
    exportedAt: new Date().toISOString(),
    title: quiz.title,
    questions,
    files,
  };
}

/**
 * Imports a .squizz file as a new quiz of the person's organisation: same checks as the editor and the
 * photo upload (question rules, file formats and real content, sizes), within the quiz and media quotas.
 * With a `clientKey`, a retried import returns the quiz created the first time.
 */
export async function importQuiz(user: Member, raw: unknown, clientKey?: unknown): Promise<OrgQuiz> {
  const file = raw as Partial<QuizFile> | null;
  if (!file || file.format !== "squizz-quiz" || file.version !== 1 || !Array.isArray(file.questions))
    fail("Ce fichier n’est pas un quiz SQuizz (.squizz).");
  const files = Array.isArray(file.files) ? file.files : [];
  if (files.length > 120) fail("Trop de médias dans ce fichier.");
  const total = files.reduce((n, f) => n + (typeof f?.data === "string" ? f.data.length * 0.75 : 0), 0);
  if (total > MAX_IMPORT_BYTES) fail("Fichier trop lourd : 20 Mo maximum, médias compris.", 413);

  // Fail early, before storing any file, when the quiz itself would not fit.
  const { maxQuizzes } = orgLimits(user.organization);
  if (
    maxQuizzes !== null &&
    (await prisma.quiz.count({ where: { organizationId: user.organizationId } })) >= maxQuizzes
  )
    fail(
      `Votre offre permet ${maxQuizzes} quiz. Supprimez-en un ou passez à une offre supérieure (page Tarifs).`,
      403,
    );
  if (typeof clientKey === "string") {
    const done = await prisma.quiz.findFirst({ where: { organizationId: user.organizationId, clientKey } });
    if (done) return (await findQuiz(user, done.id)) as OrgQuiz;
  }

  // Store only the files the questions use, each with the photo-upload checks.
  const used = new Set(
    file.questions.flatMap((q) =>
      Array.isArray(q?.media)
        ? q.media.map((m) => m?.url).filter((u) => typeof u === "string" && u.startsWith(REF))
        : [],
    ),
  );
  const urls = new Map<string, string>();
  for (const f of files) {
    if (!f || typeof f.ref !== "string" || !used.has(`${REF}${f.ref}`) || urls.has(f.ref)) continue;
    if (typeof f.mime !== "string" || typeof f.data !== "string") fail("Média illisible dans ce fichier.");
    urls.set(f.ref, await storeMedia(user, new Uint8Array(Buffer.from(f.data, "base64")), f.mime));
  }
  const questions = file.questions.map((q) => ({
    ...q,
    media: Array.isArray(q?.media)
      ? q.media.map((m) =>
          typeof m?.url === "string" && m.url.startsWith(REF)
            ? { ...m, url: urls.get(m.url.slice(REF.length)) ?? "" }
            : m,
        )
      : [],
  }));
  return createQuiz(user, { title: file.title, questions }, clientKey);
}
