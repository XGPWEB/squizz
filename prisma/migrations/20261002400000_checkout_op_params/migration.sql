-- The exact parameters sent to Stripe for the checkout being prepared: a resumed operation repeats them
-- unchanged, as Stripe requires for a repeated idempotency key.
ALTER TABLE "Organization" ADD COLUMN "checkoutOpParams" JSONB;
