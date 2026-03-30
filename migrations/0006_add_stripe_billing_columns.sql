ALTER TABLE "clubs" ADD COLUMN IF NOT EXISTS "stripe_customer_id" varchar;
--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" varchar;
--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN IF NOT EXISTS "active_users" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN IF NOT EXISTS "club_status" varchar DEFAULT 'active' NOT NULL;
