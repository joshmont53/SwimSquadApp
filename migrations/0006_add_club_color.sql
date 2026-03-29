ALTER TABLE "clubs" ADD COLUMN IF NOT EXISTS "club_color" varchar DEFAULT '#4B9A4A';
UPDATE "clubs" SET "club_color" = '#4B9A4A' WHERE "club_color" IS NULL;
UPDATE "clubs" SET "club_color" = '#4B9A4A' WHERE "club_name" = 'Hart Swimming Club' AND ("club_color" IS NULL OR "club_color" = '#4B9A4A');
