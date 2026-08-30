CREATE TABLE "season_plans" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "club_id" varchar NOT NULL,
  "name" varchar NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "entries" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_by_user_id" varchar NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "record_status" varchar DEFAULT 'active' NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "season_plan_squads" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "season_plan_id" varchar NOT NULL,
  "squad_id" varchar NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "season_plan_squads_season_plan_id_squad_id_unique" UNIQUE("season_plan_id","squad_id")
);
--> statement-breakpoint
ALTER TABLE "season_plans" ADD CONSTRAINT "season_plans_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "season_plans" ADD CONSTRAINT "season_plans_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "season_plan_squads" ADD CONSTRAINT "season_plan_squads_season_plan_id_season_plans_id_fk" FOREIGN KEY ("season_plan_id") REFERENCES "public"."season_plans"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "season_plan_squads" ADD CONSTRAINT "season_plan_squads_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "season_plans_club_status_dates_idx" ON "season_plans" USING btree ("club_id","record_status","start_date","end_date","created_at");
--> statement-breakpoint
CREATE INDEX "season_plan_squads_squad_plan_idx" ON "season_plan_squads" USING btree ("squad_id","season_plan_id");