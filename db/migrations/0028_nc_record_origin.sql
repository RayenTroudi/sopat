-- Migration 0028: distinguish historical/imported NC & CAPA records from records
-- raised inside the platform.
--
-- Rationale (ISO 9001:2015): records migrated from the Excel register predate the
-- platform's workflow, so they carry no evidence asset and no effectiveness
-- verification. Fabricating either would corrupt the quality record. Marking them
-- as imported lets the application represent them faithfully while the full
-- workflow stays mandatory for every new non-conformity.
--
-- Reversible: drop the three columns and the enum to undo (no data is destroyed
-- or overwritten by this migration).

-- Re-running is safe: the apply script skips statements that already exist.
CREATE TYPE record_origin AS ENUM ('platform', 'imported');

ALTER TABLE non_conformances
  ADD COLUMN IF NOT EXISTS record_origin record_origin NOT NULL DEFAULT 'platform',
  ADD COLUMN IF NOT EXISTS imported_from varchar(200),
  ADD COLUMN IF NOT EXISTS imported_at   timestamp;

ALTER TABLE corrective_actions
  ADD COLUMN IF NOT EXISTS record_origin record_origin NOT NULL DEFAULT 'platform',
  ADD COLUMN IF NOT EXISTS imported_from varchar(200),
  ADD COLUMN IF NOT EXISTS imported_at   timestamp;

CREATE INDEX IF NOT EXISTS nc_record_origin_idx ON non_conformances (record_origin);

CREATE INDEX IF NOT EXISTS capa_record_origin_idx ON corrective_actions (record_origin);
