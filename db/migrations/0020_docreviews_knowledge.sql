-- SMQ digitalisation phase 3: Revue documentaire (FOR MI 01),
-- Connaissances organisationnelles (ORG MI 09, ISO 9001 §7.1.6)

CREATE TYPE "document_review_status" AS ENUM ('planned', 'in_progress', 'completed');
CREATE TYPE "knowledge_status" AS ENUM ('active', 'a_preserver', 'archived');

CREATE TABLE IF NOT EXISTS "document_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reference" varchar(30) NOT NULL UNIQUE,
  "review_date" date NOT NULL,
  "scope" text,
  "documents_count" integer,
  "findings" text,
  "decisions" text,
  "status" "document_review_status" NOT NULL DEFAULT 'planned',
  "next_review_date" date,
  "deleted_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "created_by" uuid NOT NULL REFERENCES "users"("id")
);
CREATE INDEX IF NOT EXISTS "document_reviews_status_idx" ON "document_reviews" ("status");

CREATE TABLE IF NOT EXISTS "organizational_knowledge" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reference" varchar(30) NOT NULL UNIQUE,
  "domain" varchar(100),
  "title" varchar(255) NOT NULL,
  "description" text,
  "holder" varchar(255),
  "criticality" integer,
  "preservation_method" text,
  "transfer_plan" text,
  "status" "knowledge_status" NOT NULL DEFAULT 'active',
  "deleted_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "created_by" uuid NOT NULL REFERENCES "users"("id")
);
CREATE INDEX IF NOT EXISTS "org_knowledge_status_idx" ON "organizational_knowledge" ("status");
CREATE INDEX IF NOT EXISTS "org_knowledge_domain_idx" ON "organizational_knowledge" ("domain");
