-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "checkoutLockedUntil" TIMESTAMP(3),
ADD COLUMN     "checkoutPlan" "Plan",
ADD COLUMN     "checkoutSessionId" TEXT;

