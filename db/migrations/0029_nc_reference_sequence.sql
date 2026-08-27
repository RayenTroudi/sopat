-- Migration 0029: atomic per-year sequence for platform NC references.
--
-- Root cause being fixed: generateNcReference() derived the next number from
-- SELECT count(*), which is neither atomic (two concurrent creations read the
-- same count and collide on the unique reference constraint, surfacing as an
-- unhandled 500) nor correct (the count included the 47 imported FOR-MI-05
-- register rows, which do not belong to the NC-YYYY-NNN sequence at all).
--
-- `last_number` is the highest number ALREADY allocated for that year.
-- Allocation is a single atomic statement:
--
--   INSERT INTO nc_reference_sequences (year, last_number) VALUES (y, seed)
--   ON CONFLICT (year) DO UPDATE
--     SET last_number = nc_reference_sequences.last_number + 1
--   RETURNING last_number;
--
-- ON CONFLICT DO UPDATE takes a row-level lock, so concurrent callers serialise
-- and each receives a distinct number. Numbers are never reused: the counter
-- only moves forward, independently of how many rows exist or are deleted.

CREATE TABLE IF NOT EXISTS nc_reference_sequences (
  year        integer   PRIMARY KEY,
  last_number integer   NOT NULL DEFAULT 0,
  updated_at  timestamp NOT NULL DEFAULT now()
);

-- Seed one row per year that already has platform references, set to the highest
-- number in use so the next allocation continues after it. Existing references
-- are read only — nothing is renumbered, and gaps stay gaps.
--
-- Deliberately NOT filtered on deleted_at: a soft-deleted NC still owns its
-- number, so deleting a record must never let its number be handed out again.
--
-- The year comes from the reference itself, not from created_at: NC-2025-001..003
-- were inserted in 2026, so created_at would seed the wrong year.
INSERT INTO nc_reference_sequences (year, last_number)
SELECT
  substring(reference from '^NC-([0-9]{4})-')::int          AS year,
  max(substring(reference from '^NC-[0-9]{4}-([0-9]+)$')::int) AS last_number
FROM non_conformances
WHERE reference ~ '^NC-[0-9]{4}-[0-9]+$'
GROUP BY 1
ON CONFLICT (year) DO NOTHING;
