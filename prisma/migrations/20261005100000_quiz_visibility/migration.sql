-- Who sees a quiz in its organisation: a private draft, chosen members, or the whole team.
-- Existing quizzes stay visible to the whole team, as before.
CREATE TYPE "QuizVisibility" AS ENUM ('PRIVATE', 'SELECTED', 'TEAM');
ALTER TABLE "Quiz" ADD COLUMN "visibility" "QuizVisibility" NOT NULL DEFAULT 'TEAM';
ALTER TABLE "Quiz" ADD COLUMN "sharedWith" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
