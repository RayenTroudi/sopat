-- Migration 0041: clause applicability, criterion provenance, and resolution of
-- the legacy audit findings migration 0040 could not attach to a criterion.
--
-- What 0040 left open
-- -------------------
-- 0040 built the ISO register and the process cartography. Running it against the
-- production database surfaced three things it had no way to express:
--
--   1. Clause 6.3 (Planification des modifications) is assigned to no process by
--      any of the seven FOR-MI-14 workbooks. 0040 could only leave it out, which
--      renders as a silent hole in coverage — indistinguishable from a clause
--      nobody has got round to planning yet.
--
--   2. Eight agenda steps ended up with no ISO clause at all, because the
--      intersection guard in 0040 correctly refused to give a step a clause its
--      own process is not audited against. Those steps are real audit criteria;
--      they simply are not ISO requirements. Nothing recorded that distinction,
--      so they read as broken rows.
--
--   3. Six findings of the existing Achat programme carry the labels of the
--      hardcoded DEFAULT_AGENDA that the previous UI shipped, which match no
--      workbook step exactly. 0040 deliberately left them unlinked rather than
--      guess. They are resolvable — but from documentary evidence, not from
--      similarity of wording. See section 3.
--
-- What is NOT done here
-- ---------------------
-- No clause is assigned to a process to improve a coverage statistic. The
-- workbooks remain the source of truth for the "Référentiel ISO 9001" column, and
-- this migration does not add, remove or move a single row of qms_process_clauses.

-- ─── 1. Recorded decisions on clauses no process is audited against ──────────
--
-- Clause scope itself is NOT stored: it is derived from qms_process_clauses, so
-- it cannot drift from the cartography. A clause owned by every active process is
-- transversal, by several is shared, by one is process-specific, by none is
-- unassigned. What is not derivable — and so is stored here — is the quality
-- manager's decision about a clause no process owns.
--
-- This table is an exception register: a clause with no row is simply covered by
-- the cartography. Only clauses needing a human decision appear.

DO $$ BEGIN
  CREATE TYPE clause_disposition AS ENUM (
    'pending_decision',  -- no process owns it and nobody has ruled on it yet
    'transversal',       -- audited at organisation level, outside the per-process programme
    'excluded'           -- deemed not applicable, with justification
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS qms_clause_decisions (
  clause_code   varchar(10) PRIMARY KEY REFERENCES iso_clauses(code),
  disposition   clause_disposition NOT NULL,
  justification text NOT NULL,
  decided_by    uuid REFERENCES users(id),
  decided_at    timestamp,
  created_at    timestamp NOT NULL DEFAULT now(),
  updated_at    timestamp NOT NULL DEFAULT now()
);

-- 6.3 is seeded as an open question, not as a resolved one. `decided_by` and
-- `decided_at` are deliberately NULL: no one at SOPAT has ruled on this yet, and
-- recording a decision nobody made would be worse than recording the gap.
--
-- The analysis behind the text: ISO 9001:2015 § 6.3 concerns changes to the
-- quality management system itself being carried out in a planned manner. Change
-- control at the operational level IS audited — § 8.2.4 (changes to product and
-- service requirements), § 8.3.6 (design changes) and § 8.5.6 (control of changes
-- in production) all sit under clauses the workbooks do assign. What no workbook
-- covers is change to the QMS itself, which would naturally belong to the
-- Management Qualité process. Adding it there is a quality decision, not a
-- migration's decision.
INSERT INTO qms_clause_decisions (clause_code, disposition, justification) VALUES
  ('6.3', 'pending_decision',
   'Aucun des sept classeurs FOR-MI-14 (version 2, campagne mai 2025) n''attribue la clause 6.3 ' ||
   'à un processus. La maîtrise des modifications au niveau opérationnel est auditée par ailleurs ' ||
   '(§ 8.2.4 sous 8.2, § 8.3.6 sous 8.3, § 8.5.6 sous 8.5, tous présents dans les référentiels). ' ||
   'Ce qui n''est couvert par aucun processus, c''est la planification des modifications du SMQ ' ||
   'lui-même, qui relèverait du processus Management Qualité. Rattacher 6.3 au processus MI ou ' ||
   'justifier son exclusion est une décision du responsable qualité : elle n''a pas été prise ici ' ||
   'pour ne pas modifier une exigence issue du classeur.')
ON CONFLICT (clause_code) DO NOTHING;

-- ─── 2. Provenance of an audit criterion ─────────────────────────────────────
--
-- An agenda step is an audit criterion. Some map onto ISO requirements; others
-- are SOPAT's own process checks whose ISO anchor is the process referential as a
-- whole rather than one clause. The workbooks assign clauses per process for
-- exactly this reason — 4.4 and 7.5 in particular are not attributable to a
-- single agenda step in any of the seven processes.
--
-- Recording which is which stops a criterion with no clause from reading as a
-- defect, and stops anyone "fixing" it by inventing an ISO mapping the workbook
-- does not support.

DO $$ BEGIN
  CREATE TYPE criterion_type AS ENUM (
    'iso',      -- anchored to one or more ISO clauses of its process referential
    'process'   -- SOPAT process check; ISO anchor is the process referential itself
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE qms_process_steps
  ADD COLUMN IF NOT EXISTS criterion_type criterion_type NOT NULL DEFAULT 'iso';

-- Derived, not asserted: a step is a process criterion exactly when 0040's
-- intersection guard left it with no clause of its own process referential.
UPDATE qms_process_steps s
SET criterion_type = 'process'
WHERE NOT EXISTS (SELECT 1 FROM qms_process_step_clauses sc WHERE sc.step_id = s.id);

-- Symmetrically on the process side: a clause covered by no step of its process
-- is audited across the whole process rather than at one agenda step. 4.4 and 7.5
-- are in this position for all seven processes.
DO $$ BEGIN
  CREATE TYPE clause_coverage_mode AS ENUM ('step', 'process');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE qms_process_clauses
  ADD COLUMN IF NOT EXISTS coverage_mode clause_coverage_mode NOT NULL DEFAULT 'step';

UPDATE qms_process_clauses pc
SET coverage_mode = 'process'
WHERE NOT EXISTS (
  SELECT 1 FROM qms_process_steps s
  JOIN qms_process_step_clauses sc ON sc.step_id = s.id
  WHERE s.process_code = pc.process_code AND sc.clause_code = pc.clause_code
);

-- ─── 3. Legacy criterion labels ──────────────────────────────────────────────
--
-- Findings recorded through the previous interface carry the labels of the
-- hardcoded DEFAULT_AGENDA that shipped in
-- src/app/admin/(dashboard)/audit-programs/AuditProgramsClient.tsx before
-- migration 0040. Those labels are abbreviations of the workbook steps, and in
-- several cases one label stood for two workbook steps.
--
-- The mapping below is NOT inferred from similarity of wording. It is read off
-- that source file, which is in version control: for each process, the constant
-- listed its agenda in the workbook's own order, so entry N of DEFAULT_AGENDA is
-- the code's rendering of a known workbook step. The one-to-two rows are the
-- cases where the constant merged two consecutive workbook steps into one line —
-- which is exactly the drift 0040 documented (AC 6 entries against 7 workbook
-- steps, CO 7 against 9, ET 6 against 8, RE1 6 against 7, RE2 8 against 10,
-- RH 6 against 8; MI alone was 11 against 11).
--
-- An alias may resolve to more than one step. That is information, not a defect:
-- a finding recorded against a merged label genuinely assessed two criteria, and
-- collapsing it onto one of them would record a guess as an audit fact.

CREATE TABLE IF NOT EXISTS qms_process_step_aliases (
  process_code nc_dept NOT NULL REFERENCES qms_processes(code) ON DELETE CASCADE,
  alias_label  text    NOT NULL,
  step_id      uuid    NOT NULL REFERENCES qms_process_steps(id) ON DELETE CASCADE,
  -- Where the alias comes from, so a future reader can check it rather than trust it.
  source       text    NOT NULL DEFAULT 'DEFAULT_AGENDA (AuditProgramsClient.tsx, pre-0040)',
  PRIMARY KEY (process_code, alias_label, step_id)
);

CREATE INDEX IF NOT EXISTS qms_process_step_aliases_step_idx ON qms_process_step_aliases(step_id);

INSERT INTO qms_process_step_aliases (process_code, alias_label, step_id)
SELECT m.process_code::nc_dept, m.alias_label, s.id
FROM (VALUES
  -- AC — 6 legacy entries against 7 workbook steps
  ('AC', 'Plans d''actions R&O / Objectifs qualité',      'Plans d''actions face aux Risques & Opportunités'),
  ('AC', 'Plans d''actions R&O / Objectifs qualité',      'Objectifs qualité'),
  ('AC', 'Ressources - RH',                               'Ressources / RH / Responsabilités'),
  ('AC', 'Produits & services / Prestataires externes',   'Produits & services fournis par des prestataires externes'),
  ('AC', 'Surveillance - Mesure - Analyse',               'Evaluation des performances : Surveillance, mesure, analyse'),
  ('AC', 'NC - Réclamations',                             'NC – réclamations'),
  ('AC', 'AC - Améliorations',                            'AC – améliorations'),

  -- CO — 7 against 9
  ('CO', 'Plans R&O / Objectifs',                         'Plans d''actions face aux Risques & Opportunités'),
  ('CO', 'Plans R&O / Objectifs',                         'Objectifs qualité'),
  ('CO', 'Ressources - RH / Compétences',                 'Ressources / RH / Responsabilités'),
  ('CO', 'Ressources - RH / Compétences',                 'Compétences'),
  ('CO', 'Revue des offres / des contrats',               'Revue des offres / des contrats'),
  ('CO', 'Communication clients',                         'Communication avec les clients'),
  ('CO', 'Surveillance - Mesure - Analyse',               'Evaluation des performances : Surveillance, mesure, analyse'),
  ('CO', 'NC - Réclamations',                             'NC – réclamations'),
  ('CO', 'AC - Améliorations',                            'AC – améliorations'),

  -- ET — 6 against 8
  ('ET', 'Plans R&O / Objectifs',                         'Plans d''actions face aux Risques & Opportunités'),
  ('ET', 'Plans R&O / Objectifs',                         'Objectifs qualité'),
  ('ET', 'Ressources - RH / Compétences',                 'Ressources / RH / Responsabilités'),
  ('ET', 'Ressources - RH / Compétences',                 'Compétences'),
  ('ET', 'Études',                                        'Etudes'),
  ('ET', 'Surveillance - Mesure - Analyse',               'Evaluation des performances : Surveillance, mesure, analyse'),
  ('ET', 'NC - Réclamations',                             'NC – réclamations'),
  ('ET', 'AC - Améliorations',                            'AC – améliorations'),

  -- MI — 11 against 11; wording differs, structure does not
  ('MI', 'Contexte / Enjeux / Parties intéressées',       'Contexte : enjeux, parties intéressées'),
  ('MI', 'Plan R&O',                                      'Plan d''action face aux risques & opportunités'),
  ('MI', 'Politique et objectifs qualité',                'Politique et objectifs qualité / planification de l''atteinte des objectifs'),
  ('MI', 'Responsabilité - Autorités',                    'Responsabilité – autorités'),
  ('MI', 'Satisfaction client',                           'Satisfaction client'),
  ('MI', 'NC - AC',                                       'NC – Actions Correctives'),
  ('MI', 'Audit Interne',                                 'Audit Interne'),
  ('MI', 'Revue de direction',                            'Revue de direction'),
  ('MI', 'Communication',                                 'Communication'),
  ('MI', 'Gestion des connaissances',                     'Gestion des connaissances'),
  ('MI', 'Améliorations',                                 'Améliorations'),

  -- RE1 — 6 against 7
  ('RE1', 'Plans R&O / Objectifs',                        'Plans d''actions face aux Risques & Opportunités'),
  ('RE1', 'Plans R&O / Objectifs',                        'Objectifs qualité'),
  ('RE1', 'Ressources - RH',                              'Ressources / RH / Responsabilités'),
  ('RE1', 'Planification & Réalisation',                  'Planification & réalisation'),
  ('RE1', 'Surveillance - Mesure - Analyse',              'Evaluation des performances : Surveillance, mesure, analyse'),
  ('RE1', 'NC - Réclamations',                            'NC – réclamations'),
  ('RE1', 'AC - Améliorations',                           'AC – améliorations'),

  -- RE2 — 8 against 10
  ('RE2', 'Plans R&O / Objectifs',                        'Plans d''actions face aux Risques & Opportunités'),
  ('RE2', 'Plans R&O / Objectifs',                        'Objectifs qualité'),
  ('RE2', 'Ressources - RH / Compétences',                'Ressources / RH / Responsabilités'),
  ('RE2', 'Ressources - RH / Compétences',                'Compétences'),
  ('RE2', 'Infrastructures',                              'Infrastructures'),
  ('RE2', 'Planification',                                'Planification'),
  ('RE2', 'Réalisation (Travaux d''entretien)',           'Réalisation (Travaux d''entretien)'),
  ('RE2', 'Surveillance - Mesure - Analyse',              'Evaluation des performances : Surveillance, mesure, analyse'),
  ('RE2', 'NC - Réclamations',                            'NC – réclamations'),
  ('RE2', 'AC - Améliorations',                           'AC – améliorations'),

  -- RH — 6 against 8
  ('RH', 'Plans R&O / Objectifs',                         'Plans d''actions face aux Risques & Opportunités'),
  ('RH', 'Plans R&O / Objectifs',                         'Objectifs qualité'),
  ('RH', 'Ressources - RH / Compétences',                 'Ressources / RH / Responsabilités'),
  ('RH', 'Ressources - RH / Compétences',                 'Compétences'),
  ('RH', 'Sensibilisation',                               'Sensibilisation'),
  ('RH', 'Surveillance - Mesure - Analyse',               'Evaluation des performances : Surveillance, mesure, analyse'),
  ('RH', 'NC - Réclamations',                             'NC – réclamations'),
  ('RH', 'AC - Améliorations',                            'AC – améliorations')
) AS m(process_code, alias_label, step_label)
JOIN qms_process_steps s
  ON s.process_code = m.process_code::nc_dept AND s.label = m.step_label
ON CONFLICT DO NOTHING;

-- ─── 4. Resolution of the existing findings ──────────────────────────────────
--
-- 4a. A finding whose label resolves to exactly ONE workbook step is attached to
--     that criterion. Only rows still unattached are touched.
UPDATE audit_program_items i
SET process_step_id = sub.step_id
FROM (
  SELECT a.process_code, a.alias_label, min(a.step_id::text)::uuid AS step_id
  FROM qms_process_step_aliases a
  GROUP BY a.process_code, a.alias_label
  HAVING count(*) = 1
) sub
JOIN audit_programs ap ON ap.dept = sub.process_code
WHERE i.audit_program_id = ap.id
  AND i.agenda_step = sub.alias_label
  AND i.process_step_id IS NULL;

-- 4b. Clause links, for findings resolved above AND for those whose label stood
--     for two steps. In the merged case the finding genuinely assessed both
--     criteria, so it receives the union of their clauses; process_step_id stays
--     NULL because no single criterion is the right answer.
INSERT INTO audit_program_item_clauses (item_id, clause_code)
SELECT DISTINCT i.id, sc.clause_code
FROM audit_program_items i
JOIN audit_programs ap              ON ap.id = i.audit_program_id
JOIN qms_process_step_aliases a     ON a.process_code = ap.dept AND a.alias_label = i.agenda_step
JOIN qms_process_step_clauses sc    ON sc.step_id = a.step_id
-- Never give a finding a clause outside the scope its own audit was planned
-- against; the programme's scope is the ceiling.
JOIN audit_program_clauses apc      ON apc.audit_program_id = ap.id AND apc.clause_code = sc.clause_code
ON CONFLICT DO NOTHING;
