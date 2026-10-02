import { expect, test } from "vitest";
import { alertLabel, cronStatus, safePath } from "@/lib/monitoring";

const HOUR = 3600_000;

test("état d’une tâche planifiée : jamais lancée, échec, en retard, OK", () => {
  const now = Date.now();
  const run = (hoursAgo: number, success: boolean) => ({
    startedAt: new Date(now - hoursAgo * HOUR),
    success,
  });
  expect(cronStatus(null, 26, now)).toBe("never");
  expect(cronStatus(run(1, true), 26, now)).toBe("ok");
  expect(cronStatus(run(25, true), 26, now)).toBe("ok");
  expect(cronStatus(run(27, true), 26, now)).toBe("late");
  // A failed run is a failure even when it is recent.
  expect(cronStatus(run(1, false), 26, now)).toBe("failed");
});

test("le chemin gardé dans une alerte ne contient ni jeton ni paramètres", () => {
  expect(safePath("/reinitialiser/BQ-IzQChIkrhGwBDekDckkk3v9Woz3Adkg?x=1")).toBe("/reinitialiser/…");
  expect(safePath("/api/media/11111111-2222-3333-4444-555555555555")).toBe("/api/media/…");
  expect(safePath("/app/abonnement?paiement=pack#haut")).toBe("/app/abonnement");
  expect(safePath("/partie/939872")).toBe("/partie/939872");
});

test("un type d’alerte inconnu garde son nom", () => {
  expect(alertLabel("server")).toBe("Erreur serveur");
  expect(alertLabel("autre")).toBe("autre");
});
