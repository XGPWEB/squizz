-- Self-paced games: a link to play a quiz alone, at one's own pace, and each participant's go at it.
ALTER TABLE "Room" ADD COLUMN "replayId" TEXT;
CREATE TABLE "SoloSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hostId" TEXT,
    "title" TEXT NOT NULL,
    "quiz" JSONB NOT NULL,
    "brand" JSONB,
    "maxPlayers" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    CONSTRAINT "SoloSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SoloSession_organizationId_idx" ON "SoloSession"("organizationId");
CREATE INDEX "SoloSession_expiresAt_idx" ON "SoloSession"("expiresAt");
ALTER TABLE "SoloSession" ADD CONSTRAINT "SoloSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "SoloRun" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "player" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "index" INTEGER NOT NULL DEFAULT 0,
    "startedAt" BIGINT NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '[]',
    "score" INTEGER NOT NULL DEFAULT 0,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SoloRun_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SoloRun_sessionId_player_key" ON "SoloRun"("sessionId", "player");
CREATE UNIQUE INDEX "SoloRun_sessionId_name_key" ON "SoloRun"("sessionId", "name");
ALTER TABLE "SoloRun" ADD CONSTRAINT "SoloRun_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SoloSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
