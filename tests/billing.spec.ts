import { expect, test } from "vitest";

test("le faux Stripe des tests n’est jamais utilisé en production", async () => {
  const { stripeEndpoint } = await import("@/lib/server/billing");
  const base = "http://127.0.0.1:5175";
  expect(stripeEndpoint({ NODE_ENV: "test", STRIPE_API_BASE: base })).toEqual({
    host: "127.0.0.1",
    port: 5175,
    protocol: "http",
  });
  // In production the override is ignored: the client talks to Stripe itself.
  expect(stripeEndpoint({ NODE_ENV: "production", STRIPE_API_BASE: base })).toEqual({});
  expect(stripeEndpoint({ NODE_ENV: "development" })).toEqual({});
});
