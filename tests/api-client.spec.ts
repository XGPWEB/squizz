import { afterEach, expect, test, vi } from "vitest";
import { ApiError, postJson, UncertainError, withRetry } from "@/lib/client/api";

afterEach(() => vi.unstubAllGlobals());

const reply = (status: number, body: unknown) =>
  new Response(body === undefined ? "<html>erreur</html>" : JSON.stringify(body), { status });

test("une coupure ou un délai dépassé rend le résultat incertain", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
  await expect(postJson("/api/x", {})).rejects.toBeInstanceOf(UncertainError);
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")));
  await expect(postJson("/api/x", {})).rejects.toBeInstanceOf(UncertainError);
  // A gateway page (no JSON from SQuizz) is uncertain too.
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(504, undefined)));
  await expect(postJson("/api/x", {})).rejects.toBeInstanceOf(UncertainError);
});

test("un refus du serveur garde son message et ses détails", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(reply(409, { error: "Conflit", conflict: { version: 2 } })),
  );
  const err = await postJson("/api/x", {}).catch((e) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect(err.message).toBe("Conflit");
  expect(err.status).toBe(409);
  expect(err.details.conflict).toEqual({ version: 2 });
});

test("une action sûre à répéter est renvoyée une fois après un résultat incertain", async () => {
  const action = vi.fn().mockRejectedValueOnce(new UncertainError()).mockResolvedValueOnce("ok");
  await expect(withRetry(action)).resolves.toBe("ok");
  expect(action).toHaveBeenCalledTimes(2);
  // A real refusal is not retried.
  const refused = vi.fn().mockRejectedValue(new ApiError("Non", 403));
  await expect(withRetry(refused)).rejects.toBeInstanceOf(ApiError);
  expect(refused).toHaveBeenCalledTimes(1);
});
