CREATE TYPE "public"."asset_type" AS ENUM('render_3d', 'plan_autocad', 'specification', 'site_photo', 'invoice', 'reception_document', 'contract', 'other');--> statement-breakpoint
CREATE TYPE "public"."audit_status" AS ENUM('scheduled', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."capa_status" AS ENUM('open', 'in_progress', 'closed');--> statement-breakpoint
CREATE TYPE "public"."document_category" AS ENUM('procedure', 'instruction', 'formulaire', 'enregistrement', 'autre');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('draft', 'active', 'obsolete');--> statement-breakpoint
CREATE TYPE "public"."email_status" AS ENUM('pending', 'sent', 'opened', 'validated', 'expired', 'failed');--> statement-breakpoint
CREATE TYPE "public"."health_status" AS ENUM('healthy', 'attention', 'critical');--> statement-breakpoint
CREATE TYPE "public"."nc_status" AS ENUM('open', 'in_progress', 'closed', 'verified');--> statement-breakpoint
CREATE TYPE "public"."phase" AS ENUM('etudes', 'realisation', 'entretien');--> statement-breakpoint
CREATE TYPE "public"."phase_status" AS ENUM('pending', 'in_progress', 'awaiting_signoff', 'completed');--> statement-breakpoint
CREATE TYPE "public"."plant_category" AS ENUM('tree', 'shrub', 'ground_cover', 'climber', 'palm', 'grass', 'aquatic', 'other');--> statement-breakpoint
CREATE TYPE "public"."plant_unit" AS ENUM('unit', 'm2', 'm3', 'kg', 'liter', 'ml');--> statement-breakpoint
CREATE TYPE "public"."prediction_status" AS ENUM('pending', 'accepted', 'overridden');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'etudes', 'realisation', 'entretien', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('residential', 'commercial', 'public');--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('pending', 'ordered', 'received', 'invoiced');--> statement-breakpoint
CREATE TYPE "public"."supplier_category" AS ENUM('pepiniere', 'materiaux', 'equipements', 'produits_phytosanitaires', 'logistique', 'autre');--> statement-breakpoint
CREATE TYPE "public"."supplier_status" AS ENUM('approuve', 'en_evaluation', 'suspendu');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'direction', 'etudes_chef', 'etudes_team', 'realisation_chef', 'realisation_team', 'entretien_chef', 'entretien_team');--> statement-breakpoint
CREATE TYPE "public"."validation_status" AS ENUM('pending', 'validated', 'modified', 'expired');--> statement-breakpoint
CREATE TYPE "public"."visit_type" AS ENUM('taille', 'arrosage', 'traitement_phytosanitaire', 'fertilisation', 'controle_general', 'other');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(50) NOT NULL,
	"auditor_id" uuid NOT NULL,
	"audit_date" timestamp NOT NULL,
	"process_audited" varchar(50) NOT NULL,
	"scope" text,
	"findings" text,
	"status" "audit_status" DEFAULT 'scheduled' NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "audit_logs_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "budget_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"predicted_total" numeric(12, 3) NOT NULL,
	"confidence_low" numeric(12, 3),
	"confidence_high" numeric(12, 3),
	"confidence_score" integer,
	"breakdown_plants" numeric(12, 3),
	"breakdown_soil" numeric(12, 3),
	"breakdown_labor" numeric(12, 3),
	"breakdown_equipment" numeric(12, 3),
	"breakdown_logistics" numeric(12, 3),
	"top_cost_drivers" text[],
	"model_version" varchar(50),
	"similar_projects_used" integer,
	"is_fallback" boolean DEFAULT false NOT NULL,
	"status" "prediction_status" DEFAULT 'pending' NOT NULL,
	"raw_input" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_validations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"prediction_id" uuid NOT NULL,
	"chef_user_id" uuid NOT NULL,
	"status" "validation_status" DEFAULT 'pending' NOT NULL,
	"token" varchar(500) NOT NULL,
	"token_expires_at" timestamp NOT NULL,
	"validated_at" timestamp,
	"modified_at" timestamp,
	"modification_reason" text,
	"modified_values" jsonb,
	"reminder_sent_at" timestamp,
	"escalation_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "budget_validations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "client_satisfaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"comments" text,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"recorded_by" uuid NOT NULL,
	"iso_clause" varchar(20) DEFAULT '9.1.2',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloudinary_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" varchar(500) NOT NULL,
	"url" text NOT NULL,
	"secure_url" text NOT NULL,
	"asset_type" "asset_type" NOT NULL,
	"format" varchar(20),
	"bytes" integer,
	"width" integer,
	"height" integer,
	"linked_entity" varchar(50),
	"linked_entity_id" uuid,
	"project_id" uuid,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "cloudinary_assets_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "corrective_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nc_id" uuid NOT NULL,
	"action_description" text NOT NULL,
	"responsible_id" uuid NOT NULL,
	"deadline" timestamp,
	"evidence_asset_id" uuid,
	"status" "capa_status" DEFAULT 'open' NOT NULL,
	"effectiveness_verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp,
	"verified_by" uuid,
	"closed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" "document_category" DEFAULT 'procedure' NOT NULL,
	"version" varchar(20) DEFAULT '1.0' NOT NULL,
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"owner_id" uuid NOT NULL,
	"asset_id" uuid,
	"iso_clause" varchar(50),
	"process_affected" "phase",
	"effective_date" timestamp,
	"review_date" timestamp,
	"obsoleted_at" timestamp,
	"notes" text,
	"superseded_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"recipient_id" uuid,
	"recipient_email" varchar(255) NOT NULL,
	"template_name" varchar(100) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"status" "email_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"opened_at" timestamp,
	"related_entity_type" varchar(50),
	"related_entity_id" uuid,
	"metadata" jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"contract_asset_id" uuid,
	"contract_start_date" timestamp,
	"contract_end_date" timestamp,
	"visit_frequency" varchar(50),
	"visit_frequency_days" integer,
	"monthly_cost" numeric(10, 3),
	"assigned_team_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"visit_date" timestamp NOT NULL,
	"visit_type" "visit_type" NOT NULL,
	"duration_hours" numeric(5, 2),
	"team_member_id" uuid NOT NULL,
	"work_done" text,
	"work_checklist" jsonb,
	"products_used" jsonb,
	"issues_found" text,
	"next_visit_recommendation" text,
	"before_photo_asset_id" uuid,
	"after_photo_asset_id" uuid,
	"nc_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "non_conformances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(50) NOT NULL,
	"project_id" uuid,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"detected_by" uuid NOT NULL,
	"process_affected" "phase" NOT NULL,
	"description" text NOT NULL,
	"root_cause" text,
	"assigned_to" uuid,
	"deadline" timestamp,
	"status" "nc_status" DEFAULT 'open' NOT NULL,
	"closed_at" timestamp,
	"closed_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" uuid NOT NULL,
	CONSTRAINT "non_conformances_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "plant_health_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"zone_name" varchar(255) NOT NULL,
	"plant_species_id" uuid,
	"health_status" "health_status" NOT NULL,
	"health_score" integer,
	"observations" text,
	"photo_asset_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"plant_species_id" uuid,
	"botanical_name" varchar(255) NOT NULL,
	"common_name" varchar(255),
	"category" "plant_category" NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit" "plant_unit" DEFAULT 'unit' NOT NULL,
	"unit_price_estimate" numeric(10, 3),
	"supplier_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_species" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"botanical_name" varchar(255) NOT NULL,
	"common_name_fr" varchar(255),
	"category" "plant_category" NOT NULL,
	"default_unit" "plant_unit" DEFAULT 'unit' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "plant_species_botanical_name_unique" UNIQUE("botanical_name")
);
--> statement-breakpoint
CREATE TABLE "project_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_name" varchar(255) NOT NULL,
	"action" varchar(100) NOT NULL,
	"previous_state" jsonb,
	"new_state" jsonb,
	"evidence_asset_ids" uuid[],
	"metadata" jsonb,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_checklist_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"checklist_item_id" uuid NOT NULL,
	"is_complete" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"completed_by" uuid,
	"evidence_asset_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"phase" "phase" NOT NULL,
	"status" "phase_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"signed_off_at" timestamp,
	"signed_off_by" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"client_name" varchar(255) NOT NULL,
	"client_email" varchar(255),
	"client_phone" varchar(50),
	"site_address" text NOT NULL,
	"site_area_m2" numeric(10, 2),
	"project_type" "project_type" NOT NULL,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"start_date" timestamp,
	"estimated_delivery_date" timestamp,
	"actual_delivery_date" timestamp,
	"assigned_etudes_chef_id" uuid,
	"assigned_realisation_chef_id" uuid,
	"assigned_entretien_chef_id" uuid,
	"approved_budget" numeric(12, 3),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" uuid NOT NULL,
	CONSTRAINT "projects_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"plant_list_item_id" uuid,
	"item_description" varchar(255) NOT NULL,
	"quantity_purchased" numeric(10, 2) NOT NULL,
	"unit_price_paid" numeric(10, 3) NOT NULL,
	"total_cost" numeric(12, 3) NOT NULL,
	"supplier_id" uuid,
	"supplier_invoice_number" varchar(100),
	"invoice_asset_id" uuid,
	"purchase_date" timestamp NOT NULL,
	"purchased_by" uuid NOT NULL,
	"status" "purchase_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quality_checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checklist_id" uuid NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"label" varchar(500) NOT NULL,
	"iso_clause" varchar(50),
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quality_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase" "phase" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"evaluated_by" uuid NOT NULL,
	"evaluator_name" varchar(255) NOT NULL,
	"score" integer NOT NULL,
	"notes" text,
	"evaluated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" "supplier_category" DEFAULT 'autre' NOT NULL,
	"contact_name" varchar(255),
	"email" varchar(255),
	"phone" varchar(50),
	"city" varchar(100),
	"address" text,
	"iso_status" "supplier_status" DEFAULT 'en_evaluation' NOT NULL,
	"evaluation_score" integer,
	"last_audit_date" timestamp,
	"contract_asset_id" uuid,
	"iso_approved" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'etudes_team' NOT NULL,
	"phone" varchar(50),
	"avatar_url" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" uuid,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_auditor_id_users_id_fk" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_predictions" ADD CONSTRAINT "budget_predictions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_predictions" ADD CONSTRAINT "budget_predictions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_validations" ADD CONSTRAINT "budget_validations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_validations" ADD CONSTRAINT "budget_validations_prediction_id_budget_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."budget_predictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_validations" ADD CONSTRAINT "budget_validations_chef_user_id_users_id_fk" FOREIGN KEY ("chef_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_validations" ADD CONSTRAINT "budget_validations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_satisfaction" ADD CONSTRAINT "client_satisfaction_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_satisfaction" ADD CONSTRAINT "client_satisfaction_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_satisfaction" ADD CONSTRAINT "client_satisfaction_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloudinary_assets" ADD CONSTRAINT "cloudinary_assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloudinary_assets" ADD CONSTRAINT "cloudinary_assets_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloudinary_assets" ADD CONSTRAINT "cloudinary_assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_nc_id_non_conformances_id_fk" FOREIGN KEY ("nc_id") REFERENCES "public"."non_conformances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_responsible_id_users_id_fk" FOREIGN KEY ("responsible_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_assigned_team_id_users_id_fk" FOREIGN KEY ("assigned_team_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_visits" ADD CONSTRAINT "maintenance_visits_schedule_id_maintenance_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."maintenance_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_visits" ADD CONSTRAINT "maintenance_visits_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_visits" ADD CONSTRAINT "maintenance_visits_team_member_id_users_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_visits" ADD CONSTRAINT "maintenance_visits_nc_id_non_conformances_id_fk" FOREIGN KEY ("nc_id") REFERENCES "public"."non_conformances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_visits" ADD CONSTRAINT "maintenance_visits_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD CONSTRAINT "non_conformances_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD CONSTRAINT "non_conformances_detected_by_users_id_fk" FOREIGN KEY ("detected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD CONSTRAINT "non_conformances_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD CONSTRAINT "non_conformances_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD CONSTRAINT "non_conformances_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_health_records" ADD CONSTRAINT "plant_health_records_visit_id_maintenance_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."maintenance_visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_health_records" ADD CONSTRAINT "plant_health_records_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_health_records" ADD CONSTRAINT "plant_health_records_plant_species_id_plant_species_id_fk" FOREIGN KEY ("plant_species_id") REFERENCES "public"."plant_species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_health_records" ADD CONSTRAINT "plant_health_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_list_items" ADD CONSTRAINT "plant_list_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_list_items" ADD CONSTRAINT "plant_list_items_plant_species_id_plant_species_id_fk" FOREIGN KEY ("plant_species_id") REFERENCES "public"."plant_species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_list_items" ADD CONSTRAINT "plant_list_items_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_list_items" ADD CONSTRAINT "plant_list_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity_log" ADD CONSTRAINT "project_activity_log_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity_log" ADD CONSTRAINT "project_activity_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity_log" ADD CONSTRAINT "project_activity_log_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_checklist_answers" ADD CONSTRAINT "project_checklist_answers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_checklist_answers" ADD CONSTRAINT "project_checklist_answers_checklist_item_id_quality_checklist_items_id_fk" FOREIGN KEY ("checklist_item_id") REFERENCES "public"."quality_checklist_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_checklist_answers" ADD CONSTRAINT "project_checklist_answers_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_checklist_answers" ADD CONSTRAINT "project_checklist_answers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_signed_off_by_users_id_fk" FOREIGN KEY ("signed_off_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_assigned_etudes_chef_id_users_id_fk" FOREIGN KEY ("assigned_etudes_chef_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_assigned_realisation_chef_id_users_id_fk" FOREIGN KEY ("assigned_realisation_chef_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_assigned_entretien_chef_id_users_id_fk" FOREIGN KEY ("assigned_entretien_chef_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_plant_list_item_id_plant_list_items_id_fk" FOREIGN KEY ("plant_list_item_id") REFERENCES "public"."plant_list_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_purchased_by_users_id_fk" FOREIGN KEY ("purchased_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_checklist_items" ADD CONSTRAINT "quality_checklist_items_checklist_id_quality_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."quality_checklists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_checklist_items" ADD CONSTRAINT "quality_checklist_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_checklists" ADD CONSTRAINT "quality_checklists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD CONSTRAINT "supplier_evaluations_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD CONSTRAINT "supplier_evaluations_evaluated_by_users_id_fk" FOREIGN KEY ("evaluated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_evaluations" ADD CONSTRAINT "supplier_evaluations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_status_idx" ON "audit_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_logs_auditor_id_idx" ON "audit_logs" USING btree ("auditor_id");--> statement-breakpoint
CREATE INDEX "budget_predictions_project_id_idx" ON "budget_predictions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "budget_predictions_status_idx" ON "budget_predictions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "budget_validations_project_id_idx" ON "budget_validations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "budget_validations_status_idx" ON "budget_validations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "budget_validations_token_idx" ON "budget_validations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "client_satisfaction_project_id_idx" ON "client_satisfaction" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "cloudinary_assets_project_id_idx" ON "cloudinary_assets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "cloudinary_assets_linked_entity_id_idx" ON "cloudinary_assets" USING btree ("linked_entity_id");--> statement-breakpoint
CREATE INDEX "cloudinary_assets_asset_type_idx" ON "cloudinary_assets" USING btree ("asset_type");--> statement-breakpoint
CREATE INDEX "capa_nc_id_idx" ON "corrective_actions" USING btree ("nc_id");--> statement-breakpoint
CREATE INDEX "capa_status_idx" ON "corrective_actions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "documents_status_idx" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "documents_owner_id_idx" ON "documents" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "email_queue_project_id_idx" ON "email_queue" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "email_queue_status_idx" ON "email_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_queue_recipient_id_idx" ON "email_queue" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "maintenance_schedules_project_id_idx" ON "maintenance_schedules" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "maintenance_visits_project_id_idx" ON "maintenance_visits" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "maintenance_visits_schedule_id_idx" ON "maintenance_visits" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "nc_project_id_idx" ON "non_conformances" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "nc_status_idx" ON "non_conformances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "nc_assigned_to_idx" ON "non_conformances" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "plant_health_project_id_idx" ON "plant_health_records" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "plant_health_visit_id_idx" ON "plant_health_records" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "plant_list_project_id_idx" ON "plant_list_items" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "plant_species_category_idx" ON "plant_species" USING btree ("category");--> statement-breakpoint
CREATE INDEX "activity_log_project_id_idx" ON "project_activity_log" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "activity_log_actor_id_idx" ON "project_activity_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "activity_log_occurred_at_idx" ON "project_activity_log" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "checklist_answers_project_id_idx" ON "project_checklist_answers" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_phases_project_id_idx" ON "project_phases" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_phases_status_idx" ON "project_phases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "projects_created_by_idx" ON "projects" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "projects_etudes_chef_idx" ON "projects" USING btree ("assigned_etudes_chef_id");--> statement-breakpoint
CREATE INDEX "projects_realisation_chef_idx" ON "projects" USING btree ("assigned_realisation_chef_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_project_id_idx" ON "purchase_orders" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "checklist_items_checklist_id_idx" ON "quality_checklist_items" USING btree ("checklist_id");--> statement-breakpoint
CREATE INDEX "quality_checklists_phase_idx" ON "quality_checklists" USING btree ("phase");--> statement-breakpoint
CREATE INDEX "supplier_evaluations_supplier_id_idx" ON "supplier_evaluations" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "suppliers_iso_approved_idx" ON "suppliers" USING btree ("iso_approved");--> statement-breakpoint
CREATE INDEX "suppliers_iso_status_idx" ON "suppliers" USING btree ("iso_status");--> statement-breakpoint
CREATE INDEX "suppliers_category_idx" ON "suppliers" USING btree ("category");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");