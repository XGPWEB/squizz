-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "kicked" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Answer_code_question_idx" ON "Answer"("code", "question");
