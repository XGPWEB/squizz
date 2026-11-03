-- Look of the games: colourful SQuizz theme or sober theme with the organisation's colour and logo.
ALTER TABLE "Organization" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'SQUIZZ';
ALTER TABLE "Organization" ADD COLUMN "brandAccent" TEXT;
ALTER TABLE "Organization" ADD COLUMN "brandLogo" TEXT;
ALTER TABLE "Organization" ADD COLUMN "brandCredit" BOOLEAN NOT NULL DEFAULT true;
-- The look of a game, copied at launch.
ALTER TABLE "Room" ADD COLUMN "brand" JSONB;
