-- Results of finished or interrupted games, kept 12 months (see deploy/purge.mjs).
CREATE TABLE "GameReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hostId" TEXT,
    "hostName" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL,
    "finished" BOOLEAN NOT NULL DEFAULT false,
    "players" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GameReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GameReport_organizationId_playedAt_idx" ON "GameReport"("organizationId", "playedAt");
ALTER TABLE "GameReport" ADD CONSTRAINT "GameReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
