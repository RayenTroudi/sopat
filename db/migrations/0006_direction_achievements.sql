-- Residential subtype distinguishes villas vs. collective housing for KPIs.
CREATE TYPE "public"."residential_subtype" AS ENUM('villa_privee', 'residence_collective', 'appartement');
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "residential_subtype" "residential_subtype";
--> statement-breakpoint
-- Realized revenue per project (TND or any project currency), entered at signoff.
ALTER TABLE "projects" ADD COLUMN "actual_revenue" numeric(14, 3);
--> statement-breakpoint
CREATE TABLE "portfolio_metrics_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_date" date NOT NULL,
	"metrics" jsonb NOT NULL,
	"created_at" timestamp NOT NULL DEFAULT now(),
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portfolio_metrics_snapshots" ADD CONSTRAINT "portfolio_metrics_snapshots_created_by_fkey"
	FOREIGN KEY ("created_by") REFERENCES "users"("id");
--> statement-breakpoint
CREATE INDEX "portfolio_metrics_snapshots_date_idx" ON "portfolio_metrics_snapshots" ("snapshot_date");
