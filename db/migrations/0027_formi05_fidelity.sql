-- Migration 0027: FOR-MI-05 register fidelity fixes
-- 1. Split the MI process into MI1 / MI2 (the register tracks them separately).
-- 2. Store the Désignation R/O free-text labels (columns AK / AL), which the
--    boolean is_risk / is_opportunity flags cannot carry.
-- 3. Store planning expressions used as deadlines ("S3 Juin 2025",
--    "Réunion du groupe", "Après la revue de direction") that do not fit a timestamp.
-- 4. Allow a CAPA to carry a free-text responsible with no platform account.

ALTER TYPE nc_dept ADD VALUE IF NOT EXISTS 'MI1';

ALTER TYPE nc_dept ADD VALUE IF NOT EXISTS 'MI2';

ALTER TABLE non_conformances
  ADD COLUMN IF NOT EXISTS risk_designation                 text,
  ADD COLUMN IF NOT EXISTS opportunity_designation          text,
  ADD COLUMN IF NOT EXISTS correction_deadline_planned_text varchar(200),
  ADD COLUMN IF NOT EXISTS correction_deadline_actual_text  varchar(200);

ALTER TABLE corrective_actions
  ADD COLUMN IF NOT EXISTS deadline_planned_text  varchar(200),
  ADD COLUMN IF NOT EXISTS deadline_actual_text   varchar(200),
  ADD COLUMN IF NOT EXISTS eval_date_planned_text varchar(200),
  ADD COLUMN IF NOT EXISTS eval_date_actual_text  varchar(200);

ALTER TABLE corrective_actions ALTER COLUMN responsible_id DROP NOT NULL;
