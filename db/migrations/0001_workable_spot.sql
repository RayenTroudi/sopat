CREATE TYPE "public"."client_sector" AS ENUM('banque', 'hotellerie', 'automobile', 'institutionnel_public', 'institutionnel_prive', 'residentiel_prive', 'diplomatique', 'autre');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('TND', 'EUR', 'OMR', 'XOF', 'QAR', 'LYD', 'USD');--> statement-breakpoint
CREATE TYPE "public"."rse_comm_channel" AS ENUM('reseaux_sociaux', 'email_interne', 'presse', 'affichage', 'autre');--> statement-breakpoint
CREATE TYPE "public"."rse_comm_phase" AS ENUM('avant', 'pendant', 'apres');--> statement-breakpoint
CREATE TYPE "public"."rse_comm_plan_status" AS ENUM('planifie', 'publie', 'annule');--> statement-breakpoint
CREATE TYPE "public"."rse_commitment_frequency" AS ENUM('unique', 'annuel', 'semestriel', 'trimestriel', 'mensuel');--> statement-breakpoint
CREATE TYPE "public"."rse_commitment_status" AS ENUM('respecte', 'en_retard', 'a_venir');--> statement-breakpoint
CREATE TYPE "public"."rse_commitment_type" AS ENUM('action_annuelle', 'sensibilisation', 'communication', 'projet_paysager', 'autre');--> statement-breakpoint
CREATE TYPE "public"."rse_communication_type" AS ENUM('logo_sopat', 'logo_partenaire', 'publication_commune');--> statement-breakpoint
CREATE TYPE "public"."rse_communication_validation" AS ENUM('en_attente', 'approuve', 'refuse');--> statement-breakpoint
CREATE TYPE "public"."rse_event_status" AS ENUM('planifie', 'en_cours', 'termine', 'annule');--> statement-breakpoint
CREATE TYPE "public"."rse_event_team_name" AS ENUM('rse', 'rh_communication', 'logistique', 'communication_marketing', 'direction');--> statement-breakpoint
CREATE TYPE "public"."rse_event_type" AS ENUM('nettoyage_plage', 'plantation', 'sensibilisation', 'team_building', 'journee_environnement', 'autre');--> statement-breakpoint
CREATE TYPE "public"."rse_logistics_category" AS ENUM('materiel_environnement', 'materiel_evenementiel', 'confort');--> statement-breakpoint
CREATE TYPE "public"."rse_partner_type" AS ENUM('hotel', 'municipalite', 'entreprise', 'institution', 'autre');--> statement-breakpoint
CREATE TYPE "public"."rse_partnership_status" AS ENUM('actif', 'expire', 'resilie', 'en_cours_de_negociation');--> statement-breakpoint
CREATE TYPE "public"."rse_responsible_party" AS ENUM('sopat', 'partenaire', 'conjoint');--> statement-breakpoint
CREATE TYPE "public"."rse_retro_status" AS ENUM('a_faire', 'en_cours', 'termine');--> statement-breakpoint
CREATE TYPE "public"."zone_status" AS ENUM('etude', 'realisation', 'entretien', 'termine');--> statement-breakpoint
CREATE TYPE "public"."zone_type" AS ENUM('entree', 'piscine', 'rooftop', 'restaurant', 'aquapark', 'acces_plage', 'etage', 'cour_interieure', 'parking', 'jardin_chef', 'autre');--> statement-breakpoint
ALTER TYPE "public"."asset_type" ADD VALUE 'rse_convention' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."asset_type" ADD VALUE 'rse_communication' BEFORE 'other';--> statement-breakpoint
CREATE TABLE "project_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"zone_name" varchar(255) NOT NULL,
	"zone_type" "zone_type" DEFAULT 'autre' NOT NULL,
	"floor_number" integer,
	"surface_m2" numeric(10, 2),
	"plant_palette_notes" text,
	"lighting_notes" text,
	"status" "zone_status" DEFAULT 'etude' NOT NULL,
	"cloudinary_plan_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rse_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partnership_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_name" varchar(255) NOT NULL,
	"action" varchar(100) NOT NULL,
	"previous_state" jsonb,
	"new_state" jsonb,
	"metadata" jsonb,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rse_event_communication_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"phase" "rse_comm_phase" NOT NULL,
	"action_description" text NOT NULL,
	"channel" "rse_comm_channel" NOT NULL,
	"responsible_id" uuid,
	"status" "rse_comm_plan_status" DEFAULT 'planifie' NOT NULL,
	"published_at" timestamp,
	"asset_cloudinary_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rse_event_logistics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"category" "rse_logistics_category" NOT NULL,
	"item_name" varchar(255) NOT NULL,
	"quantity_planned" integer,
	"quantity_actual" integer,
	"unit" varchar(50),
	"supplier" varchar(255),
	"cost" numeric(10, 3),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rse_event_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"waste_collected_kg" numeric(10, 2),
	"trees_planted" integer,
	"participants_actual" integer,
	"beach_length_cleaned_m" numeric(10, 2),
	"zones_treated" integer,
	"media_coverage" boolean DEFAULT false NOT NULL,
	"press_articles_count" integer,
	"social_media_reach" integer,
	"satisfaction_score" integer,
	"lessons_learned" text,
	"post_event_report_cloudinary_id" uuid,
	"photos_album_cloudinary_ids" text[],
	"submitted_by" uuid,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "rse_event_results_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "rse_event_retroplanning" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"task_description" text NOT NULL,
	"deadline" timestamp,
	"assigned_team" "rse_event_team_name",
	"status" "rse_retro_status" DEFAULT 'a_faire' NOT NULL,
	"completed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rse_event_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"team_name" "rse_event_team_name" NOT NULL,
	"team_leader_id" uuid,
	"missions" text[],
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rse_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_reference" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"event_type" "rse_event_type" NOT NULL,
	"date" timestamp NOT NULL,
	"location" varchar(255) NOT NULL,
	"partner_id" uuid,
	"status" "rse_event_status" DEFAULT 'planifie' NOT NULL,
	"participant_count_planned" integer,
	"participant_count_actual" integer,
	"sopat_coordinator_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "rse_events_event_reference_unique" UNIQUE("event_reference")
);
--> statement-breakpoint
CREATE TABLE "rse_partnership_commitments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partnership_id" uuid NOT NULL,
	"article_number" varchar(50),
	"commitment_description" text NOT NULL,
	"commitment_type" "rse_commitment_type" DEFAULT 'autre' NOT NULL,
	"frequency" "rse_commitment_frequency" DEFAULT 'annuel' NOT NULL,
	"responsible_party" "rse_responsible_party" DEFAULT 'sopat' NOT NULL,
	"last_completed_date" timestamp,
	"next_due_date" timestamp,
	"status" "rse_commitment_status" DEFAULT 'a_venir' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rse_partnership_communications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partnership_id" uuid NOT NULL,
	"communication_type" "rse_communication_type" NOT NULL,
	"description" text NOT NULL,
	"submitted_by" uuid NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"validation_status" "rse_communication_validation" DEFAULT 'en_attente' NOT NULL,
	"validated_by_name" varchar(255),
	"validated_at" timestamp,
	"asset_cloudinary_id" uuid,
	"required_by_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rse_partnerships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_name" varchar(255) NOT NULL,
	"partner_type" "rse_partner_type" NOT NULL,
	"partner_address" text,
	"partner_contact_name" varchar(255),
	"partner_contact_email" varchar(255),
	"partner_contact_phone" varchar(50),
	"sopat_referent_id" uuid NOT NULL,
	"partner_referent_name" varchar(255),
	"convention_reference" varchar(50) NOT NULL,
	"signed_date" timestamp,
	"start_date" timestamp,
	"end_date" timestamp,
	"auto_renewal" boolean DEFAULT false NOT NULL,
	"notice_period_days" integer DEFAULT 30 NOT NULL,
	"status" "rse_partnership_status" DEFAULT 'en_cours_de_negociation' NOT NULL,
	"convention_pdf_cloudinary_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "rse_partnerships_convention_reference_unique" UNIQUE("convention_reference")
);
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "project_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."project_type";--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('ingenierie_territoriale', 'espace_public', 'siege_social', 'hotelier_touristique', 'residentiel', 'interieur');--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "project_type" SET DATA TYPE "public"."project_type" USING "project_type"::"public"."project_type";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "country" varchar(2) DEFAULT 'TN' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "currency" "currency" DEFAULT 'TND' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "client_sector" "client_sector";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "client_anonymized" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "concept_title" varchar(255);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "concept_description" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "design_vocabulary" text[];--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "plant_palette_philosophy" text[];--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "linear_meters" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "floor_count" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "municipality_client" varchar(255);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "territory_surface_km2" numeric(12, 4);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "number_of_municipalities" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "lighting_included" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "project_zones" ADD CONSTRAINT "project_zones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_zones" ADD CONSTRAINT "project_zones_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_activity_log" ADD CONSTRAINT "rse_activity_log_partnership_id_rse_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."rse_partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_activity_log" ADD CONSTRAINT "rse_activity_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_activity_log" ADD CONSTRAINT "rse_activity_log_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_event_communication_plan" ADD CONSTRAINT "rse_event_communication_plan_event_id_rse_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."rse_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_event_communication_plan" ADD CONSTRAINT "rse_event_communication_plan_responsible_id_users_id_fk" FOREIGN KEY ("responsible_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_event_communication_plan" ADD CONSTRAINT "rse_event_communication_plan_asset_cloudinary_id_cloudinary_assets_id_fk" FOREIGN KEY ("asset_cloudinary_id") REFERENCES "public"."cloudinary_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_event_communication_plan" ADD CONSTRAINT "rse_event_communication_plan_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_event_logistics" ADD CONSTRAINT "rse_event_logistics_event_id_rse_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."rse_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_event_logistics" ADD CONSTRAINT "rse_event_logistics_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_event_results" ADD CONSTRAINT "rse_event_results_event_id_rse_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."rse_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_event_results" ADD CONSTRAINT "rse_event_results_post_event_report_cloudinary_id_cloudinary_assets_id_fk" FOREIGN KEY ("post_event_report_cloudinary_id") REFERENCES "public"."cloudinary_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_event_results" ADD CONSTRAINT "rse_event_results_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_event_results" ADD CONSTRAINT "rse_event_results_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_event_retroplanning" ADD CONSTRAINT "rse_event_retroplanning_event_id_rse_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."rse_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_event_retroplanning" ADD CONSTRAINT "rse_event_retroplanning_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_event_teams" ADD CONSTRAINT "rse_event_teams_event_id_rse_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."rse_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_event_teams" ADD CONSTRAINT "rse_event_teams_team_leader_id_users_id_fk" FOREIGN KEY ("team_leader_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_event_teams" ADD CONSTRAINT "rse_event_teams_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_events" ADD CONSTRAINT "rse_events_partner_id_rse_partnerships_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."rse_partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_events" ADD CONSTRAINT "rse_events_sopat_coordinator_id_users_id_fk" FOREIGN KEY ("sopat_coordinator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_events" ADD CONSTRAINT "rse_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_partnership_commitments" ADD CONSTRAINT "rse_partnership_commitments_partnership_id_rse_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."rse_partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_partnership_commitments" ADD CONSTRAINT "rse_partnership_commitments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_partnership_communications" ADD CONSTRAINT "rse_partnership_communications_partnership_id_rse_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."rse_partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_partnership_communications" ADD CONSTRAINT "rse_partnership_communications_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_partnership_communications" ADD CONSTRAINT "rse_partnership_communications_asset_cloudinary_id_cloudinary_assets_id_fk" FOREIGN KEY ("asset_cloudinary_id") REFERENCES "public"."cloudinary_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_partnership_communications" ADD CONSTRAINT "rse_partnership_communications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_partnerships" ADD CONSTRAINT "rse_partnerships_sopat_referent_id_users_id_fk" FOREIGN KEY ("sopat_referent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_partnerships" ADD CONSTRAINT "rse_partnerships_convention_pdf_cloudinary_id_cloudinary_assets_id_fk" FOREIGN KEY ("convention_pdf_cloudinary_id") REFERENCES "public"."cloudinary_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rse_partnerships" ADD CONSTRAINT "rse_partnerships_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_zones_project_id_idx" ON "project_zones" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "rse_activity_log_partnership_id_idx" ON "rse_activity_log" USING btree ("partnership_id");--> statement-breakpoint
CREATE INDEX "rse_activity_log_actor_id_idx" ON "rse_activity_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "rse_event_comm_plan_event_id_idx" ON "rse_event_communication_plan" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "rse_event_logistics_event_id_idx" ON "rse_event_logistics" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "rse_event_results_event_id_idx" ON "rse_event_results" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "rse_event_retroplanning_event_id_idx" ON "rse_event_retroplanning" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "rse_event_teams_event_id_idx" ON "rse_event_teams" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "rse_events_status_idx" ON "rse_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rse_events_type_idx" ON "rse_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "rse_events_date_idx" ON "rse_events" USING btree ("date");--> statement-breakpoint
CREATE INDEX "rse_commitments_partnership_id_idx" ON "rse_partnership_commitments" USING btree ("partnership_id");--> statement-breakpoint
CREATE INDEX "rse_commitments_status_idx" ON "rse_partnership_commitments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rse_communications_partnership_id_idx" ON "rse_partnership_communications" USING btree ("partnership_id");--> statement-breakpoint
CREATE INDEX "rse_communications_status_idx" ON "rse_partnership_communications" USING btree ("validation_status");--> statement-breakpoint
CREATE INDEX "rse_partnerships_status_idx" ON "rse_partnerships" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rse_partnerships_referent_idx" ON "rse_partnerships" USING btree ("sopat_referent_id");