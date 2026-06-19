ALTER TABLE "maintenance_visits" ALTER COLUMN "visit_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_visits" ADD COLUMN "assigned_team_name" text;