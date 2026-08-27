-- Migration 0030: atomic per-year sequences for the audit reference generators.
--
-- Root cause being fixed (identical to the NC generator repaired in 0029):
-- generateAuditReference() and generateAuditProgramReference() both derived the
-- next number from SELECT count(*) + 1, which is neither atomic (concurrent
-- callers read the same count and collide on the UNIQUE reference constraint,
-- surfacing as an unhandled 500 — reproduced at 24 duplicates out of 25) nor
-- correct (they counted by created_at year while labelling with the current
-- calendar year, so AUD-2025-001..003 inserted during 2026 made the next 2026
-- reference AUD-2026-004 instead of AUD-2026-001).
--
-- A single generic table serves both, rather than one table per generator.
-- `scope` is the sequence namespace, so the two generators — and the per-
-- department program counters — can never consume each other's numbers:
--
--   'audit'                -> AUD-YYYY-NNN        (audit_logs)
--   'audit_program:<DEPT>'  -> AUD-DEPT-YYYY-NN    (audit_programs)
--
-- nc_reference_sequences (migration 0029) is deliberately left alone: it is
-- already tested in production use, and migrating it here would risk a
-- regression for no functional gain.
--
-- Allocation is one atomic statement, as in 0029:
--   INSERT INTO reference_sequences (scope, year, last_number) VALUES (…)
--   ON CONFLICT (scope, year) DO UPDATE
--     SET last_number = reference_sequences.last_number + 1
--   RETURNING last_number;
-- ON CONFLICT DO UPDATE takes a row-level lock, so concurrent callers serialise.

CREATE TABLE IF NOT EXISTS reference_sequences (
  scope       varchar(60) NOT NULL,
  year        integer     NOT NULL,
  last_number integer     NOT NULL DEFAULT 0,
  updated_at  timestamp   NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, year)
);

-- Seed from the numeric suffix of existing valid references, never from a row
-- count. The year is taken from the reference itself, not created_at: the three
-- AUD-2025-* rows were inserted in 2026, so created_at would seed the wrong year.
-- Existing gaps are preserved — the counter starts after the highest number in
-- use and never backfills. No reference is read for anything but its maximum,
-- and no existing row is modified.

-- audit_logs: AUD-YYYY-NNN
INSERT INTO reference_sequences (scope, year, last_number)
SELECT
  'audit',
  substring(reference from '^AUD-([0-9]{4})-[0-9]+$')::int,
  max(substring(reference from '^AUD-[0-9]{4}-([0-9]+)$')::int)
FROM audit_logs
WHERE reference ~ '^AUD-[0-9]{4}-[0-9]+$'
GROUP BY 2
ON CONFLICT (scope, year) DO NOTHING;

-- audit_programs: AUD-DEPT-YYYY-NN, one counter per department and year
INSERT INTO reference_sequences (scope, year, last_number)
SELECT
  'audit_program:' || substring(reference from '^AUD-([A-Z0-9]+)-[0-9]{4}-[0-9]+$'),
  substring(reference from '^AUD-[A-Z0-9]+-([0-9]{4})-[0-9]+$')::int,
  max(substring(reference from '^AUD-[A-Z0-9]+-[0-9]{4}-([0-9]+)$')::int)
FROM audit_programs
WHERE reference ~ '^AUD-[A-Z0-9]+-[0-9]{4}-[0-9]+$'
GROUP BY 1, 2
ON CONFLICT (scope, year) DO NOTHING;
