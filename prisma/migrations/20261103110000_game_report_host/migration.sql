-- The host of a report is a link to the account (emptied when it is deleted) instead of a copied name.
ALTER TABLE "GameReport" DROP COLUMN "hostName";
ALTER TABLE "GameReport" ADD CONSTRAINT "GameReport_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
