CREATE TYPE "public"."dms_approval_action" AS ENUM('submit_for_review', 'review_approved', 'review_rejected', 'approve', 'reject', 'publish', 'request_revision', 'mark_obsolete', 'archive');--> statement-breakpoint
CREATE TYPE "public"."dms_audit_event" AS ENUM('created', 'updated', 'version_created', 'status_changed', 'reviewed', 'approved', 'rejected', 'published', 'obsoleted', 'archived', 'viewed', 'downloaded', 'signed', 'linked', 'unlinked', 'permission_changed', 'soft_deleted', 'restored');--> statement-breakpoint
CREATE TYPE "public"."dms_category" AS ENUM('manuel_qualite', 'politique', 'procedure', 'instruction', 'formulaire', 'enregistrement', 'plan_qualite', 'cartographie_processus', 'etude_technique', 'devis', 'contrat', 'bon_commande', 'facture', 'rapport_inspection', 'rapport_audit', 'ncr', 'capa', 'document_fournisseur', 'document_client', 'externe');--> statement-breakpoint
CREATE TYPE "public"."dms_confidentiality" AS ENUM('public', 'internal', 'confidential', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."dms_department" AS ENUM('direction', 'etudes', 'realisation', 'entretien', 'qualite', 'finance', 'rh', 'rse', 'transverse');--> statement-breakpoint
CREATE TYPE "public"."dms_lifecycle_status" AS ENUM('draft', 'in_review', 'pending_approval', 'approved', 'effective', 'under_revision', 'obsolete', 'archived');--> statement-breakpoint
CREATE TYPE "public"."dms_link_entity" AS ENUM('project', 'client', 'supplier', 'non_conformance', 'corrective_action', 'audit_log', 'maintenance_visit', 'purchase_order', 'rse_partnership', 'project_phase', 'user');--> statement-breakpoint
CREATE TYPE "public"."dms_permission_level" AS ENUM('view', 'comment', 'edit', 'approve', 'manage');--> statement-breakpoint
CREATE TYPE "public"."dms_permission_subject" AS ENUM('user', 'role');--> statement-breakpoint
CREATE TYPE "public"."dms_signature_type" AS ENUM('electronic_simple', 'electronic_advanced', 'wet_scanned');--> statement-breakpoint
CREATE TYPE "public"."portfolio_export_type" AS ENUM('full', 'by_type', 'by_country', 'custom', 'single_project');--> statement-breakpoint
CREATE TYPE "public"."residential_subtype" AS ENUM('villa_privee', 'residence_collective', 'appartement');--> statement-breakpoint
ALTER TYPE "public"."asset_type" ADD VALUE 'portfolio_pdf';--> statement-breakpoint
CREATE TABLE "design_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_name" varchar(255) NOT NULL,
	"project_type_context" "project_type"[] DEFAULT '{}'::project_type[] NOT NULL,
	"concept_description_template" text NOT NULL,
	"recommended_vocabulary" text[] DEFAULT '{}'::text[] NOT NULL,
	"recommended_palette" text[] DEFAULT '{}'::text[] NOT NULL,
	"example_project_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"reference_image_cloudinary_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_by" uuid NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dms_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version_id" uuid,
	"event" "dms_audit_event" NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_role_snapshot" "user_role" NOT NULL,
	"previous_state" jsonb,
	"new_state" jsonb,
	"metadata" jsonb,
	"ip_address" varchar(64),
	"user_agent" text,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dms_document_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"entity_type" "dms_link_entity" NOT NULL,
	"entity_id" uuid NOT NULL,
	"link_role" varchar(50),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dms_document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version_major" integer DEFAULT 1 NOT NULL,
	"version_minor" integer DEFAULT 0 NOT NULL,
	"version_label" varchar(20) NOT NULL,
	"cloudinary_asset_id" uuid,
	"inline_content" jsonb,
	"content_hash" varchar(128) NOT NULL,
	"file_size_bytes" integer,
	"mime_type" varchar(100),
	"extracted_text" text,
	"status" "dms_lifecycle_status" DEFAULT 'draft' NOT NULL,
	"change_summary" text NOT NULL,
	"change_reason" text,
	"author_id" uuid NOT NULL,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp,
	"approved_by_id" uuid,
	"approved_at" timestamp,
	"published_at" timestamp,
	"effective_date" timestamp,
	"revision_number" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dms_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_number" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"category" "dms_category" NOT NULL,
	"department" "dms_department" NOT NULL,
	"iso_clauses" text[] DEFAULT '{}'::text[] NOT NULL,
	"confidentiality" "dms_confidentiality" DEFAULT 'internal' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"current_version_id" uuid,
	"status" "dms_lifecycle_status" DEFAULT 'draft' NOT NULL,
	"owner_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"department_manager_id" uuid,
	"effective_date" timestamp,
	"next_review_date" timestamp,
	"expiration_date" timestamp,
	"obsoleted_at" timestamp,
	"retention_years" integer DEFAULT 10 NOT NULL,
	"retention_expires_at" timestamp,
	"legacy_reference" varchar(500),
	"supersedes_id" uuid,
	"superseded_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" uuid NOT NULL,
	CONSTRAINT "dms_documents_document_number_unique" UNIQUE("document_number")
);
--> statement-breakpoint
CREATE TABLE "dms_form_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_template_id" uuid NOT NULL,
	"form_version_label" varchar(20) NOT NULL,
	"record_document_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"linked_entity_type" "dms_link_entity",
	"linked_entity_id" uuid,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"submitted_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dms_form_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"schema_json" jsonb NOT NULL,
	"ui_schema_json" jsonb,
	"default_link_entity" "dms_link_entity",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "dms_form_templates_document_id_unique" UNIQUE("document_id")
);
--> statement-breakpoint
CREATE TABLE "dms_numbering_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department" "dms_department" NOT NULL,
	"category" "dms_category" NOT NULL,
	"year" integer NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dms_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid,
	"category" "dms_category",
	"department" "dms_department",
	"subject_type" "dms_permission_subject" NOT NULL,
	"subject_id" uuid,
	"subject_role" "user_role",
	"level" "dms_permission_level" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dms_signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"signer_id" uuid NOT NULL,
	"signer_name_snapshot" varchar(255) NOT NULL,
	"signer_role_snapshot" "user_role" NOT NULL,
	"signature_type" "dms_signature_type" DEFAULT 'electronic_simple' NOT NULL,
	"purpose" varchar(50) NOT NULL,
	"signed_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar(64),
	"user_agent" text,
	"content_hash_at_signing" varchar(128) NOT NULL,
	"otp_challenge" varchar(100),
	"cloudinary_asset_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dms_workflow_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"step_name" varchar(50) NOT NULL,
	"assignee_id" uuid NOT NULL,
	"assignee_role" "user_role",
	"action" "dms_approval_action",
	"action_at" timestamp,
	"comments" text,
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"due_date" timestamp,
	"reminder_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"export_type" "portfolio_export_type" NOT NULL,
	"project_ids_included" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"sections_config" jsonb NOT NULL,
	"filter_config" jsonb,
	"language" varchar(5) DEFAULT 'fr' NOT NULL,
	"output_cloudinary_id" uuid,
	"file_size_bytes" integer,
	"page_count" integer,
	"download_count" integer DEFAULT 0 NOT NULL,
	"last_downloaded_at" timestamp,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"generated_by" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_metrics_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_date" date NOT NULL,
	"metrics" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_singleton" boolean DEFAULT true NOT NULL,
	"company_tagline" text,
	"ceo_name" varchar(255),
	"ceo_title" varchar(255),
	"ceo_photo_cloudinary_id" uuid,
	"company_address" text,
	"phone_1" varchar(50),
	"phone_2" varchar(50),
	"email" varchar(255),
	"website" varchar(255),
	"facebook_url" varchar(500),
	"instagram_handle" varchar(100),
	"iso_cert_number" varchar(100),
	"iso_cert_expiry" date,
	"rse_label_level" varchar(50),
	"rse_label_expiry" date,
	"cover_background_color" varchar(7) DEFAULT '#2D5A27' NOT NULL,
	"accent_color" varchar(7) DEFAULT '#FFFFFF' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "residential_subtype" "residential_subtype";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "actual_revenue" numeric(14, 3);--> statement-breakpoint
ALTER TABLE "rse_partnerships" ADD COLUMN "team_name" text;--> statement-breakpoint
ALTER TABLE "rse_partnerships" ADD COLUMN "team_lead_name" text;--> statement-breakpoint
ALTER TABLE "design_templates" ADD CONSTRAINT "design_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_audit_log" ADD CONSTRAINT "dms_audit_log_document_id_dms_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."dms_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_audit_log" ADD CONSTRAINT "dms_audit_log_version_id_dms_document_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."dms_document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_audit_log" ADD CONSTRAINT "dms_audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_document_links" ADD CONSTRAINT "dms_document_links_document_id_dms_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."dms_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_document_links" ADD CONSTRAINT "dms_document_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_document_versions" ADD CONSTRAINT "dms_document_versions_document_id_dms_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."dms_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_document_versions" ADD CONSTRAINT "dms_document_versions_cloudinary_asset_id_cloudinary_assets_id_fk" FOREIGN KEY ("cloudinary_asset_id") REFERENCES "public"."cloudinary_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_document_versions" ADD CONSTRAINT "dms_document_versions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_document_versions" ADD CONSTRAINT "dms_document_versions_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_document_versions" ADD CONSTRAINT "dms_document_versions_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_document_versions" ADD CONSTRAINT "dms_document_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_documents" ADD CONSTRAINT "dms_documents_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_documents" ADD CONSTRAINT "dms_documents_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_documents" ADD CONSTRAINT "dms_documents_department_manager_id_users_id_fk" FOREIGN KEY ("department_manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_documents" ADD CONSTRAINT "dms_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_form_submissions" ADD CONSTRAINT "dms_form_submissions_form_template_id_dms_form_templates_id_fk" FOREIGN KEY ("form_template_id") REFERENCES "public"."dms_form_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_form_submissions" ADD CONSTRAINT "dms_form_submissions_record_document_id_dms_documents_id_fk" FOREIGN KEY ("record_document_id") REFERENCES "public"."dms_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_form_submissions" ADD CONSTRAINT "dms_form_submissions_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_form_templates" ADD CONSTRAINT "dms_form_templates_document_id_dms_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."dms_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_form_templates" ADD CONSTRAINT "dms_form_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_permissions" ADD CONSTRAINT "dms_permissions_document_id_dms_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."dms_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_permissions" ADD CONSTRAINT "dms_permissions_subject_id_users_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_permissions" ADD CONSTRAINT "dms_permissions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_signatures" ADD CONSTRAINT "dms_signatures_version_id_dms_document_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."dms_document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_signatures" ADD CONSTRAINT "dms_signatures_signer_id_users_id_fk" FOREIGN KEY ("signer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_signatures" ADD CONSTRAINT "dms_signatures_cloudinary_asset_id_cloudinary_assets_id_fk" FOREIGN KEY ("cloudinary_asset_id") REFERENCES "public"."cloudinary_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_workflow_steps" ADD CONSTRAINT "dms_workflow_steps_document_id_dms_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."dms_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_workflow_steps" ADD CONSTRAINT "dms_workflow_steps_version_id_dms_document_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."dms_document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dms_workflow_steps" ADD CONSTRAINT "dms_workflow_steps_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_exports" ADD CONSTRAINT "portfolio_exports_output_cloudinary_id_cloudinary_assets_id_fk" FOREIGN KEY ("output_cloudinary_id") REFERENCES "public"."cloudinary_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_exports" ADD CONSTRAINT "portfolio_exports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_exports" ADD CONSTRAINT "portfolio_exports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_metrics_snapshots" ADD CONSTRAINT "portfolio_metrics_snapshots_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_settings" ADD CONSTRAINT "portfolio_settings_ceo_photo_cloudinary_id_cloudinary_assets_id_fk" FOREIGN KEY ("ceo_photo_cloudinary_id") REFERENCES "public"."cloudinary_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_settings" ADD CONSTRAINT "portfolio_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "design_templates_is_published_idx" ON "design_templates" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "design_templates_created_by_idx" ON "design_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "dms_audit_document_idx" ON "dms_audit_log" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "dms_audit_actor_idx" ON "dms_audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "dms_audit_event_idx" ON "dms_audit_log" USING btree ("event");--> statement-breakpoint
CREATE INDEX "dms_audit_occurred_idx" ON "dms_audit_log" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dms_links_unique_uidx" ON "dms_document_links" USING btree ("document_id","entity_type","entity_id","link_role");--> statement-breakpoint
CREATE INDEX "dms_links_entity_idx" ON "dms_document_links" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "dms_links_document_idx" ON "dms_document_links" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dms_versions_doc_label_uidx" ON "dms_document_versions" USING btree ("document_id","version_label");--> statement-breakpoint
CREATE INDEX "dms_versions_document_idx" ON "dms_document_versions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "dms_versions_status_idx" ON "dms_document_versions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dms_documents_department_idx" ON "dms_documents" USING btree ("department");--> statement-breakpoint
CREATE INDEX "dms_documents_category_idx" ON "dms_documents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "dms_documents_status_idx" ON "dms_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dms_documents_owner_idx" ON "dms_documents" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "dms_documents_next_review_idx" ON "dms_documents" USING btree ("next_review_date");--> statement-breakpoint
CREATE INDEX "dms_documents_deleted_at_idx" ON "dms_documents" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "dms_submissions_template_idx" ON "dms_form_submissions" USING btree ("form_template_id");--> statement-breakpoint
CREATE INDEX "dms_submissions_record_idx" ON "dms_form_submissions" USING btree ("record_document_id");--> statement-breakpoint
CREATE INDEX "dms_submissions_entity_idx" ON "dms_form_submissions" USING btree ("linked_entity_type","linked_entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dms_numbering_unique_uidx" ON "dms_numbering_sequences" USING btree ("department","category","year");--> statement-breakpoint
CREATE INDEX "dms_perms_document_idx" ON "dms_permissions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "dms_perms_subject_user_idx" ON "dms_permissions" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "dms_perms_subject_role_idx" ON "dms_permissions" USING btree ("subject_role");--> statement-breakpoint
CREATE INDEX "dms_perms_scope_idx" ON "dms_permissions" USING btree ("category","department");--> statement-breakpoint
CREATE INDEX "dms_signatures_version_idx" ON "dms_signatures" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "dms_signatures_signer_idx" ON "dms_signatures" USING btree ("signer_id");--> statement-breakpoint
CREATE INDEX "dms_workflow_document_idx" ON "dms_workflow_steps" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "dms_workflow_version_idx" ON "dms_workflow_steps" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "dms_workflow_assignee_idx" ON "dms_workflow_steps" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "portfolio_exports_generated_by_idx" ON "portfolio_exports" USING btree ("generated_by");--> statement-breakpoint
CREATE INDEX "portfolio_exports_generated_at_idx" ON "portfolio_exports" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "portfolio_metrics_snapshots_date_idx" ON "portfolio_metrics_snapshots" USING btree ("snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_settings_singleton_uidx" ON "portfolio_settings" USING btree ("is_singleton");