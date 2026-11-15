import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

/**
 * scripts/restore-drill.sh against fake `psql` and `pg_dump` placed first in PATH: they log every call and
 * answer from environment switches. No real database is ever reached.
 */
const FAKE_PSQL = `#!/usr/bin/env bash
args="$*"
echo "psql $args" >> "$FAKE_LOG"
case "$args" in
  *"FROM pg_database"*) echo "\${FAKE_EXISTS:-0}"; exit 0 ;;
  *"CREATE DATABASE"*) [ -n "\${FAKE_CREATE_FAIL:-}" ] && { echo "ERROR: permission denied to create database" >&2; exit 1; }; exit 0 ;;
  *"DROP DATABASE"*) exit 0 ;;
  *"ON_ERROR_STOP"*) cat >/dev/null; [ -n "\${FAKE_RESTORE_FAIL:-}" ] && { echo "ERROR: syntax error" >&2; exit 3; }; exit 0 ;;
  *"FROM pg_tables"*) grep -E '^model ' prisma/schema.prisma | awk '{print $2}'; echo _prisma_migrations; exit 0 ;;
  *"SELECT migration_name"*)
    find prisma/migrations -mindepth 1 -maxdepth 1 -type d -exec basename {} \\; | sort | { [ -n "\${FAKE_MISSING_MIGRATION:-}" ] && tail -n +2 || cat; }
    exit 0 ;;
  *"finished_at IS NULL"*) echo 0; exit 0 ;;
  *"SELECT count(*) FROM"*)
    # The source answers FAKE_SOURCE_COUNT (default 1), the restored copy always 1.
    case "$args" in *"/squizz_restore_drill_"*) echo 1 ;; *) echo "\${FAKE_SOURCE_COUNT:-1}" ;; esac; exit 0 ;;
esac
exit 0
`;
const FAKE_PG_DUMP = `#!/usr/bin/env bash
echo "pg_dump $*" >> "$FAKE_LOG"
echo "COPY public.x (a) FROM stdin;"
`;

let dir: string, log: string, bin: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "restore-drill-"));
  bin = join(dir, "bin");
  log = join(dir, "calls.log");
  mkdirSync(bin);
  writeFileSync(join(bin, "psql"), FAKE_PSQL);
  writeFileSync(join(bin, "pg_dump"), FAKE_PG_DUMP);
  chmodSync(join(bin, "psql"), 0o755);
  chmodSync(join(bin, "pg_dump"), 0o755);
  writeFileSync(log, "");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function run(args: string[], env: Record<string, string> = {}) {
  const out = spawnSync("bash", ["scripts/restore-drill.sh", ...args], {
    encoding: "utf8",
    env: {
      NODE_ENV: "test",
      PATH: `${bin}:${process.env.PATH}`,
      HOME: process.env.HOME ?? "",
      FAKE_LOG: log,
      DATABASE_URL: "postgresql://drill@localhost:5432/squizz_source_test",
      ...env,
    },
  });
  const calls = readFileSync(log, "utf8").split("\n").filter(Boolean);
  return { code: out.status, text: out.stdout + out.stderr, calls };
}
const dump = () => {
  const file = join(dir, "squizz-test.sql.gz");
  writeFileSync(file, gzipSync("SELECT 1;\n"));
  return file;
};
const created = (calls: string[]) =>
  calls.filter((c) => c.includes("CREATE DATABASE")).map((c) => c.match(/"([^"]+)"/)![1]);
const dropped = (calls: string[]) =>
  calls.filter((c) => c.includes("DROP DATABASE")).map((c) => c.match(/"([^"]+)"/)![1]);

describe("exercice de restauration", () => {
  test("fichier absent : refus avant toute commande sur une base", () => {
    const r = run([join(dir, "absent.sql.gz")]);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/introuvable/);
    expect(r.calls).toEqual([]);
  });

  test("archive corrompue : refus avant toute commande sur une base", () => {
    const file = join(dir, "corrompue.sql.gz");
    writeFileSync(file, "pas du gzip");
    const r = run([file]);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/corrompue/);
    expect(r.calls).toEqual([]);
  });

  test("nom de base source douteux : refus avant toute commande", () => {
    const r = run([dump()], { DATABASE_URL: 'postgresql://x@localhost/squizz"; DROP DATABASE prod; --' });
    expect(r.code).toBe(1);
    expect(r.calls).toEqual([]);
  });

  test("échec de création : rien n’est supprimé", () => {
    const r = run([dump()], { FAKE_CREATE_FAIL: "1" });
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/création de la base d’exercice refusée/);
    expect(dropped(r.calls)).toEqual([]);
  });

  test("collision de nom : la base existante n’est ni recréée ni supprimée", () => {
    const r = run([dump()], { FAKE_EXISTS: "1" });
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/existe déjà/);
    expect(created(r.calls)).toEqual([]);
    expect(dropped(r.calls)).toEqual([]);
  });

  test("échec de restauration : seule la base créée par cette exécution est supprimée", () => {
    const r = run([dump()], { FAKE_RESTORE_FAIL: "1" });
    expect(r.code).toBe(1);
    expect(created(r.calls)).toHaveLength(1);
    expect(created(r.calls)[0]).toMatch(/^squizz_restore_drill_\d{14}_[0-9a-f]{8}$/);
    expect(dropped(r.calls)).toEqual(created(r.calls));
  });

  test("deux exécutions n’utilisent jamais le même nom", () => {
    const a = created(run([dump()]).calls)[0];
    writeFileSync(log, "");
    const b = created(run([dump()]).calls)[0];
    expect(a).not.toBe(b);
  });

  test("migration manquante, reconnue par son nom : échec", () => {
    const r = run([dump()], { FAKE_MISSING_MIGRATION: "1" });
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/migrations du code absentes de la sauvegarde : 20260929201953_init/);
    expect(dropped(r.calls)).toEqual(created(r.calls));
  });

  test("sans source de référence : jamais annoncé comme une réussite complète", () => {
    const r = run([dump()]);
    expect(r.code).toBe(3);
    expect(r.text).toMatch(/PARTIEL/);
    expect(r.text).not.toMatch(/RÉUSSI/);
  });

  test("source vivante : écarts listés, intégrité comparative non validée", () => {
    const r = run([], { FAKE_SOURCE_COUNT: "2" });
    expect(r.code).toBe(3);
    expect(r.text).toMatch(/Intégrité comparative NON validée/);
    expect(r.calls.some((c) => c.startsWith("pg_dump"))).toBe(true);
  });

  test("source figée, comparaison stricte : un écart fait échouer", () => {
    expect(run([], { RESTORE_DRILL_COMPARE: "strict", FAKE_SOURCE_COUNT: "2" }).code).toBe(1);
    writeFileSync(log, "");
    const ok = run([], { RESTORE_DRILL_COMPARE: "strict" });
    expect(ok.code).toBe(0);
    expect(ok.text).toMatch(/RÉUSSI/);
    expect(dropped(ok.calls)).toEqual(created(ok.calls));
  });

  test("le script ne contient plus de nom de base fixe à supprimer", () => {
    const src = readFileSync("scripts/restore-drill.sh", "utf8");
    expect(src).not.toMatch(/DROP DATABASE IF EXISTS "squizz_restore_drill"/);
    expect(src).not.toMatch(/RESTORE_DRILL_DB/);
  });
});
