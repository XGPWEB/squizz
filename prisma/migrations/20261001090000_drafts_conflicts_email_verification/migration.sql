-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "clientKey" TEXT,
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "clientKey" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_organizationId_clientKey_key" ON "Quiz"("organizationId", "clientKey");

-- CreateIndex
CREATE UNIQUE INDEX "Room_organizationId_clientKey_key" ON "Room"("organizationId", "clientKey");

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Existing accounts keep signing in: they were created before email verification existed (signup) or
-- proved their address by accepting an emailed invitation. Super-admins are never blocked by it either.
UPDATE "User" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL;
