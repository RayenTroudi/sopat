CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_currency" "currency" NOT NULL,
	"to_currency" varchar(3) DEFAULT 'TND' NOT NULL,
	"rate" numeric(18, 6) NOT NULL,
	"effective_date" date NOT NULL,
	"source" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "coordinateur_terrain" varchar(255);--> statement-breakpoint
CREATE INDEX "exchange_rates_currency_date_idx" ON "exchange_rates" USING btree ("from_currency","effective_date");--> statement-breakpoint
CREATE INDEX "project_zones_status_idx" ON "project_zones" USING btree ("status");