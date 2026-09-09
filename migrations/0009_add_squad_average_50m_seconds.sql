ALTER TABLE "squads"
ADD COLUMN IF NOT EXISTS "average_50m_seconds" integer DEFAULT 60 NOT NULL;