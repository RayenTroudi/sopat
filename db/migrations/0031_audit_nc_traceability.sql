-- Migration 0031: traceability from an audit finding to the non-conformity it raised.
--
-- Chain being closed:
--   audit_programs → audit_program_items (constat) → non_conformances → corrective_actions
--   audit_logs ────────────────────────────────────↗
--
-- Three nullable relationships, none of which touches existing data:
--
-- 1. audit_program_items.nc_id — the primary relation. A finding marked NC in
--    FOR-MI-14 points at the non-conformity it produced. Single-valued, so a
--    finding can hold at most one NC by construction; the partial unique index
--    additionally stops two findings claiming the same NC.
--
-- 2. audit_logs.audit_program_id — links an executed audit (FOR-MI-13) back to
--    the programme (FOR-MI-14) it was planned under. The two tables were
--    previously unrelated, so programme completion could not be measured.
--
-- 3. non_conformances.audit_id — required because audit_logs records its findings
--    as free text and carries no programme items at all; an NC raised from such
--    an audit has no finding row to hang off. Verified against the schema and the
--    audits UI before adding.
--
-- Historical data is deliberately NOT backfilled. The 38 audit-sourced NCs come
-- from the FOR-MI-05 register import, whose source workbook names an auditor but
-- no audit record. Pairing them by date, auditor name or wording would invent a
-- quality relationship that was never recorded. They stay NULL until a human
-- supplies an explicit mapping.
--
-- Reversible: drop the three columns and their indexes. No column is altered and
-- no row is written by this migration.

ALTER TABLE audit_program_items
  ADD COLUMN IF NOT EXISTS nc_id uuid REFERENCES non_conformances(id);

CREATE INDEX IF NOT EXISTS audit_program_items_nc_idx
  ON audit_program_items (nc_id);

CREATE UNIQUE INDEX IF NOT EXISTS audit_program_items_nc_unique_idx
  ON audit_program_items (nc_id) WHERE nc_id IS NOT NULL;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS audit_program_id uuid REFERENCES audit_programs(id);

CREATE INDEX IF NOT EXISTS audit_logs_program_idx
  ON audit_logs (audit_program_id);

ALTER TABLE non_conformances
  ADD COLUMN IF NOT EXISTS audit_id uuid REFERENCES audit_logs(id);

CREATE INDEX IF NOT EXISTS nc_audit_id_idx
  ON non_conformances (audit_id);
