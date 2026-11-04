-- Team mode: the team names chosen when the game is launched.
ALTER TABLE "Room" ADD COLUMN "teamNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
