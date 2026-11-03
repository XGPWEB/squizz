-- Quiz generation with the organisation's own AI account: provider, encrypted key, its hint, model.
ALTER TABLE "Organization" ADD COLUMN "aiProvider" TEXT;
ALTER TABLE "Organization" ADD COLUMN "aiKey" TEXT;
ALTER TABLE "Organization" ADD COLUMN "aiKeyHint" TEXT;
ALTER TABLE "Organization" ADD COLUMN "aiModel" TEXT;
