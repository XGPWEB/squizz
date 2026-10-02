-- Event pass: a one-off payment that gives the Premium limits for a few days, without a subscription.
ALTER TABLE "Organization" ADD COLUMN "eventPassUntil" TIMESTAMP(3);

CREATE TABLE "EventPass" (
    "sessionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventPass_pkey" PRIMARY KEY ("sessionId")
);

CREATE INDEX "EventPass_organizationId_idx" ON "EventPass"("organizationId");

ALTER TABLE "EventPass" ADD CONSTRAINT "EventPass_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
