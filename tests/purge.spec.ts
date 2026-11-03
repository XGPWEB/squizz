import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { expect, test, vi } from "vitest";

test("la purge conserve les médias et logos des instantanés autonomes, mais retire les vrais orphelins", async () => {
  const media = ["solo-image", "solo-logo", "unused"].map((id) => ({ id, organizationId: "org" }));
  const empty = () => ({ deleteMany: async () => ({ count: 0 }), findMany: async () => [] });
  const deleted = vi.fn(async () => ({}));
  const removed = vi.fn(async () => {});
  let disconnect!: () => void;
  const completed = new Promise<void>((resolve) => {
    disconnect = resolve;
  });
  const db = {
    room: empty(),
    quiz: empty(),
    gameReport: empty(),
    auditLog: empty(),
    contactMessage: empty(),
    rateLimit: empty(),
    invitation: empty(),
    emailVerificationToken: empty(),
    systemAlert: empty(),
    passwordResetToken: empty(),
    soloSession: {
      ...empty(),
      findMany: async () => [
        {
          quiz: { questions: [{ media: [{ url: "/api/media/solo-image" }] }] },
          brand: { logo: "/api/media/solo-logo" },
        },
      ],
    },
    organization: { ...empty(), findUnique: async () => ({ brandLogo: null }) },
    media: { findMany: async () => media, delete: deleted },
    cronRun: { ...empty(), create: async () => ({}) },
    $disconnect: async () => disconnect(),
  };
  const processStub = { env: { MEDIA_DIR: "/mock-media" }, exitCode: 0 };
  const errors = vi.fn();
  const source = await readFile(new URL("../deploy/purge.mjs", import.meta.url), "utf8");
  vm.runInNewContext(source.replace(/^import .*;\n/gm, "").replace("new PrismaClient()", "mockPrisma"), {
    mockPrisma: db,
    path,
    process: processStub,
    console: { log: vi.fn(), error: errors },
    readdir: async () => [],
    rm: removed,
    stat: async () => ({ mtimeMs: Date.now() }),
  });
  await completed;
  expect(errors).not.toHaveBeenCalled();
  expect(processStub.exitCode).toBe(0);
  expect(deleted.mock.calls).toEqual([[{ where: { id: "unused" } }]]);
  expect(removed.mock.calls).toEqual([["/mock-media/unused", { force: true }]]);
});
