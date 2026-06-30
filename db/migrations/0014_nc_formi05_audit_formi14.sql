-- Migration 0014: Align NC system with FOR-MI-05 and add FOR-MI-14 audit programs
-- Adds: ncSource, dept, impact, immediate correction fields, risk/opportunity flags,
--       eval dates, client response, CAPA planned/actual dates, audit programs tables.

-- 1. New enums
DO $$ BEGIN
  CREATE TYPE nc_source AS ENUM ('interne','audit','reclamation_client','reclamation_pi');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE nc_dept AS ENUM ('AC','CO','ET','MI','RE1','RE2','RH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_program_status AS ENUM ('planifie','en_cours','realise','reporte','annule');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. New columns on non_conformances
ALTER TABLE non_conformances
  ADD COLUMN IF NOT EXISTS detector_name              text,
  ADD COLUMN IF NOT EXISTS detector_email             text,
  ADD COLUMN IF NOT EXISTS dept                       nc_dept,
  ADD COLUMN IF NOT EXISTS nc_source                  nc_source,
  ADD COLUMN IF NOT EXISTS reference_doc              varchar(100),
  ADD COLUMN IF NOT EXISTS impact                     text,
  ADD COLUMN IF NOT EXISTS immediate_correction       text,
  ADD COLUMN IF NOT EXISTS derogation_auth            boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rebut                      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS correction_responsible     text,
  ADD COLUMN IF NOT EXISTS correction_deadline_planned timestamp,
  ADD COLUMN IF NOT EXISTS correction_deadline_actual  timestamp,
  ADD COLUMN IF NOT EXISTS correction_status          varchar(30),
  ADD COLUMN IF NOT EXISTS eval_date_planned          timestamp,
  ADD COLUMN IF NOT EXISTS eval_date_actual           timestamp,
  ADD COLUMN IF NOT EXISTS client_response            text,
  ADD COLUMN IF NOT EXISTS is_risk                    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_opportunity             boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_second_capa          boolean DEFAULT false;

-- 3. New columns on corrective_actions
ALTER TABLE corrective_actions
  ADD COLUMN IF NOT EXISTS responsible_name   text,
  ADD COLUMN IF NOT EXISTS deadline_planned   timestamp,
  ADD COLUMN IF NOT EXISTS deadline_actual    timestamp,
  ADD COLUMN IF NOT EXISTS eval_date_planned  timestamp,
  ADD COLUMN IF NOT EXISTS eval_date_actual   timestamp,
  ADD COLUMN IF NOT EXISTS progress_status    varchar(50);

-- 4. Audit programs table (FOR-MI-14)
CREATE TABLE IF NOT EXISTS audit_programs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference             varchar(50) NOT NULL UNIQUE,
  year                  integer NOT NULL,
  dept                  nc_dept NOT NULL,
  title                 varchar(200),
  auditor_name          text,
  auditee_responsible   text,
  scheduled_date        timestamp,
  actual_date           timestamp,
  status                audit_program_status NOT NULL DEFAULT 'planifie',
  scope                 text,
  objectives            text,
  criteria              text,
  findings              text,
  report_asset_id       uuid REFERENCES cloudinary_assets(id),
  dms_document_code     varchar(20),
  notes                 text,
  created_at            timestamp NOT NULL DEFAULT now(),
  updated_at            timestamp NOT NULL DEFAULT now(),
  created_by            uuid NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS audit_programs_year_idx   ON audit_programs(year);
CREATE INDEX IF NOT EXISTS audit_programs_dept_idx   ON audit_programs(dept);
CREATE INDEX IF NOT EXISTS audit_programs_status_idx ON audit_programs(status);

-- 5. Audit program items table
CREATE TABLE IF NOT EXISTS audit_program_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_program_id    uuid NOT NULL REFERENCES audit_programs(id) ON DELETE CASCADE,
  process_code        varchar(20),
  clause_ref          varchar(50),
  question            text NOT NULL,
  response            text,
  conformity          varchar(10),
  evidence            text,
  sort_order          integer NOT NULL DEFAULT 0,
  created_at          timestamp NOT NULL DEFAULT now(),
  updated_at          timestamp NOT NULL DEFAULT now(),
  created_by          uuid NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS audit_program_items_program_idx ON audit_program_items(audit_program_id);
