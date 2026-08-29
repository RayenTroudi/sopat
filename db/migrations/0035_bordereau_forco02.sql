-- Migration 0035: FOR-CO-02 « Bordereau des prix » as a structured ERP document.
--
-- What already existed, and why this extends rather than replaces it
-- ------------------------------------------------------------------
-- FOR-CO-02 was already claimed by `commercial_offers` + `offer_line_items`
-- (migration 0021) and by the « Bordereau des prix (FOR-CO-02) » panel on the
-- offer page. That implementation is flat: a list of designation / unit /
-- quantity / unit price / total, with no sections, no categories, no norme, no
-- specification text, no VAT, no payment terms, no versioning and no import.
--
-- The source workbook is a two-level hierarchy (section → category → line)
-- carrying 266 priceable lines and long French specifications. Creating a
-- parallel `bordereau_*` document set would leave the ERP with two FOR-CO-02s,
-- so `offer_line_items` is turned INTO the tree instead. Every existing row
-- becomes `line_type = 'item'` with `parent_id = NULL` — exactly the flat list
-- it is today — so the current panel and `syncOfferAmount()` keep working.
--
-- The uploaded `.xltx` is a BLANK TEMPLATE: no client, no date, no price, no
-- quantity beyond a few placeholders, no total and no VAT rate anywhere. It is
-- therefore stored as a catalogue (`bordereau_templates`), NOT as an offer.
-- Offer instances receive their figures from a filled document or from ERP
-- entry; nothing in this migration lets the blank form manufacture money.
--
-- Money and the project budget
-- ----------------------------
-- `projects.approved_budget` is an internal COST ceiling: `project-spend.ts`
-- measures purchase orders, approved extra expenses, FOR-AC-10 purchases and
-- equipment rentals against it, and the 90 % / 100 % alerts fire on that ratio.
-- FOR-CO-02 is a client SELLING price. Writing one into the other would
-- silently deflate every consumption percentage in the application, so it is
-- not done. `projects.contract_amount` is added instead, written only by an
-- explicit human confirmation that records the suggested value, the approved
-- value, the user and the timestamp. `actual_revenue` is left alone: it means
-- realised/invoiced revenue, not the contractual price.
--
-- Reversible: drop the new tables, the trigger, the function, the four enums
-- and the added columns. No existing row is modified or deleted; every added
-- column is nullable or carries a default equal to today's behaviour.

-- ─── Enums ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE offer_line_type AS ENUM ('section', 'category', 'item', 'spec');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE offer_version_status AS ENUM ('draft', 'approved', 'superseded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE offer_milestone_basis AS ENUM ('htva', 'ttc');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE offer_milestone_trigger AS ENUM
    ('confirmation', 'during_works', 'completion', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── commercial_offers: the FOR-CO-02 document instance ──────────────────────
--
-- `amount` deliberately keeps its current meaning — the HTVA sum of the line
-- totals — because the commercial pipeline, the client screens and the
-- dashboards already read it. `total_htva` mirrors it, and TVA/TTC are added
-- beside it rather than over it.
--
-- `vat_rate` defaults to 0 so that not one existing offer's figures move when
-- VAT support arrives. New offers and imports take the configured rate from
-- `system_settings` in application code; the workbook itself carries no rate
-- and none is ever inferred from it.

ALTER TABLE commercial_offers
  ADD COLUMN IF NOT EXISTS document_code          varchar(20)  NOT NULL DEFAULT 'FOR-CO-02',
  ADD COLUMN IF NOT EXISTS form_revision          integer,
  ADD COLUMN IF NOT EXISTS offer_date             date,
  ADD COLUMN IF NOT EXISTS site_location          varchar(255),
  ADD COLUMN IF NOT EXISTS maitre_douvrage        varchar(255),
  -- The workbook's own « Référence projet », which uses a different scheme
  -- from projects.reference. Kept as provenance; never used to pick a project.
  ADD COLUMN IF NOT EXISTS project_reference_text varchar(100),
  ADD COLUMN IF NOT EXISTS vat_rate               numeric(5,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_htva             numeric(14,3),
  ADD COLUMN IF NOT EXISTS total_vat              numeric(14,3),
  ADD COLUMN IF NOT EXISTS total_ttc              numeric(14,3),
  ADD COLUMN IF NOT EXISTS validity_days          integer,
  ADD COLUMN IF NOT EXISTS current_version_no     integer      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_version_id    uuid,
  ADD COLUMN IF NOT EXISTS locked_at              timestamp;

-- At most one approved FOR-CO-02 per project; several offers per project stay
-- allowed, and a soft-deleted one never blocks a new approval.
CREATE UNIQUE INDEX IF NOT EXISTS commercial_offers_one_approved_per_project_uidx
  ON commercial_offers (project_id)
  WHERE project_id IS NOT NULL AND approved_version_id IS NOT NULL AND deleted_at IS NULL;

-- ─── offer_line_items becomes the FOR-CO-02 tree ─────────────────────────────
--
-- section → category → item / spec, addressed by a stable uuid. `source_code`
-- is what the sheet prints (the body skips II.12 and prints II.17 twice);
-- `display_code` is the recap's corrected 1…17. Both are kept: the export must
-- reproduce the source, the ERP must show something coherent, and neither may
-- be silently renumbered into the other.
--
-- `source_row` is provenance metadata only. It is never an identifier — that
-- is what `id` is for — and nothing joins on it.

ALTER TABLE offer_line_items
  ADD COLUMN IF NOT EXISTS parent_id              uuid REFERENCES offer_line_items(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS line_type              offer_line_type NOT NULL DEFAULT 'item',
  ADD COLUMN IF NOT EXISTS source_code            varchar(20),
  ADD COLUMN IF NOT EXISTS display_code           varchar(20),
  ADD COLUMN IF NOT EXISTS norme                  varchar(255),
  -- The long French specification carried in column B beside the designation.
  -- A business requirement, not decoration: it is what the client signs for.
  ADD COLUMN IF NOT EXISTS description            text,
  ADD COLUMN IF NOT EXISTS plant_species_id       uuid REFERENCES plant_species(id),
  ADD COLUMN IF NOT EXISTS decorative_material_id uuid REFERENCES decorative_materials(id),
  ADD COLUMN IF NOT EXISTS source_row             integer;

-- Section, category and specification rows carry no figures at all. Widening
-- these three columns is what lets a header exist without a fabricated 0.
ALTER TABLE offer_line_items ALTER COLUMN quantity   DROP NOT NULL;
ALTER TABLE offer_line_items ALTER COLUMN unit_price DROP NOT NULL;
ALTER TABLE offer_line_items ALTER COLUMN total      DROP NOT NULL;
ALTER TABLE offer_line_items ALTER COLUMN unit       DROP NOT NULL;
ALTER TABLE offer_line_items ALTER COLUMN unit       DROP DEFAULT;

CREATE INDEX IF NOT EXISTS offer_line_items_parent_idx ON offer_line_items (parent_id);
CREATE INDEX IF NOT EXISTS offer_line_items_offer_pos_idx ON offer_line_items (offer_id, position);

-- ─── The blank FOR-CO-02 catalogue ───────────────────────────────────────────
--
-- Kept in its own pair of tables rather than as an `is_template` flag on
-- `commercial_offers`: a flag would have to be excluded from every existing
-- offer query, KPI, pipeline widget and client-balance join, and one missed
-- filter would put a 266-line empty template into commercial reporting.
--
-- No price column exists here at all, by construction. `default_quantity`
-- holds the placeholder quantities the template itself prints (1 on most
-- Section I lines, 0 on « Amendement minéral »); cloning does NOT copy them
-- into an offer, so an instance never inherits a quantity nobody entered.

CREATE TABLE IF NOT EXISTS bordereau_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             varchar(20)  NOT NULL DEFAULT 'FOR-CO-02',
  revision         integer      NOT NULL DEFAULT 1,
  title            varchar(255) NOT NULL,
  source_file_name varchar(255),
  source_file_hash varchar(64)  NOT NULL,
  is_active        boolean      NOT NULL DEFAULT true,
  created_at       timestamp    NOT NULL DEFAULT now(),
  updated_at       timestamp    NOT NULL DEFAULT now(),
  created_by       uuid         NOT NULL REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS bordereau_templates_code_rev_uidx
  ON bordereau_templates (code, revision);
CREATE UNIQUE INDEX IF NOT EXISTS bordereau_templates_active_uidx
  ON bordereau_templates (code) WHERE is_active;

CREATE TABLE IF NOT EXISTS bordereau_template_lines (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id      uuid NOT NULL REFERENCES bordereau_templates(id) ON DELETE CASCADE,
  parent_id        uuid REFERENCES bordereau_template_lines(id) ON DELETE CASCADE,
  line_type        offer_line_type NOT NULL,
  source_code      varchar(20),
  display_code     varchar(20),
  designation      text NOT NULL,
  description      text,
  norme            varchar(255),
  -- Free text on purpose: the sheet writes "P" and "p" for the same unit and
  -- "Ens", "M³", "M²", "Sac", "TONNE" elsewhere. Normalising them would change
  -- the business meaning of a line the client signed.
  unit             varchar(20),
  default_quantity numeric(12,2),
  position         integer NOT NULL DEFAULT 0,
  source_row       integer,
  created_at       timestamp NOT NULL DEFAULT now(),
  updated_at       timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bordereau_template_lines_template_idx
  ON bordereau_template_lines (template_id, position);
CREATE INDEX IF NOT EXISTS bordereau_template_lines_parent_idx
  ON bordereau_template_lines (parent_id);

-- ─── Payment milestones ──────────────────────────────────────────────────────
--
-- The workbook's « 50 % lors de la confirmation / 30 % pendant les travaux /
-- 20 % à la fin du chantier » as structured rows rather than three lines of
-- free text. Planning data ONLY: nothing here creates an invoice, a receipt or
-- a `client_account_entries` row. The optional FK records, after the fact,
-- which FOR-CO-03 entry settled a milestone.

CREATE TABLE IF NOT EXISTS offer_payment_milestones (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id                uuid NOT NULL REFERENCES commercial_offers(id) ON DELETE CASCADE,
  position                integer NOT NULL DEFAULT 0,
  label                   varchar(255) NOT NULL,
  -- Percent, not fraction: 50 is 50 %. numeric(6,3) so 33.333 is expressible.
  percentage              numeric(6,3) NOT NULL,
  basis                   offer_milestone_basis   NOT NULL DEFAULT 'ttc',
  trigger_event           offer_milestone_trigger NOT NULL DEFAULT 'other',
  due_date                date,
  client_account_entry_id uuid REFERENCES client_account_entries(id),
  notes                   text,
  created_at              timestamp NOT NULL DEFAULT now(),
  updated_at              timestamp NOT NULL DEFAULT now(),
  created_by              uuid NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS offer_payment_milestones_offer_idx
  ON offer_payment_milestones (offer_id, position);

-- ─── Immutable versions ──────────────────────────────────────────────────────
--
-- A snapshot of the whole document — header, tree, milestones, totals — taken
-- when a version is cut. Once approved it is evidence: ISO 9001 traceability
-- means an approved commercial commitment can be re-read exactly as it was
-- signed, so immutability is enforced by the database, not by convention.

CREATE TABLE IF NOT EXISTS offer_versions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id       uuid NOT NULL REFERENCES commercial_offers(id),
  version_no     integer NOT NULL,
  label          varchar(60),
  status         offer_version_status NOT NULL DEFAULT 'draft',
  snapshot       jsonb NOT NULL,
  total_htva     numeric(14,3) NOT NULL DEFAULT 0,
  total_vat      numeric(14,3) NOT NULL DEFAULT 0,
  total_ttc      numeric(14,3) NOT NULL DEFAULT 0,
  vat_rate       numeric(5,4)  NOT NULL DEFAULT 0,
  line_count     integer NOT NULL DEFAULT 0,
  change_summary text NOT NULL,
  created_at     timestamp NOT NULL DEFAULT now(),
  created_by     uuid NOT NULL REFERENCES users(id),
  approved_by    uuid REFERENCES users(id),
  approved_at    timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS offer_versions_offer_no_uidx
  ON offer_versions (offer_id, version_no);
CREATE INDEX IF NOT EXISTS offer_versions_offer_idx ON offer_versions (offer_id);

ALTER TABLE commercial_offers
  DROP CONSTRAINT IF EXISTS commercial_offers_approved_version_fk;
ALTER TABLE commercial_offers
  ADD CONSTRAINT commercial_offers_approved_version_fk
  FOREIGN KEY (approved_version_id) REFERENCES offer_versions(id);

-- Content is frozen at insert. The only permitted mutations are the approval
-- stamp (draft → approved, once) and retirement (approved → superseded).
-- Deletion is refused outright: a version that was used is never unmade.
CREATE OR REPLACE FUNCTION offer_versions_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'offer_versions est immuable : la version % ne peut pas être supprimée', OLD.version_no;
  END IF;

  IF NEW.snapshot   IS DISTINCT FROM OLD.snapshot
  OR NEW.total_htva IS DISTINCT FROM OLD.total_htva
  OR NEW.total_vat  IS DISTINCT FROM OLD.total_vat
  OR NEW.total_ttc  IS DISTINCT FROM OLD.total_ttc
  OR NEW.vat_rate   IS DISTINCT FROM OLD.vat_rate
  OR NEW.line_count IS DISTINCT FROM OLD.line_count
  OR NEW.offer_id   IS DISTINCT FROM OLD.offer_id
  OR NEW.version_no IS DISTINCT FROM OLD.version_no
  OR NEW.created_by IS DISTINCT FROM OLD.created_by
  OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION
      'offer_versions est immuable : le contenu de la version % ne peut pas être modifié',
      OLD.version_no;
  END IF;

  IF OLD.status = 'approved' AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'une version approuvée ne peut pas redevenir un brouillon';
  END IF;
  IF OLD.status = 'superseded' AND NEW.status <> 'superseded' THEN
    RAISE EXCEPTION 'une version remplacée ne peut pas être réactivée';
  END IF;
  IF OLD.approved_by IS NOT NULL AND NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
    RAISE EXCEPTION 'l''approbateur d''une version ne peut pas être réécrit';
  END IF;

  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS offer_versions_guard_trg ON offer_versions;
CREATE TRIGGER offer_versions_guard_trg
  BEFORE UPDATE OR DELETE ON offer_versions
  FOR EACH ROW EXECUTE FUNCTION offer_versions_guard();

-- ─── Import ledger — this is the idempotency guarantee ───────────────────────
--
-- One row per committed import, keyed by the SHA-256 of the uploaded bytes.
-- Re-uploading the same file into the same offer is refused with "already
-- imported on <date> by <user>" instead of duplicating a commercial document.
-- Template imports are unique on the hash alone: the same `.xltx` must not be
-- able to produce a second template revision either.

CREATE TABLE IF NOT EXISTS offer_imports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id    uuid REFERENCES commercial_offers(id) ON DELETE CASCADE,
  template_id uuid REFERENCES bordereau_templates(id) ON DELETE CASCADE,
  file_name   varchar(255) NOT NULL,
  file_hash   varchar(64)  NOT NULL,
  byte_size   integer      NOT NULL,
  line_count  integer      NOT NULL DEFAULT 0,
  stats       jsonb,
  imported_by uuid NOT NULL REFERENCES users(id),
  imported_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT offer_imports_target_chk CHECK ((offer_id IS NULL) <> (template_id IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS offer_imports_offer_hash_uidx
  ON offer_imports (offer_id, file_hash) WHERE offer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS offer_imports_template_hash_uidx
  ON offer_imports (file_hash) WHERE template_id IS NOT NULL;

-- ─── projects.contract_amount ────────────────────────────────────────────────
--
-- The contractual selling price, so that gross margin = contract_amount −
-- project spend becomes computable WITHOUT touching approved_budget, which
-- stays the internal cost ceiling owned by the budget-validation flow, or
-- actual_revenue, which stays realised/invoiced revenue.
--
-- Never written automatically. Winning a FOR-CO-02 records a SUGGESTION; a
-- human confirms it, and the suggested value, the confirmed value, the user
-- and the timestamp are all kept — the same discipline the AI-assisted
-- workflows use.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS contract_amount               numeric(14,3),
  ADD COLUMN IF NOT EXISTS contract_amount_suggested     numeric(14,3),
  ADD COLUMN IF NOT EXISTS contract_amount_source_offer_id uuid REFERENCES commercial_offers(id),
  ADD COLUMN IF NOT EXISTS contract_amount_confirmed_by  uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS contract_amount_confirmed_at  timestamp;
