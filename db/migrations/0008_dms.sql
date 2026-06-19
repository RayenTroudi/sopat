-- =============================================================================
-- 0008_dms.sql
-- ISO 9001:2015 Document Management System
-- Soft-deprecates the legacy `documents` table (kept read-only) and introduces
-- the full DMS: versioning, workflow, signatures, polymorphic linkage,
-- fine-grained ACL, controlled forms/records, and an immutable audit log.
-- =============================================================================

-- ─── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE dms_department AS ENUM (
    'direction','etudes','realisation','entretien',
    'qualite','finance','rh','rse','transverse'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE dms_category AS ENUM (
    'manuel_qualite','politique','procedure','instruction','formulaire',
    'enregistrement','plan_qualite','cartographie_processus','etude_technique',
    'devis','contrat','bon_commande','facture','rapport_inspection',
    'rapport_audit','ncr','capa','document_fournisseur','document_client',
    'externe'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE dms_lifecycle_status AS ENUM (
    'draft','in_review','pending_approval','approved','effective',
    'under_revision','obsolete','archived'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE dms_confidentiality AS ENUM ('public','internal','confidential','restricted');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE dms_approval_action AS ENUM (
    'submit_for_review','review_approved','review_rejected','approve','reject',
    'publish','request_revision','mark_obsolete','archive'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE dms_audit_event AS ENUM (
    'created','updated','version_created','status_changed','reviewed',
    'approved','rejected','published','obsoleted','archived','viewed',
    'downloaded','signed','linked','unlinked','permission_changed',
    'soft_deleted','restored'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE dms_link_entity AS ENUM (
    'project','client','supplier','non_conformance','corrective_action',
    'audit_log','maintenance_visit','purchase_order','rse_partnership',
    'project_phase','user'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE dms_signature_type AS ENUM ('electronic_simple','electronic_advanced','wet_scanned');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE dms_permission_level AS ENUM ('view','comment','edit','approve','manage');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE dms_permission_subject AS ENUM ('user','role');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── Documents ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dms_documents (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number         varchar(50) NOT NULL UNIQUE,
  title                   varchar(255) NOT NULL,
  description             text,
  category                dms_category NOT NULL,
  department              dms_department NOT NULL,
  iso_clauses             text[] NOT NULL DEFAULT '{}'::text[],
  confidentiality         dms_confidentiality NOT NULL DEFAULT 'internal',
  tags                    text[] NOT NULL DEFAULT '{}'::text[],
  current_version_id      uuid,
  status                  dms_lifecycle_status NOT NULL DEFAULT 'draft',
  owner_id                uuid NOT NULL REFERENCES users(id),
  author_id               uuid NOT NULL REFERENCES users(id),
  department_manager_id   uuid REFERENCES users(id),
  effective_date          timestamp,
  next_review_date        timestamp,
  expiration_date         timestamp,
  obsoleted_at            timestamp,
  retention_years         integer NOT NULL DEFAULT 10,
  retention_expires_at    timestamp,
  legacy_reference        varchar(500),
  supersedes_id           uuid,
  superseded_by_id        uuid,
  created_at              timestamp NOT NULL DEFAULT now(),
  updated_at              timestamp NOT NULL DEFAULT now(),
  deleted_at              timestamp,
  created_by              uuid NOT NULL REFERENCES users(id)
);

ALTER TABLE dms_documents
  ADD CONSTRAINT dms_documents_supersedes_fk
  FOREIGN KEY (supersedes_id) REFERENCES dms_documents(id);
ALTER TABLE dms_documents
  ADD CONSTRAINT dms_documents_superseded_by_fk
  FOREIGN KEY (superseded_by_id) REFERENCES dms_documents(id);

CREATE INDEX IF NOT EXISTS dms_documents_department_idx  ON dms_documents(department);
CREATE INDEX IF NOT EXISTS dms_documents_category_idx    ON dms_documents(category);
CREATE INDEX IF NOT EXISTS dms_documents_status_idx      ON dms_documents(status);
CREATE INDEX IF NOT EXISTS dms_documents_owner_idx       ON dms_documents(owner_id);
CREATE INDEX IF NOT EXISTS dms_documents_next_review_idx ON dms_documents(next_review_date);
CREATE INDEX IF NOT EXISTS dms_documents_deleted_at_idx  ON dms_documents(deleted_at);

-- Full-text search (French config) over title + description + document_number
CREATE INDEX IF NOT EXISTS dms_documents_search_idx
  ON dms_documents
  USING gin (to_tsvector('french',
    coalesce(document_number,'') || ' ' ||
    coalesce(title,'') || ' ' ||
    coalesce(description,'')
  ));

-- ─── Versions ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dms_document_versions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id         uuid NOT NULL REFERENCES dms_documents(id),
  version_major       integer NOT NULL DEFAULT 1,
  version_minor       integer NOT NULL DEFAULT 0,
  version_label       varchar(20) NOT NULL,
  cloudinary_asset_id uuid REFERENCES cloudinary_assets(id),
  inline_content      jsonb,
  content_hash        varchar(128) NOT NULL,
  file_size_bytes     integer,
  mime_type           varchar(100),
  extracted_text      text,
  status              dms_lifecycle_status NOT NULL DEFAULT 'draft',
  change_summary      text NOT NULL,
  change_reason       text,
  author_id           uuid NOT NULL REFERENCES users(id),
  reviewed_by_id      uuid REFERENCES users(id),
  reviewed_at         timestamp,
  approved_by_id      uuid REFERENCES users(id),
  approved_at         timestamp,
  published_at        timestamp,
  effective_date      timestamp,
  revision_number     integer NOT NULL DEFAULT 1,
  created_at          timestamp NOT NULL DEFAULT now(),
  updated_at          timestamp NOT NULL DEFAULT now(),
  created_by          uuid NOT NULL REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS dms_versions_doc_label_uidx
  ON dms_document_versions(document_id, version_label);
CREATE INDEX IF NOT EXISTS dms_versions_document_idx ON dms_document_versions(document_id);
CREATE INDEX IF NOT EXISTS dms_versions_status_idx   ON dms_document_versions(status);

-- Late FK: dms_documents.current_version_id → dms_document_versions(id)
ALTER TABLE dms_documents
  ADD CONSTRAINT dms_documents_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES dms_document_versions(id);

-- ─── Workflow steps ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dms_workflow_steps (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       uuid NOT NULL REFERENCES dms_documents(id),
  version_id        uuid NOT NULL REFERENCES dms_document_versions(id),
  step_order        integer NOT NULL,
  step_name         varchar(50) NOT NULL,
  assignee_id       uuid NOT NULL REFERENCES users(id),
  assignee_role     user_role,
  action            dms_approval_action,
  action_at         timestamp,
  comments          text,
  is_mandatory      boolean NOT NULL DEFAULT true,
  due_date          timestamp,
  reminder_sent_at  timestamp,
  created_at        timestamp NOT NULL DEFAULT now(),
  updated_at        timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dms_workflow_document_idx ON dms_workflow_steps(document_id);
CREATE INDEX IF NOT EXISTS dms_workflow_version_idx  ON dms_workflow_steps(version_id);
CREATE INDEX IF NOT EXISTS dms_workflow_assignee_idx ON dms_workflow_steps(assignee_id);

-- ─── Signatures ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dms_signatures (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id               uuid NOT NULL REFERENCES dms_document_versions(id),
  signer_id                uuid NOT NULL REFERENCES users(id),
  signer_name_snapshot     varchar(255) NOT NULL,
  signer_role_snapshot     user_role NOT NULL,
  signature_type           dms_signature_type NOT NULL DEFAULT 'electronic_simple',
  purpose                  varchar(50) NOT NULL,
  signed_at                timestamp NOT NULL DEFAULT now(),
  ip_address               varchar(64),
  user_agent               text,
  content_hash_at_signing  varchar(128) NOT NULL,
  otp_challenge            varchar(100),
  cloudinary_asset_id      uuid REFERENCES cloudinary_assets(id),
  created_at               timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dms_signatures_version_idx ON dms_signatures(version_id);
CREATE INDEX IF NOT EXISTS dms_signatures_signer_idx  ON dms_signatures(signer_id);

-- ─── Polymorphic links to business entities ───────────────────────────────────

CREATE TABLE IF NOT EXISTS dms_document_links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid NOT NULL REFERENCES dms_documents(id),
  entity_type   dms_link_entity NOT NULL,
  entity_id     uuid NOT NULL,
  link_role     varchar(50),
  notes         text,
  created_at    timestamp NOT NULL DEFAULT now(),
  updated_at    timestamp NOT NULL DEFAULT now(),
  created_by    uuid NOT NULL REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS dms_links_unique_uidx
  ON dms_document_links(document_id, entity_type, entity_id, link_role);
CREATE INDEX IF NOT EXISTS dms_links_entity_idx   ON dms_document_links(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS dms_links_document_idx ON dms_document_links(document_id);

-- ─── Immutable audit log ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dms_audit_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id         uuid NOT NULL REFERENCES dms_documents(id),
  version_id          uuid REFERENCES dms_document_versions(id),
  event               dms_audit_event NOT NULL,
  actor_id            uuid NOT NULL REFERENCES users(id),
  actor_role_snapshot user_role NOT NULL,
  previous_state      jsonb,
  new_state           jsonb,
  metadata            jsonb,
  ip_address          varchar(64),
  user_agent          text,
  occurred_at         timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dms_audit_document_idx ON dms_audit_log(document_id);
CREATE INDEX IF NOT EXISTS dms_audit_actor_idx    ON dms_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS dms_audit_event_idx    ON dms_audit_log(event);
CREATE INDEX IF NOT EXISTS dms_audit_occurred_idx ON dms_audit_log(occurred_at);

-- Block UPDATE/DELETE on audit log to enforce immutability (ISO 7.5.3).
CREATE OR REPLACE FUNCTION dms_audit_log_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'dms_audit_log is append-only';
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dms_audit_log_no_update ON dms_audit_log;
CREATE TRIGGER dms_audit_log_no_update
  BEFORE UPDATE OR DELETE ON dms_audit_log
  FOR EACH ROW EXECUTE FUNCTION dms_audit_log_immutable();

-- ─── Permissions ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dms_permissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid REFERENCES dms_documents(id),
  category      dms_category,
  department    dms_department,
  subject_type  dms_permission_subject NOT NULL,
  subject_id    uuid REFERENCES users(id),
  subject_role  user_role,
  level         dms_permission_level NOT NULL,
  created_at    timestamp NOT NULL DEFAULT now(),
  updated_at    timestamp NOT NULL DEFAULT now(),
  created_by    uuid NOT NULL REFERENCES users(id),
  CONSTRAINT dms_perms_subject_chk CHECK (
    (subject_type = 'user' AND subject_id IS NOT NULL AND subject_role IS NULL) OR
    (subject_type = 'role' AND subject_role IS NOT NULL AND subject_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS dms_perms_document_idx     ON dms_permissions(document_id);
CREATE INDEX IF NOT EXISTS dms_perms_subject_user_idx ON dms_permissions(subject_id);
CREATE INDEX IF NOT EXISTS dms_perms_subject_role_idx ON dms_permissions(subject_role);
CREATE INDEX IF NOT EXISTS dms_perms_scope_idx        ON dms_permissions(category, department);

-- ─── Numbering sequences ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dms_numbering_sequences (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department  dms_department NOT NULL,
  category    dms_category NOT NULL,
  year        integer NOT NULL,
  last_seq    integer NOT NULL DEFAULT 0,
  updated_at  timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS dms_numbering_unique_uidx
  ON dms_numbering_sequences(department, category, year);

-- ─── Controlled forms (templates) and submissions (records) ───────────────────

CREATE TABLE IF NOT EXISTS dms_form_templates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id         uuid NOT NULL UNIQUE REFERENCES dms_documents(id),
  schema_json         jsonb NOT NULL,
  ui_schema_json      jsonb,
  default_link_entity dms_link_entity,
  created_at          timestamp NOT NULL DEFAULT now(),
  updated_at          timestamp NOT NULL DEFAULT now(),
  created_by          uuid NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS dms_form_submissions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_template_id   uuid NOT NULL REFERENCES dms_form_templates(id),
  form_version_label varchar(20) NOT NULL,
  record_document_id uuid NOT NULL REFERENCES dms_documents(id),
  data               jsonb NOT NULL,
  linked_entity_type dms_link_entity,
  linked_entity_id   uuid,
  submitted_at       timestamp NOT NULL DEFAULT now(),
  submitted_by       uuid NOT NULL REFERENCES users(id),
  created_at         timestamp NOT NULL DEFAULT now(),
  updated_at         timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dms_submissions_template_idx ON dms_form_submissions(form_template_id);
CREATE INDEX IF NOT EXISTS dms_submissions_record_idx   ON dms_form_submissions(record_document_id);
CREATE INDEX IF NOT EXISTS dms_submissions_entity_idx
  ON dms_form_submissions(linked_entity_type, linked_entity_id);

-- =============================================================================
-- Backfill from the legacy `documents` table (kept read-only).
-- Each legacy row becomes a dms_documents row + a synthetic v1.0 version.
-- Maps:
--   legacy.category  → dms_category    (procedure|instruction|formulaire|
--                                       enregistrement|autre→procedure)
--   legacy.status    → dms_lifecycle_status
--                      (draft→draft, active→effective, obsolete→obsolete)
--   legacy.process_affected → dms_department
--                      (etudes→etudes, realisation→realisation,
--                       entretien→entretien, NULL→transverse)
-- Departmental defaults map onto the existing user_role chefs.
-- =============================================================================

DO $$
DECLARE
  legacy RECORD;
  new_doc_id uuid;
  new_ver_id uuid;
  mapped_category dms_category;
  mapped_status   dms_lifecycle_status;
  mapped_dept     dms_department;
  doc_number      varchar(50);
  seq_int         integer;
  current_year    integer := EXTRACT(YEAR FROM now())::int;
BEGIN
  -- Only proceed if legacy table exists.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'documents'
  ) THEN
    RETURN;
  END IF;

  FOR legacy IN
    SELECT * FROM documents
    WHERE NOT EXISTS (
      SELECT 1 FROM dms_documents d WHERE d.legacy_reference = 'documents:' || documents.id::text
    )
  LOOP
    -- Category mapping
    mapped_category := CASE legacy.category::text
      WHEN 'procedure'      THEN 'procedure'::dms_category
      WHEN 'instruction'    THEN 'instruction'::dms_category
      WHEN 'formulaire'     THEN 'formulaire'::dms_category
      WHEN 'enregistrement' THEN 'enregistrement'::dms_category
      ELSE 'procedure'::dms_category
    END;

    -- Status mapping
    mapped_status := CASE legacy.status::text
      WHEN 'active'   THEN 'effective'::dms_lifecycle_status
      WHEN 'obsolete' THEN 'obsolete'::dms_lifecycle_status
      ELSE 'draft'::dms_lifecycle_status
    END;

    -- Department mapping (from legacy process_affected, which is phase enum)
    mapped_dept := CASE legacy.process_affected::text
      WHEN 'etudes'      THEN 'etudes'::dms_department
      WHEN 'realisation' THEN 'realisation'::dms_department
      WHEN 'entretien'   THEN 'entretien'::dms_department
      ELSE 'transverse'::dms_department
    END;

    -- Atomically increment numbering sequence for (dept, category, year)
    INSERT INTO dms_numbering_sequences (department, category, year, last_seq)
    VALUES (mapped_dept, mapped_category, current_year, 1)
    ON CONFLICT (department, category, year)
    DO UPDATE SET last_seq = dms_numbering_sequences.last_seq + 1, updated_at = now()
    RETURNING last_seq INTO seq_int;

    doc_number := 'SOPAT-LEGACY-' || legacy.code;

    new_doc_id := gen_random_uuid();
    new_ver_id := gen_random_uuid();

    INSERT INTO dms_documents (
      id, document_number, title, description, category, department,
      iso_clauses, confidentiality, status,
      owner_id, author_id, created_by,
      effective_date, obsoleted_at, legacy_reference,
      created_at, updated_at
    ) VALUES (
      new_doc_id,
      doc_number,
      legacy.title,
      legacy.notes,
      mapped_category,
      mapped_dept,
      CASE WHEN legacy.iso_clause IS NOT NULL THEN ARRAY[legacy.iso_clause] ELSE '{}'::text[] END,
      'internal'::dms_confidentiality,
      mapped_status,
      legacy.owner_id,
      legacy.created_by,
      legacy.created_by,
      legacy.effective_date,
      legacy.obsoleted_at,
      'documents:' || legacy.id::text,
      legacy.created_at,
      legacy.updated_at
    );

    INSERT INTO dms_document_versions (
      id, document_id, version_major, version_minor, version_label,
      cloudinary_asset_id, content_hash, status,
      change_summary, change_reason,
      author_id, created_by,
      published_at, effective_date,
      created_at, updated_at
    ) VALUES (
      new_ver_id,
      new_doc_id,
      1, 0, '1.0',
      legacy.asset_id,
      -- No hash available for legacy content; use sentinel marker so integrity
      -- checks distinguish legacy-imported rows from genuine SHA-512 hashes.
      'legacy:sha512-unavailable',
      mapped_status,
      'Imported from legacy documents table',
      'Soft-deprecation migration from documents → dms_documents',
      legacy.created_by,
      legacy.created_by,
      CASE WHEN mapped_status IN ('effective','obsolete') THEN legacy.effective_date ELSE NULL END,
      legacy.effective_date,
      legacy.created_at,
      legacy.updated_at
    );

    UPDATE dms_documents
      SET current_version_id = new_ver_id
      WHERE id = new_doc_id;

    -- Initial audit entry so the trail starts at row 1.
    INSERT INTO dms_audit_log (
      document_id, version_id, event, actor_id, actor_role_snapshot,
      new_state, metadata, occurred_at
    ) VALUES (
      new_doc_id, new_ver_id, 'created', legacy.created_by,
      (SELECT role FROM users WHERE id = legacy.created_by),
      jsonb_build_object('source','legacy_documents','legacy_id', legacy.id),
      jsonb_build_object('migration','0008_dms'),
      legacy.created_at
    );
  END LOOP;
END $$;

-- =============================================================================
-- Soft-deprecate the legacy `documents` table: revoke writes via a guard
-- trigger. Reads still work. Drop in a future migration once all callers are
-- migrated.
-- =============================================================================

CREATE OR REPLACE FUNCTION documents_legacy_readonly() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Legacy documents table is read-only. Use dms_documents instead.';
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_legacy_readonly_trg ON documents;
CREATE TRIGGER documents_legacy_readonly_trg
  BEFORE INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_legacy_readonly();
