CREATE TABLE "maintenance_annual_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"schedule_id" uuid,
	"annee" integer NOT NULL,
	"updated_date" date,
	"tacite_reconduction" boolean DEFAULT false,
	"majoration_taux" numeric(5, 2),
	"monthly_data" jsonb DEFAULT '[]'::jsonb,
	"total_interventions_contractuelles" integer,
	"total_interventions_prevues" integer,
	"total_interventions_realisees" integer,
	"montant_contrat" numeric(12, 3),
	"montant_prevu" numeric(12, 3),
	"montant_facture" numeric(12, 3),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_monthly_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"schedule_id" uuid,
	"mois_annee" varchar(20) NOT NULL,
	"nombre_interventions" integer,
	"tasks" jsonb DEFAULT '[]'::jsonb,
	"fournitures" text,
	"client_intervenants" text,
	"client_observations" text,
	"client_besoins" text,
	"pm_signed_date" date,
	"client_signed_date" date,
	"is_finalized" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pv_reception_definitive" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"date" date,
	"titulaire_du_marche" varchar(255),
	"date_approbation_marche" date,
	"delai_execution" varchar(100),
	"date_debut_travaux" date,
	"date_fin_travaux" date,
	"signatories" jsonb DEFAULT '[]'::jsonb,
	"attestation_text" text,
	"is_finalized" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "pv_reception_definitive_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "pv_reception_provisoire" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"date" date,
	"maitre_ouvrage" varchar(255),
	"start_date" date,
	"end_date" date,
	"checklist_items" jsonb DEFAULT '[]'::jsonb,
	"signatories" jsonb DEFAULT '[]'::jsonb,
	"reserves" text,
	"has_reserves" boolean DEFAULT false,
	"is_finalized" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "pv_reception_provisoire_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "realisation_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"document_type" varchar(20) NOT NULL,
	"phase_code" varchar(50) NOT NULL,
	"phase_label" varchar(500) NOT NULL,
	"designation" varchar(500),
	"quantity" numeric(10, 3),
	"unit" varchar(50),
	"norme" varchar(255),
	"unit_price_htva" numeric(12, 3),
	"total_htva" numeric(12, 3),
	"observation" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_phase_header" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_project_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region" varchar(100),
	"chef_equipe" varchar(255),
	"week_start_date" date NOT NULL,
	"week_end_date" date NOT NULL,
	"rows" jsonb DEFAULT '[]'::jsonb,
	"nombre_actions_prevues" integer,
	"pourcentage_realisation" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "maintenance_annual_plans" ADD CONSTRAINT "maintenance_annual_plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_annual_plans" ADD CONSTRAINT "maintenance_annual_plans_schedule_id_maintenance_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."maintenance_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_annual_plans" ADD CONSTRAINT "maintenance_annual_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_monthly_plans" ADD CONSTRAINT "maintenance_monthly_plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_monthly_plans" ADD CONSTRAINT "maintenance_monthly_plans_schedule_id_maintenance_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."maintenance_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_monthly_plans" ADD CONSTRAINT "maintenance_monthly_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pv_reception_definitive" ADD CONSTRAINT "pv_reception_definitive_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pv_reception_definitive" ADD CONSTRAINT "pv_reception_definitive_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pv_reception_provisoire" ADD CONSTRAINT "pv_reception_provisoire_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pv_reception_provisoire" ADD CONSTRAINT "pv_reception_provisoire_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "realisation_line_items" ADD CONSTRAINT "realisation_line_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "realisation_line_items" ADD CONSTRAINT "realisation_line_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_project_plans" ADD CONSTRAINT "weekly_project_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "maintenance_annual_plans_project_id_idx" ON "maintenance_annual_plans" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "maintenance_annual_plans_annee_idx" ON "maintenance_annual_plans" USING btree ("annee");--> statement-breakpoint
CREATE INDEX "maintenance_monthly_plans_project_id_idx" ON "maintenance_monthly_plans" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "maintenance_monthly_plans_mois_idx" ON "maintenance_monthly_plans" USING btree ("mois_annee");--> statement-breakpoint
CREATE INDEX "pv_reception_definitive_project_id_idx" ON "pv_reception_definitive" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "pv_reception_provisoire_project_id_idx" ON "pv_reception_provisoire" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "realisation_line_items_project_id_idx" ON "realisation_line_items" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "realisation_line_items_doc_type_idx" ON "realisation_line_items" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "weekly_project_plans_week_idx" ON "weekly_project_plans" USING btree ("week_start_date");