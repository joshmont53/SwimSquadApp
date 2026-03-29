ALTER TABLE "clubs" ADD COLUMN IF NOT EXISTS "club_color" varchar DEFAULT '#4B9A4A';
UPDATE "clubs" SET "club_color" = '#4B9A4A' WHERE "club_color" IS NULL;
