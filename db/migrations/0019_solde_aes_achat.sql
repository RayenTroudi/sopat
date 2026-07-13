-- SMQ digitalisation phase 2: État de solde client (FOR CO 03),
-- Aspects environnementaux AES (PLA MI 04/05), Bons de livraison/retour
-- (FOR AC 06/05), Extra dépenses (FOR AC 01)

CREATE TYPE "client_entry_type" AS ENUM ('facture', 'encaissement', 'avoir');
CREATE TYPE "aes_condition" AS ENUM ('normale', 'anormale', 'urgence');
CREATE TYPE "aes_status" AS ENUM ('identified', 'controlled', 'closed');
CREATE TYPE "delivery_note_type" AS ENUM ('livraison', 'retour');
CREATE TYPE "extra_expense_status" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS "client_account_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "clients"("id"),
  "project_id" uuid REFERENCES "projects"("id"),
  "entry_type" "client_entry_type" NOT NULL,
  "amount" numeric(14,3) NOT NULL,
  "currency" varchar(10) NOT NULL DEFAULT 'TND',
  "entry_date" date NOT NULL,
  "reference" varchar(100),
  "notes" text,
  "deleted_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "created_by" uuid NOT NULL REFERENCES "users"("id")
);
CREATE INDEX IF NOT EXISTS "client_account_entries_client_idx" ON "client_account_entries" ("client_id");
CREATE INDEX IF NOT EXISTS "client_account_entries_type_idx" ON "client_account_entries" ("entry_type");

CREATE TABLE IF NOT EXISTS "environmental_aspects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reference" varchar(30) NOT NULL UNIQUE,
  "activity" text NOT NULL,
  "aspect" text NOT NULL,
  "impact" text,
  "condition" "aes_condition" NOT NULL DEFAULT 'normale',
  "frequency" integer,
  "gravity" integer,
  "significance" integer,
  "is_significant" boolean NOT NULL DEFAULT false,
  "control_measures" text,
  "legal_requirement" text,
  "status" "aes_status" NOT NULL DEFAULT 'identified',
  "deleted_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "created_by" uuid NOT NULL REFERENCES "users"("id")
);
CREATE INDEX IF NOT EXISTS "environmental_aspects_status_idx" ON "environmental_aspects" ("status");
CREATE INDEX IF NOT EXISTS "environmental_aspects_significant_idx" ON "environmental_aspects" ("is_significant");

CREATE TABLE IF NOT EXISTS "delivery_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reference" varchar(30) NOT NULL UNIQUE,
  "note_type" "delivery_note_type" NOT NULL,
  "note_date" date NOT NULL,
  "project_id" uuid REFERENCES "projects"("id"),
  "supplier_id" uuid REFERENCES "suppliers"("id"),
  "counterparty" varchar(255),
  "items" jsonb NOT NULL DEFAULT '[]',
  "driver_name" varchar(255),
  "receiver_name" varchar(255),
  "observations" text,
  "deleted_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "created_by" uuid NOT NULL REFERENCES "users"("id")
);
CREATE INDEX IF NOT EXISTS "delivery_notes_type_idx" ON "delivery_notes" ("note_type");
CREATE INDEX IF NOT EXISTS "delivery_notes_project_idx" ON "delivery_notes" ("project_id");

CREATE TABLE IF NOT EXISTS "extra_expenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reference" varchar(30) NOT NULL UNIQUE,
  "project_id" uuid REFERENCES "projects"("id"),
  "expense_date" date NOT NULL,
  "category" varchar(100),
  "description" text NOT NULL,
  "amount" numeric(12,3) NOT NULL,
  "currency" varchar(10) NOT NULL DEFAULT 'TND',
  "justification" text,
  "status" "extra_expense_status" NOT NULL DEFAULT 'pending',
  "approved_by" uuid REFERENCES "users"("id"),
  "approved_at" timestamp,
  "reject_reason" text,
  "deleted_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "created_by" uuid NOT NULL REFERENCES "users"("id")
);
CREATE INDEX IF NOT EXISTS "extra_expenses_status_idx" ON "extra_expenses" ("status");
CREATE INDEX IF NOT EXISTS "extra_expenses_project_idx" ON "extra_expenses" ("project_id");
