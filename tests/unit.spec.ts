import { test } from "vitest";

// The checks are plain assertion scripts (also runnable with `node --experimental-strip-types`).
test("types de questions, diapos et validation", async () => {
  await import("./question-types.test.mjs");
});
test("classement, égalités et progression", async () => {
  await import("./ranking.test.mjs");
});
test("lien d’invitation depuis un aperçu local", async () => {
  await import("./invitation.test.mjs");
});
