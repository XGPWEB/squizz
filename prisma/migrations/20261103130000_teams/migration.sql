-- Team mode: number of teams of a game, and the team of each player.
ALTER TABLE "Room" ADD COLUMN "teams" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Player" ADD COLUMN "team" INTEGER;
