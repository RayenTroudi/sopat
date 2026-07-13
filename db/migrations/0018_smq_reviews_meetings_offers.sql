-- SMQ digitalisation: Revue de direction (FOR MQ 15), PV de réunion (FOR MI 04),
-- Suivi des offres commerciales (FOR CO 01)

CREATE TYPE "management_review_status" AS ENUM ('planned', 'held', 'closed');
CREATE TYPE "management_review_action_type" AS ENUM ('amelioration', 'ressources', 'changement_smq', 'autre');
CREATE TYPE "offer_status" AS ENUM ('en_preparation', 'envoyee', 'en_negociation', 'gagnee', 'perdue', 'annulee');

CREATE TABLE IF NOT EXISTS "management_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reference" varchar(30) NOT NULL UNIQUE,
  "review_date" date NOT NULL,
  "status" "management_review_status" NOT NULL DEFAULT 'planned',
  "participants" text,
  "agenda" text,
  "previous_actions_status" text,
  "context_changes" text,
  "customer_satisfaction" text,
  "quality_objectives_review" text,
  "process_performance" text,
  "nc_capa_status" text,
  "audit_results" text,
  "supplier_performance" text,
  "resource_adequacy" text,
  "risks_opportunities_review" text,
  "improvement_opportunities" text,
  "conclusions" text,
  "deleted_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "created_by" uuid NOT NULL REFERENCES "users"("id")
);
CREATE INDEX IF NOT EXISTS "mgmt_reviews_status_idx" ON "management_reviews" ("status");
CREATE INDEX IF NOT EXISTS "mgmt_reviews_date_idx" ON "management_reviews" ("review_date");

CREATE TABLE IF NOT EXISTS "management_review_actions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "review_id" uuid NOT NULL REFERENCES "management_reviews"("id"),
  "type" "management_review_action_type" NOT NULL DEFAULT 'amelioration',
  "description" text NOT NULL,
  "responsible" text,
  "target_date" date,
  "completed_at" timestamp,
  "result" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "created_by" uuid NOT NULL REFERENCES "users"("id")
);
CREATE INDEX IF NOT EXISTS "mgmt_review_actions_review_idx" ON "management_review_actions" ("review_id");

CREATE TABLE IF NOT EXISTS "meeting_minutes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reference" varchar(30) NOT NULL UNIQUE,
  "meeting_date" date NOT NULL,
  "meeting_type" varchar(100),
  "location" varchar(255),
  "participants" text,
  "absentees" text,
  "agenda" text,
  "discussions" text,
  "decisions" text,
  "next_meeting_date" date,
  "deleted_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "created_by" uuid NOT NULL REFERENCES "users"("id")
);
CREATE INDEX IF NOT EXISTS "meeting_minutes_date_idx" ON "meeting_minutes" ("meeting_date");

CREATE TABLE IF NOT EXISTS "meeting_action_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "meeting_id" uuid NOT NULL REFERENCES "meeting_minutes"("id"),
  "description" text NOT NULL,
  "responsible" text,
  "target_date" date,
  "completed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "created_by" uuid NOT NULL REFERENCES "users"("id")
);
CREATE INDEX IF NOT EXISTS "meeting_action_items_meeting_idx" ON "meeting_action_items" ("meeting_id");

CREATE TABLE IF NOT EXISTS "commercial_offers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reference" varchar(30) NOT NULL UNIQUE,
  "client_id" uuid REFERENCES "clients"("id"),
  "client_name" varchar(255),
  "project_title" varchar(255) NOT NULL,
  "project_type" varchar(100),
  "description" text,
  "amount" numeric(14,3),
  "currency" varchar(10) NOT NULL DEFAULT 'TND',
  "sent_date" date,
  "validity_date" date,
  "status" "offer_status" NOT NULL DEFAULT 'en_preparation',
  "decision_date" date,
  "lost_reason" text,
  "project_id" uuid REFERENCES "projects"("id"),
  "responsible" text,
  "notes" text,
  "deleted_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "created_by" uuid NOT NULL REFERENCES "users"("id")
);
CREATE INDEX IF NOT EXISTS "commercial_offers_status_idx" ON "commercial_offers" ("status");
CREATE INDEX IF NOT EXISTS "commercial_offers_client_idx" ON "commercial_offers" ("client_id");
