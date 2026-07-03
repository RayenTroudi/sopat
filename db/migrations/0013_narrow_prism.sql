CREATE TYPE "public"."communication_direction" AS ENUM('interne', 'externe');--> statement-breakpoint
CREATE TYPE "public"."feedback_channel" AS ENUM('enquete_satisfaction', 'reunion', 'email', 'reclamation', 'audit', 'autre');--> statement-breakpoint
CREATE TYPE "public"."hse_submission_status" AS ENUM('conforme', 'non_conforme', 'partiel');--> statement-breakpoint
CREATE TYPE "public"."phytosanitary_product_type" AS ENUM('insecticide', 'acaricide', 'fongicide', 'herbicide', 'engrais', 'autre');--> statement-breakpoint
CREATE TYPE "public"."plan_activity_status" AS ENUM('planifie', 'realise_dans_delai', 'realise_avec_retard', 'non_realise', 'cloture');--> statement-breakpoint
CREATE TYPE "public"."project_study_phase" AS ENUM('avant_projet_sommaire', 'avant_projet_detaille');--> statement-breakpoint
CREATE TYPE "public"."regulatory_status" AS ENUM('applicable', 'non_applicable', 'en_veille');--> statement-breakpoint
CREATE TYPE "public"."ro_category" AS ENUM('contexte_interne', 'contexte_externe', 'partie_interessee', 'processus', 'environnement', 'autre');--> statement-breakpoint
CREATE TYPE "public"."ro_status" AS ENUM('identified', 'treated', 'monitored', 'closed');--> statement-breakpoint
CREATE TYPE "public"."ro_type" AS ENUM('risk', 'opportunity');--> statement-breakpoint
CREATE TYPE "public"."stakeholder_type" AS ENUM('client', 'fournisseur', 'partenaire', 'employe', 'actionnaire', 'autorite_reglementaire', 'communaute', 'autre');--> statement-breakpoint
CREATE TYPE "public"."waste_disposal" AS ENUM('tri_selectif', 'collecte_municipale', 'prestataire_agree', 'incineration', 'autre');--> statement-breakpoint
CREATE TYPE "public"."waste_type" AS ENUM('papier_carton', 'plastique', 'verre', 'metal', 'dechets_verts', 'dechets_chimiques', 'electronique', 'autre');--> statement-breakpoint
CREATE TABLE "communication_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"direction" "communication_direction" NOT NULL,
	"subject" varchar(500) NOT NULL,
	"target" varchar(255),
	"channel" varchar(255),
	"frequency" varchar(100),
	"responsible" varchar(255),
	"planned_date" date,
	"done_at" timestamp,
	"done_by" uuid,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decorative_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(30),
	"name" varchar(255) NOT NULL,
	"photo_url" text,
	"main_material" varchar(255),
	"aspect" varchar(255),
	"color" varchar(100),
	"caliber" varchar(100),
	"water_absorption" varchar(100),
	"packaging" varchar(255),
	"used_interior" boolean DEFAULT false NOT NULL,
	"used_exterior" boolean DEFAULT true NOT NULL,
	"handling" text,
	"packaging_details" text,
	"storage_conditions" text,
	"maintenance" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hse_checklist_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"is_compliant" boolean,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hse_checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(100),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "hse_checklist_items_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hse_checklist_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submitted_date" date NOT NULL,
	"dept" "nc_dept" NOT NULL,
	"overall_status" "hse_submission_status" NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "management_plan_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"dept" "nc_dept" NOT NULL,
	"objective" text NOT NULL,
	"action" text NOT NULL,
	"responsible" varchar(255),
	"planned_weeks" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "management_plan_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"week" integer NOT NULL,
	"year" integer NOT NULL,
	"status" "plan_activity_status" DEFAULT 'planifie' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phytosanitary_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(30),
	"product_type" "phytosanitary_product_type" NOT NULL,
	"commercial_name" varchar(255) NOT NULL,
	"approval_number" varchar(100),
	"active_ingredient" varchar(255),
	"formulation" varchar(255),
	"concentration" varchar(100),
	"usage_dose" varchar(255),
	"target_pests" text,
	"target_crop" varchar(255),
	"re_entry_delay" varchar(100),
	"technical_docs" text,
	"packaging" varchar(255),
	"toxicological_class" varchar(100),
	"ppe" text,
	"storage_conditions" text,
	"pre_use_instructions" text,
	"during_use_instructions" text,
	"waste_disposal" text,
	"photo_url" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_study_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"updated_date" date,
	"project_title" varchar(500),
	"location" varchar(255),
	"client_name" varchar(255),
	"reference" varchar(100),
	"project_details" text,
	"deadline_proposed" date,
	"documents_received" jsonb DEFAULT '[]'::jsonb,
	"client_requests" text,
	"duration_planned_days" integer,
	"duration_actual_days" integer,
	"start_date_planned" date,
	"start_date_actual" date,
	"end_date_planned" date,
	"end_date_actual" date,
	"phases" jsonb DEFAULT '[]'::jsonb,
	"drought_resistant_rate" numeric(5, 2),
	"drought_resistant_note" text,
	"responsable_etude" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "project_study_records_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "regulatory_watch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(50),
	"title" varchar(500) NOT NULL,
	"domain" varchar(100),
	"issuing_body" varchar(255),
	"publication_date" date,
	"effective_date" date,
	"status" "regulatory_status" DEFAULT 'applicable' NOT NULL,
	"compliance_notes" text,
	"next_review_date" date,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risks_opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(30) NOT NULL,
	"type" "ro_type" NOT NULL,
	"category" "ro_category" NOT NULL,
	"description" text NOT NULL,
	"context" text,
	"gravity" integer,
	"probability" integer,
	"criticality" integer,
	"priority" integer,
	"importance" integer,
	"score" integer,
	"status" "ro_status" DEFAULT 'identified' NOT NULL,
	"owner" text,
	"target_date" date,
	"closed_at" timestamp,
	"notes" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "risks_opportunities_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "ro_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ro_id" uuid NOT NULL,
	"description" text NOT NULL,
	"responsible" text,
	"target_date" date,
	"completed_at" timestamp,
	"result" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"dept" "nc_dept" NOT NULL,
	"suggestion_text" text NOT NULL,
	"response_text" text,
	"responded_at" timestamp,
	"responded_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stakeholder_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stakeholder_id" uuid NOT NULL,
	"channel" "feedback_channel" NOT NULL,
	"date" date NOT NULL,
	"summary" text NOT NULL,
	"satisfaction_score" integer,
	"response_actions" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stakeholders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(30) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "stakeholder_type" NOT NULL,
	"needs" text,
	"influence" integer DEFAULT 1 NOT NULL,
	"interaction" integer DEFAULT 1 NOT NULL,
	"is_pip" boolean DEFAULT false NOT NULL,
	"contact_name" varchar(255),
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"notes" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "stakeholders_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "waste_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"waste_type" "waste_type" NOT NULL,
	"quantity_kg" real,
	"disposal" "waste_disposal" NOT NULL,
	"contractor" varchar(255),
	"cost" numeric(10, 3),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "lis_code" varchar(30);--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "is_caducous" boolean;--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "is_toxic" boolean;--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "has_spines" boolean;--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "has_flowers" boolean;--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "flower_color" varchar(100);--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "flowering_period" varchar(100);--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "has_fruit" boolean;--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "fruiting_period" varchar(100);--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "adapted_environment" text;--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "diseases" text;--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "height_adult_min" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "height_adult_max" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "diameter_adult_min" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "diameter_adult_max" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "storage_exposure" varchar(100);--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "storage_place" varchar(100);--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "planting_period" varchar(100);--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "soil_type" varchar(255);--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "planting_exposure" varchar(100);--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "watering_cold" varchar(100);--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "watering_hot" varchar(100);--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "pruning" text;--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "phytosanitary_treatment" text;--> statement-breakpoint
ALTER TABLE "plant_species" ADD COLUMN "photo_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_internal_auditor" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auditor_domain" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auditor_qualified_date" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auditor_qualification_proof" varchar(500);--> statement-breakpoint
ALTER TABLE "communication_plan" ADD CONSTRAINT "communication_plan_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_plan" ADD CONSTRAINT "communication_plan_done_by_users_id_fk" FOREIGN KEY ("done_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decorative_materials" ADD CONSTRAINT "decorative_materials_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hse_checklist_answers" ADD CONSTRAINT "hse_checklist_answers_submission_id_hse_checklist_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."hse_checklist_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hse_checklist_answers" ADD CONSTRAINT "hse_checklist_answers_item_id_hse_checklist_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."hse_checklist_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hse_checklist_answers" ADD CONSTRAINT "hse_checklist_answers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hse_checklist_items" ADD CONSTRAINT "hse_checklist_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hse_checklist_submissions" ADD CONSTRAINT "hse_checklist_submissions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_plan_activities" ADD CONSTRAINT "management_plan_activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_plan_executions" ADD CONSTRAINT "management_plan_executions_activity_id_management_plan_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."management_plan_activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_plan_executions" ADD CONSTRAINT "management_plan_executions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phytosanitary_products" ADD CONSTRAINT "phytosanitary_products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_study_records" ADD CONSTRAINT "project_study_records_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_study_records" ADD CONSTRAINT "project_study_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulatory_watch" ADD CONSTRAINT "regulatory_watch_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risks_opportunities" ADD CONSTRAINT "risks_opportunities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ro_actions" ADD CONSTRAINT "ro_actions_ro_id_risks_opportunities_id_fk" FOREIGN KEY ("ro_id") REFERENCES "public"."risks_opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ro_actions" ADD CONSTRAINT "ro_actions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_suggestions" ADD CONSTRAINT "staff_suggestions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_suggestions" ADD CONSTRAINT "staff_suggestions_responded_by_users_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakeholder_feedback" ADD CONSTRAINT "stakeholder_feedback_stakeholder_id_stakeholders_id_fk" FOREIGN KEY ("stakeholder_id") REFERENCES "public"."stakeholders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakeholder_feedback" ADD CONSTRAINT "stakeholder_feedback_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakeholders" ADD CONSTRAINT "stakeholders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_records" ADD CONSTRAINT "waste_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comm_plan_year_idx" ON "communication_plan" USING btree ("year");--> statement-breakpoint
CREATE INDEX "comm_plan_direction_idx" ON "communication_plan" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "decorative_materials_name_idx" ON "decorative_materials" USING btree ("name");--> statement-breakpoint
CREATE INDEX "hse_answers_submission_idx" ON "hse_checklist_answers" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "hse_submissions_date_idx" ON "hse_checklist_submissions" USING btree ("submitted_date");--> statement-breakpoint
CREATE INDEX "hse_submissions_dept_idx" ON "hse_checklist_submissions" USING btree ("dept");--> statement-breakpoint
CREATE INDEX "mgmt_plan_year_idx" ON "management_plan_activities" USING btree ("year");--> statement-breakpoint
CREATE INDEX "mgmt_plan_dept_idx" ON "management_plan_activities" USING btree ("dept");--> statement-breakpoint
CREATE INDEX "mgmt_exec_activity_idx" ON "management_plan_executions" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "mgmt_exec_year_week_idx" ON "management_plan_executions" USING btree ("year","week");--> statement-breakpoint
CREATE INDEX "phytosanitary_type_idx" ON "phytosanitary_products" USING btree ("product_type");--> statement-breakpoint
CREATE INDEX "project_study_records_project_id_idx" ON "project_study_records" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "regulatory_watch_status_idx" ON "regulatory_watch" USING btree ("status");--> statement-breakpoint
CREATE INDEX "regulatory_watch_domain_idx" ON "regulatory_watch" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "ro_type_idx" ON "risks_opportunities" USING btree ("type");--> statement-breakpoint
CREATE INDEX "ro_status_idx" ON "risks_opportunities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ro_category_idx" ON "risks_opportunities" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ro_actions_ro_idx" ON "ro_actions" USING btree ("ro_id");--> statement-breakpoint
CREATE INDEX "staff_suggestions_dept_idx" ON "staff_suggestions" USING btree ("dept");--> statement-breakpoint
CREATE INDEX "stakeholder_feedback_sh_idx" ON "stakeholder_feedback" USING btree ("stakeholder_id");--> statement-breakpoint
CREATE INDEX "stakeholders_type_idx" ON "stakeholders" USING btree ("type");--> statement-breakpoint
CREATE INDEX "stakeholders_pip_idx" ON "stakeholders" USING btree ("is_pip");--> statement-breakpoint
CREATE INDEX "waste_records_year_month_idx" ON "waste_records" USING btree ("year","month");