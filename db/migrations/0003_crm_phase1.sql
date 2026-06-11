CREATE TYPE "public"."interaction_type" AS ENUM('appel', 'email', 'reunion', 'visite_site', 'autre');--> statement-breakpoint
ALTER TYPE "public"."supplier_category" ADD VALUE 'location_engins' BEFORE 'autre';--> statement-breakpoint
CREATE TABLE "client_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"interaction_type" "interaction_type" NOT NULL,
	"date" date NOT NULL,
	"summary" text NOT NULL,
	"outcome" text,
	"next_action" text,
	"next_action_date" date,
	"logged_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"client_type" varchar(50) NOT NULL,
	"country" varchar(2) DEFAULT 'TN' NOT NULL,
	"city" varchar(100),
	"address" text,
	"primary_contact_name" varchar(255),
	"primary_contact_title" varchar(255),
	"primary_contact_email" varchar(255),
	"primary_contact_phone" varchar(50),
	"secondary_contact_name" varchar(255),
	"secondary_contact_email" varchar(255),
	"logo_cloudinary_id" uuid,
	"is_featured" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_rentals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"equipment_type_id" uuid NOT NULL,
	"equipment_description" varchar(255),
	"rental_company" varchar(255),
	"rental_company_contact" varchar(255),
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"rental_days" integer NOT NULL,
	"daily_rate" numeric(10, 3) NOT NULL,
	"total_cost" numeric(12, 3) NOT NULL,
	"currency" "currency" DEFAULT 'TND' NOT NULL,
	"invoice_number" varchar(100),
	"invoice_asset_id" uuid,
	"operator_name" varchar(255),
	"purpose_description" text,
	"linked_plant_item_ids" uuid[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name_fr" varchar(255) NOT NULL,
	"icon_name" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
DROP INDEX "exchange_rates_currency_date_idx";--> statement-breakpoint
ALTER TABLE "exchange_rates" ALTER COLUMN "to_currency" SET DEFAULT 'TND'::"public"."currency";--> statement-breakpoint
ALTER TABLE "exchange_rates" ALTER COLUMN "to_currency" SET DATA TYPE "public"."currency" USING "to_currency"::"public"."currency";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "client_interactions" ADD CONSTRAINT "client_interactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_interactions" ADD CONSTRAINT "client_interactions_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_rentals" ADD CONSTRAINT "equipment_rentals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_rentals" ADD CONSTRAINT "equipment_rentals_equipment_type_id_equipment_types_id_fk" FOREIGN KEY ("equipment_type_id") REFERENCES "public"."equipment_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_rentals" ADD CONSTRAINT "equipment_rentals_invoice_asset_id_cloudinary_assets_id_fk" FOREIGN KEY ("invoice_asset_id") REFERENCES "public"."cloudinary_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_rentals" ADD CONSTRAINT "equipment_rentals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_interactions_client_id_idx" ON "client_interactions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "clients_client_type_idx" ON "clients" USING btree ("client_type");--> statement-breakpoint
CREATE INDEX "clients_country_idx" ON "clients" USING btree ("country");--> statement-breakpoint
CREATE INDEX "equipment_rentals_project_id_idx" ON "equipment_rentals" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "equipment_rentals_type_id_idx" ON "equipment_rentals" USING btree ("equipment_type_id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exchange_rates_currency_date_uidx" ON "exchange_rates" USING btree ("from_currency","to_currency","effective_date");