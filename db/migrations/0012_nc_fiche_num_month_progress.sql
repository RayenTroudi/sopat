CREATE TYPE "public"."audit_program_status" AS ENUM('planifie', 'en_cours', 'realise', 'reporte', 'annule');--> statement-breakpoint
CREATE TYPE "public"."nc_dept" AS ENUM('AC', 'CO', 'ET', 'MI', 'RE1', 'RE2', 'RH');--> statement-breakpoint
CREATE TYPE "public"."nc_source" AS ENUM('interne', 'audit', 'reclamation_client', 'reclamation_pi');--> statement-breakpoint
ALTER TYPE "public"."dms_link_entity" ADD VALUE 'audit_program' BEFORE 'maintenance_visit';--> statement-breakpoint
ALTER TYPE "public"."supplier_category" ADD VALUE 'plantes';--> statement-breakpoint
ALTER TYPE "public"."supplier_category" ADD VALUE 'terre_vegetale';--> statement-breakpoint
ALTER TYPE "public"."supplier_category" ADD VALUE 'gazon';--> statement-breakpoint
ALTER TYPE "public"."supplier_category" ADD VALUE 'matiere_decorative';--> statement-breakpoint
ALTER TYPE "public"."supplier_category" ADD VALUE 'bac_fleurs';--> statement-breakpoint
ALTER TYPE "public"."supplier_category" ADD VALUE 'parc_auto';--> statement-breakpoint
ALTER TYPE "public"."supplier_category" ADD VALUE 'equipements_bureautique';--> statement-breakpoint
ALTER TYPE "public"."supplier_category" ADD VALUE 'services';--> statement-breakpoint
ALTER TYPE "public"."supplier_category" ADD VALUE 'sous_traitants';--> statement-breakpoint
CREATE TABLE "audit_program_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_program_id" uuid NOT NULL,
	"agenda_step" text NOT NULL,
	"clause_ref" varchar(100),
	"interlocuteurs" text,
	"response" text,
	"conformity" varchar(10),
	"evidence" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(50) NOT NULL,
	"year" integer NOT NULL,
	"dept" "nc_dept" NOT NULL,
	"title" varchar(200),
	"auditor_name" text,
	"auditee_responsible" text,
	"scheduled_date" timestamp,
	"scheduled_start_time" varchar(10),
	"scheduled_end_time" varchar(10),
	"actual_date" timestamp,
	"auditor_signed_at" timestamp,
	"status" "audit_program_status" DEFAULT 'planifie' NOT NULL,
	"scope" text,
	"objectives" text,
	"criteria" text,
	"reference_documents" text,
	"findings" text,
	"report_asset_id" uuid,
	"dms_document_code" varchar(20),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "audit_programs_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ALTER COLUMN "score" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "suppliers" ALTER COLUMN "evaluation_score" SET DATA TYPE numeric(5, 2);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "dms_document_code" varchar(20);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "dms_document_code" varchar(20);--> statement-breakpoint
ALTER TABLE "corrective_actions" ADD COLUMN "responsible_name" text;--> statement-breakpoint
ALTER TABLE "corrective_actions" ADD COLUMN "deadline_planned" timestamp;--> statement-breakpoint
ALTER TABLE "corrective_actions" ADD COLUMN "deadline_actual" timestamp;--> statement-breakpoint
ALTER TABLE "corrective_actions" ADD COLUMN "eval_date_planned" timestamp;--> statement-breakpoint
ALTER TABLE "corrective_actions" ADD COLUMN "eval_date_actual" timestamp;--> statement-breakpoint
ALTER TABLE "corrective_actions" ADD COLUMN "progress_status" varchar(50);--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "nc_fiche_num" integer;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "nc_month" varchar(20);--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "detector_name" text;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "detector_email" text;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "dept" "nc_dept";--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "nc_source" "nc_source";--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "reference_doc" varchar(100);--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "impact" text;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "immediate_correction" text;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "derogation_auth" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "rebut" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "correction_responsible" text;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "correction_deadline_planned" timestamp;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "correction_deadline_actual" timestamp;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "correction_progress" real;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "correction_status" varchar(30);--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "eval_date_planned" timestamp;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "eval_date_actual" timestamp;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "client_response" text;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "client_response_ref" varchar(200);--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "is_risk" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "is_opportunity" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "needs_second_capa" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "evaluation_type" varchar(20) DEFAULT 'selection';--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "taux_couverture" integer;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "niveau_qualite" integer;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "prix" integer;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "delai_livraison" integer;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "mode_livraison" integer;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "modalites_paiement" integer;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "proximite_livraison" integer;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "notoriete_reference" integer;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "respect_exigences" integer;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "respect_prix" integer;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "respect_delai" integer;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "reactivite" integer;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "assistance_technique" integer;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "documentation_technique" integer;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "computed_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD COLUMN "classification" varchar(1);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "supplier_code" varchar(20);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "registre_commerce" varchar(100);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "selection_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "selection_class" varchar(1);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "evaluation_class" varchar(1);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "iso_class" varchar(1);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "next_eval_planned" varchar(50);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "next_eval_done" varchar(50);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "dms_document_code" varchar(20);--> statement-breakpoint
ALTER TABLE "audit_program_items" ADD CONSTRAINT "audit_program_items_audit_program_id_audit_programs_id_fk" FOREIGN KEY ("audit_program_id") REFERENCES "public"."audit_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_program_items" ADD CONSTRAINT "audit_program_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_programs" ADD CONSTRAINT "audit_programs_report_asset_id_cloudinary_assets_id_fk" FOREIGN KEY ("report_asset_id") REFERENCES "public"."cloudinary_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_programs" ADD CONSTRAINT "audit_programs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_program_items_program_idx" ON "audit_program_items" USING btree ("audit_program_id");--> statement-breakpoint
CREATE INDEX "audit_programs_year_idx" ON "audit_programs" USING btree ("year");--> statement-breakpoint
CREATE INDEX "audit_programs_dept_idx" ON "audit_programs" USING btree ("dept");--> statement-breakpoint
CREATE INDEX "audit_programs_status_idx" ON "audit_programs" USING btree ("status");