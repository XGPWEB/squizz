-- The offer chosen on the pricing page before signing up: the space opens on it at the first sign-in.
ALTER TABLE "Organization" ADD COLUMN "wantedOffer" TEXT;
