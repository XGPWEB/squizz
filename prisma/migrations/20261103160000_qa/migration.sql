-- Questions from the audience: the wall of a game, its questions and their votes (deleted with the game).
ALTER TABLE "Room" ADD COLUMN "qaOpen" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Room" ADD COLUMN "qaModerated" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "QaQuestion" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "player" TEXT NOT NULL,
    "author" TEXT,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QaQuestion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "QaQuestion_code_idx" ON "QaQuestion"("code");
ALTER TABLE "QaQuestion" ADD CONSTRAINT "QaQuestion_code_fkey" FOREIGN KEY ("code") REFERENCES "Room"("code") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "QaVote" (
    "questionId" TEXT NOT NULL,
    "player" TEXT NOT NULL,
    CONSTRAINT "QaVote_pkey" PRIMARY KEY ("questionId","player")
);
ALTER TABLE "QaVote" ADD CONSTRAINT "QaVote_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QaQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
