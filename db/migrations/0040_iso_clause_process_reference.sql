-- Migration 0040: canonical ISO 9001:2015 clause register and SOPAT process
-- cartography, replacing the reference data that was hardcoded in the
-- /admin/audit-programs client component.
--
-- Why this exists
-- ---------------
-- Before this migration the audit-programme module carried its reference data as
-- literal objects inside AuditProgramsClient.tsx: DEFAULT_AGENDA, DEFAULT_CRITERIA,
-- DEFAULT_REF_DOCS, DEFAULT_TIME_SLOTS, DEFAULT_INTERLOCUTEURS and DEPT_CONFIG.
-- Consequences, all of them observed:
--   * the server could not validate a submitted clause reference against anything;
--   * `audit_programs.criteria` was an unparsed string, so no query could answer
--     "which audits covered clause 8.4 this year" — the ISO-clause end of the
--     traceability chain did not exist;
--   * the agenda templates had drifted from the FOR-MI-14 workbooks they were
--     transcribed from (steps merged or dropped in all seven departments);
--   * nothing outside that one React component could reuse any of it.
--
-- Reference data vs. transactional data
-- -------------------------------------
--   iso_clauses, qms_processes, qms_process_steps, qms_process_clauses and
--   qms_process_step_clauses are REFERENCE data: one row per real-world thing,
--   reused by every audit programme. They are seeded here and are not written
--   per audit.
--
--   audit_program_clauses and audit_program_item_clauses are TRANSACTIONAL: they
--   record the clause scope a specific audit was actually planned and executed
--   against, which may legitimately differ from the process default.
--
-- The FOR-MI-14 workbooks are therefore NOT imported row by row. Their seven
-- distinct process definitions become seven reference rows; the audit instances
-- they describe remain ordinary audit_programs records.
--
-- Reversible: drop the seven tables and the one added column. No existing column
-- is altered or dropped, and the backfill only inserts into new tables.

-- ─── 1. ISO 9001:2015 clause register ────────────────────────────────────────
--
-- Clauses 4 to 10 — the requirement clauses. Clauses 1 to 3 (domaine
-- d'application, references normatives, termes et definitions) state no
-- auditable requirement and are deliberately absent.
--
-- Titles are the clause headings of the standard. No requirement text is
-- reproduced or paraphrased here: this is a numbering and naming register used
-- to key relationships, not a copy of ISO 9001.

CREATE TABLE IF NOT EXISTS iso_clauses (
  code          varchar(10) PRIMARY KEY,
  chapter       integer     NOT NULL,
  parent_code   varchar(10) REFERENCES iso_clauses(code),
  title         text        NOT NULL,
  standard      varchar(20) NOT NULL DEFAULT 'ISO9001:2015',
  -- Zero-padded so ordinary text ordering yields 4.4 < 8.2 < 8.10.
  sort_key      varchar(20) NOT NULL,
  is_auditable  boolean     NOT NULL DEFAULT true,
  created_at    timestamp   NOT NULL DEFAULT now(),
  updated_at    timestamp   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS iso_clauses_chapter_idx  ON iso_clauses(chapter);
CREATE INDEX IF NOT EXISTS iso_clauses_parent_idx   ON iso_clauses(parent_code);
CREATE INDEX IF NOT EXISTS iso_clauses_sort_key_idx ON iso_clauses(sort_key);

-- Chapters first, so the child rows can reference them.
INSERT INTO iso_clauses (code, chapter, parent_code, title, sort_key) VALUES
  ('4',  4, NULL, 'Contexte de l''organisme',                    '04'),
  ('5',  5, NULL, 'Leadership',                                  '05'),
  ('6',  6, NULL, 'Planification',                               '06'),
  ('7',  7, NULL, 'Support',                                     '07'),
  ('8',  8, NULL, 'Réalisation des activités opérationnelles',   '08'),
  ('9',  9, NULL, 'Évaluation des performances',                 '09'),
  ('10', 10, NULL, 'Amélioration',                               '10')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iso_clauses (code, chapter, parent_code, title, sort_key) VALUES
  ('4.1',  4, '4',  'Compréhension de l''organisme et de son contexte',                              '04.01'),
  ('4.2',  4, '4',  'Compréhension des besoins et attentes des parties intéressées',                 '04.02'),
  ('4.3',  4, '4',  'Détermination du domaine d''application du système de management de la qualité','04.03'),
  ('4.4',  4, '4',  'Système de management de la qualité et ses processus',                          '04.04'),

  ('5.1',  5, '5',  'Leadership et engagement',                                                      '05.01'),
  ('5.2',  5, '5',  'Politique',                                                                     '05.02'),
  ('5.3',  5, '5',  'Rôles, responsabilités et autorités au sein de l''organisme',                   '05.03'),

  ('6.1',  6, '6',  'Actions à mettre en œuvre face aux risques et opportunités',                    '06.01'),
  ('6.2',  6, '6',  'Objectifs qualité et planification des actions pour les atteindre',             '06.02'),
  ('6.3',  6, '6',  'Planification des modifications',                                               '06.03'),

  ('7.1',  7, '7',  'Ressources',                                                                    '07.01'),
  ('7.2',  7, '7',  'Compétences',                                                                   '07.02'),
  ('7.3',  7, '7',  'Sensibilisation',                                                               '07.03'),
  ('7.4',  7, '7',  'Communication',                                                                 '07.04'),
  ('7.5',  7, '7',  'Informations documentées',                                                      '07.05'),

  ('8.1',  8, '8',  'Planification et maîtrise opérationnelles',                                     '08.01'),
  ('8.2',  8, '8',  'Exigences relatives aux produits et services',                                  '08.02'),
  ('8.3',  8, '8',  'Conception et développement de produits et services',                           '08.03'),
  ('8.4',  8, '8',  'Maîtrise des processus, produits et services fournis par des prestataires externes', '08.04'),
  ('8.5',  8, '8',  'Production et prestation de service',                                           '08.05'),
  ('8.6',  8, '8',  'Libération des produits et services',                                           '08.06'),
  ('8.7',  8, '8',  'Maîtrise des éléments de sortie non conformes',                                 '08.07'),

  ('9.1',  9, '9',  'Surveillance, mesure, analyse et évaluation',                                   '09.01'),
  ('9.2',  9, '9',  'Audit interne',                                                                 '09.02'),
  ('9.3',  9, '9',  'Revue de direction',                                                            '09.03'),

  ('10.1', 10, '10', 'Généralités',                                                                  '10.01'),
  ('10.2', 10, '10', 'Non-conformité et action corrective',                                          '10.02'),
  ('10.3', 10, '10', 'Amélioration continue',                                                        '10.03')
ON CONFLICT (code) DO NOTHING;

-- Third level. Present so a finding can be attached at the granularity the
-- auditor actually worked at; the FOR-MI-14 workbooks only ever reference the
-- second level, so nothing below is required by the seeded mappings.
INSERT INTO iso_clauses (code, chapter, parent_code, title, sort_key) VALUES
  ('4.4.1', 4, '4.4', 'Processus du système de management de la qualité',            '04.04.01'),
  ('4.4.2', 4, '4.4', 'Informations documentées relatives aux processus',            '04.04.02'),

  ('5.1.1', 5, '5.1', 'Généralités',                                                 '05.01.01'),
  ('5.1.2', 5, '5.1', 'Orientation client',                                          '05.01.02'),
  ('5.2.1', 5, '5.2', 'Établissement de la politique qualité',                       '05.02.01'),
  ('5.2.2', 5, '5.2', 'Communication de la politique qualité',                       '05.02.02'),

  ('7.1.1', 7, '7.1', 'Généralités',                                                 '07.01.01'),
  ('7.1.2', 7, '7.1', 'Ressources humaines',                                         '07.01.02'),
  ('7.1.3', 7, '7.1', 'Infrastructure',                                              '07.01.03'),
  ('7.1.4', 7, '7.1', 'Environnement pour la mise en œuvre des processus',           '07.01.04'),
  ('7.1.5', 7, '7.1', 'Ressources pour la surveillance et la mesure',                '07.01.05'),
  ('7.1.6', 7, '7.1', 'Connaissances organisationnelles',                            '07.01.06'),
  ('7.5.1', 7, '7.5', 'Généralités',                                                 '07.05.01'),
  ('7.5.2', 7, '7.5', 'Création et mise à jour des informations documentées',        '07.05.02'),
  ('7.5.3', 7, '7.5', 'Maîtrise des informations documentées',                       '07.05.03'),

  ('8.2.1', 8, '8.2', 'Communication avec les clients',                              '08.02.01'),
  ('8.2.2', 8, '8.2', 'Détermination des exigences relatives aux produits et services', '08.02.02'),
  ('8.2.3', 8, '8.2', 'Revue des exigences relatives aux produits et services',      '08.02.03'),
  ('8.2.4', 8, '8.2', 'Modifications des exigences relatives aux produits et services', '08.02.04'),
  ('8.3.1', 8, '8.3', 'Généralités',                                                 '08.03.01'),
  ('8.3.2', 8, '8.3', 'Planification de la conception et du développement',          '08.03.02'),
  ('8.3.3', 8, '8.3', 'Éléments d''entrée de la conception et du développement',     '08.03.03'),
  ('8.3.4', 8, '8.3', 'Maîtrise de la conception et du développement',               '08.03.04'),
  ('8.3.5', 8, '8.3', 'Éléments de sortie de la conception et du développement',     '08.03.05'),
  ('8.3.6', 8, '8.3', 'Modifications de la conception et du développement',          '08.03.06'),
  ('8.4.1', 8, '8.4', 'Généralités',                                                 '08.04.01'),
  ('8.4.2', 8, '8.4', 'Type et étendue de la maîtrise',                              '08.04.02'),
  ('8.4.3', 8, '8.4', 'Informations à l''attention des prestataires externes',       '08.04.03'),
  ('8.5.1', 8, '8.5', 'Maîtrise de la production et de la prestation de service',    '08.05.01'),
  ('8.5.2', 8, '8.5', 'Identification et traçabilité',                               '08.05.02'),
  ('8.5.3', 8, '8.5', 'Propriété des clients ou des prestataires externes',          '08.05.03'),
  ('8.5.4', 8, '8.5', 'Préservation',                                                '08.05.04'),
  ('8.5.5', 8, '8.5', 'Activités après livraison',                                   '08.05.05'),
  ('8.5.6', 8, '8.5', 'Maîtrise des modifications',                                  '08.05.06'),
  ('8.7.1', 8, '8.7', 'Traitement des éléments de sortie non conformes',             '08.07.01'),
  ('8.7.2', 8, '8.7', 'Informations documentées relatives aux non-conformités',      '08.07.02'),

  ('9.1.1', 9, '9.1', 'Généralités',                                                 '09.01.01'),
  ('9.1.2', 9, '9.1', 'Satisfaction du client',                                      '09.01.02'),
  ('9.1.3', 9, '9.1', 'Analyse et évaluation',                                       '09.01.03'),
  ('9.2.1', 9, '9.2', 'Exigences relatives à l''audit interne',                      '09.02.01'),
  ('9.2.2', 9, '9.2', 'Programme d''audit interne',                                  '09.02.02'),
  ('9.3.1', 9, '9.3', 'Généralités',                                                 '09.03.01'),
  ('9.3.2', 9, '9.3', 'Éléments d''entrée de la revue de direction',                 '09.03.02'),
  ('9.3.3', 9, '9.3', 'Éléments de sortie de la revue de direction',                 '09.03.03'),

  ('10.2.1', 10, '10.2', 'Réaction à la non-conformité et action corrective',        '10.02.01'),
  ('10.2.2', 10, '10.2', 'Informations documentées relatives aux non-conformités',   '10.02.02')
ON CONFLICT (code) DO NOTHING;

-- ─── 2. SOPAT process cartography ────────────────────────────────────────────
--
-- The seven processes SOPAT audits, transcribed from the FOR-MI-14 workbooks
-- (version 2) issued for the 2025 internal audit cycle.
--
-- `code` is typed nc_dept rather than varchar on purpose: that enum is already
-- the canonical process identifier throughout the application
-- (non_conformances.dept, audit_programs.dept), and reusing it makes a real
-- foreign key possible instead of a second, parallel list of process codes.

CREATE TABLE IF NOT EXISTS qms_processes (
  code                   nc_dept     PRIMARY KEY,
  name                   text        NOT NULL,  -- as written in FOR-MI-14
  short_label            varchar(60) NOT NULL,  -- for chips and filters
  procedure_codes        text        NOT NULL,  -- "Document(s) de référence"
  default_interlocuteurs text        NOT NULL DEFAULT 'Pilote processus & Collaborateurs',
  default_start_time     varchar(10),
  default_end_time       varchar(10),
  color                  varchar(9),
  sort_order             integer     NOT NULL DEFAULT 0,
  is_active              boolean     NOT NULL DEFAULT true,
  created_at             timestamp   NOT NULL DEFAULT now(),
  updated_at             timestamp   NOT NULL DEFAULT now()
);

INSERT INTO qms_processes
  (code, name, short_label, procedure_codes, default_interlocuteurs,
   default_start_time, default_end_time, color, sort_order) VALUES
  ('MI',  'Processus Management Qualité et Environnement', 'Management Qualité',
          'PRS-MI-01 & PRS-MI-02 & documents associés', 'DG / RMQ',
          '08H30', '11H00', '#1C7A48', 1),
  ('CO',  'Processus Commercial', 'Commercial',
          'PRS-CO-01 & documents associés', 'Pilote processus & Collaborateurs',
          '09H00', '11H00', '#0D9488', 2),
  ('ET',  'Processus Etude', 'Études',
          'PRS-ET-01 & documents associés', 'Pilote processus & Collaborateurs',
          '13H00', '15H30', '#2563EB', 3),
  ('AC',  'Processus Achat', 'Achats',
          'PRS-AC-01 & documents associés', 'Pilote processus & Collaborateurs',
          '11H00', '12H30', '#7C3AED', 4),
  ('RE1', 'Processus Réalisation', 'Réalisation',
          'PRS-RE-01 & documents associés', 'Pilote processus & Collaborateurs',
          '13H00', '16H00', '#B8870A', 5),
  ('RE2', 'Processus Entretien', 'Entretien',
          'PRS-RE-02 & documents associés', 'Pilote processus & Collaborateurs',
          '13H00', '16H00', '#EA6A0A', 6),
  ('RH',  'Processus Gestion Des Ressources Humaines', 'Ressources Humaines',
          'PRS-RH-01 & documents associés', 'Pilote processus & Collaborateurs',
          '11H00', '12H30', '#DC2626', 7)
ON CONFLICT (code) DO NOTHING;

-- ─── 3. Clauses each process is audited against ──────────────────────────────
--
-- Taken verbatim from the "Référentiel ISO 9001" column of each workbook. The
-- ET workbook writes that column as "4.4; 6.1; 6,2 7.1;7.2;7.5; …" — a decimal
-- comma and a missing separator. Normalised to 6.2 and 7.1 here; storing clause
-- codes as rows is what makes that class of typo impossible from now on.

CREATE TABLE IF NOT EXISTS qms_process_clauses (
  process_code nc_dept     NOT NULL REFERENCES qms_processes(code) ON DELETE CASCADE,
  clause_code  varchar(10) NOT NULL REFERENCES iso_clauses(code),
  PRIMARY KEY (process_code, clause_code)
);

CREATE INDEX IF NOT EXISTS qms_process_clauses_clause_idx ON qms_process_clauses(clause_code);

INSERT INTO qms_process_clauses (process_code, clause_code) VALUES
  -- MI — 4.1; 4.2; 4.3; 4.4; 5.1; 5.2; 5.3; 6.1; 6.2; 7.1; 7.4; 7.5; 9.1; 9.3; 10.1; 10.2; 10.3
  ('MI','4.1'),('MI','4.2'),('MI','4.3'),('MI','4.4'),('MI','5.1'),('MI','5.2'),('MI','5.3'),
  ('MI','6.1'),('MI','6.2'),('MI','7.1'),('MI','7.4'),('MI','7.5'),('MI','9.1'),('MI','9.3'),
  ('MI','10.1'),('MI','10.2'),('MI','10.3'),
  -- CO — 4.4; 6.1; 6.2; 7.5; 8.2; 9.1; 10.2; 10.3
  ('CO','4.4'),('CO','6.1'),('CO','6.2'),('CO','7.5'),('CO','8.2'),('CO','9.1'),
  ('CO','10.2'),('CO','10.3'),
  -- ET — 4.4; 6.1; 6.2; 7.1; 7.2; 7.5; 8.1; 8.2; 8.3; 9.1; 9.2; 10.1; 10.2; 10.3
  ('ET','4.4'),('ET','6.1'),('ET','6.2'),('ET','7.1'),('ET','7.2'),('ET','7.5'),('ET','8.1'),
  ('ET','8.2'),('ET','8.3'),('ET','9.1'),('ET','9.2'),('ET','10.1'),('ET','10.2'),('ET','10.3'),
  -- AC — 4.4; 6.1; 6.2; 7.5; 8.4; 8.6; 8.7; 9.1; 10.2; 10.3
  ('AC','4.4'),('AC','6.1'),('AC','6.2'),('AC','7.5'),('AC','8.4'),('AC','8.6'),('AC','8.7'),
  ('AC','9.1'),('AC','10.2'),('AC','10.3'),
  -- RE1 — 4.4; 6.1; 6.2; 7.5; 8.1; 8.5; 8.6; 8.7; 9.1; 10.2; 10.3
  ('RE1','4.4'),('RE1','6.1'),('RE1','6.2'),('RE1','7.5'),('RE1','8.1'),('RE1','8.5'),
  ('RE1','8.6'),('RE1','8.7'),('RE1','9.1'),('RE1','10.2'),('RE1','10.3'),
  -- RE2 — 4.4; 6.1; 6.2; 7.5; 8.1; 8.5; 8.6; 8.7; 9.1; 10.2; 10.3
  ('RE2','4.4'),('RE2','6.1'),('RE2','6.2'),('RE2','7.5'),('RE2','8.1'),('RE2','8.5'),
  ('RE2','8.6'),('RE2','8.7'),('RE2','9.1'),('RE2','10.2'),('RE2','10.3'),
  -- RH — 4.4; 5.3; 6.1; 6.2; 7.2; 7.3; 7.5; 9.1; 10.2; 10.3
  ('RH','4.4'),('RH','5.3'),('RH','6.1'),('RH','6.2'),('RH','7.2'),('RH','7.3'),('RH','7.5'),
  ('RH','9.1'),('RH','10.2'),('RH','10.3')
ON CONFLICT DO NOTHING;

-- ─── 4. Reusable audit agenda — "Étapes du processus" ────────────────────────
--
-- One row per step of each FOR-MI-14 workbook, in workbook order and with the
-- workbook's own wording. These are the reusable audit criteria: a new audit
-- programme copies them into its own items rather than the auditor retyping
-- them, and no ISO requirement is duplicated per programme.
--
-- The previous hardcoded DEFAULT_AGENDA had merged or dropped steps in every
-- department (AC 6 steps against 7 in the workbook, CO 7 against 9, ET 6 against
-- 8, RE1 6 against 7, RE2 8 against 10, RH 6 against 8). The workbook is the
-- controlled document, so the workbook wins.
--
-- The MI workbook lists "Revue de direction" twice (rows 15 and 18). That is a
-- transcription slip in the source file, not two distinct steps; it is seeded
-- once and the unique constraint below keeps it that way.

CREATE TABLE IF NOT EXISTS qms_process_steps (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  process_code           nc_dept     NOT NULL REFERENCES qms_processes(code) ON DELETE CASCADE,
  label                  text        NOT NULL,
  sort_order             integer     NOT NULL DEFAULT 0,
  default_interlocuteurs text,
  is_active              boolean     NOT NULL DEFAULT true,
  created_at             timestamp   NOT NULL DEFAULT now(),
  updated_at             timestamp   NOT NULL DEFAULT now()
);

-- A unique INDEX rather than a table constraint, because that is what
-- drizzle-kit renders for uniqueIndex() in db/schema.ts. Declaring it as a
-- constraint here would make `npm run db:generate` report drift on a database
-- built from these migrations.
CREATE UNIQUE INDEX IF NOT EXISTS qms_process_steps_unique ON qms_process_steps(process_code, label);
CREATE INDEX IF NOT EXISTS qms_process_steps_process_idx ON qms_process_steps(process_code, sort_order);

INSERT INTO qms_process_steps (process_code, label, sort_order) VALUES
  -- MI (workbook FOR MI 14 Programme d'audit MI 30052025)
  ('MI', 'Contexte : enjeux, parties intéressées',                                          1),
  ('MI', 'Plan d''action face aux risques & opportunités',                                  2),
  ('MI', 'Politique et objectifs qualité / planification de l''atteinte des objectifs',     3),
  ('MI', 'Responsabilité – autorités',                                                      4),
  ('MI', 'Satisfaction client',                                                             5),
  ('MI', 'NC – Actions Correctives',                                                        6),
  ('MI', 'Audit Interne',                                                                   7),
  ('MI', 'Revue de direction',                                                              8),
  ('MI', 'Communication',                                                                   9),
  ('MI', 'Gestion des connaissances',                                                      10),
  ('MI', 'Améliorations',                                                                  11),

  -- CO (FOR MI 14 Programme d'audit CO 29052025)
  ('CO', 'Plans d''actions face aux Risques & Opportunités',                                1),
  ('CO', 'Objectifs qualité',                                                               2),
  ('CO', 'Ressources / RH / Responsabilités',                                               3),
  ('CO', 'Compétences',                                                                     4),
  ('CO', 'Revue des offres / des contrats',                                                 5),
  ('CO', 'Communication avec les clients',                                                  6),
  ('CO', 'Evaluation des performances : Surveillance, mesure, analyse',                     7),
  ('CO', 'NC – réclamations',                                                               8),
  ('CO', 'AC – améliorations',                                                              9),

  -- ET (FOR MI 14 Programme d'audit ET 19102023)
  ('ET', 'Plans d''actions face aux Risques & Opportunités',                                1),
  ('ET', 'Objectifs qualité',                                                               2),
  ('ET', 'Ressources / RH / Responsabilités',                                               3),
  ('ET', 'Compétences',                                                                     4),
  ('ET', 'Etudes',                                                                          5),
  ('ET', 'Evaluation des performances : Surveillance, mesure, analyse',                     6),
  ('ET', 'NC – réclamations',                                                               7),
  ('ET', 'AC – améliorations',                                                              8),

  -- AC (FOR MI 14 Programme d'audit AC 29052025)
  ('AC', 'Plans d''actions face aux Risques & Opportunités',                                1),
  ('AC', 'Objectifs qualité',                                                               2),
  ('AC', 'Ressources / RH / Responsabilités',                                               3),
  ('AC', 'Produits & services fournis par des prestataires externes',                       4),
  ('AC', 'Evaluation des performances : Surveillance, mesure, analyse',                     5),
  ('AC', 'NC – réclamations',                                                               6),
  ('AC', 'AC – améliorations',                                                              7),

  -- RE1 (FOR MI 14 Programme d'audit RE1 29052025)
  ('RE1', 'Plans d''actions face aux Risques & Opportunités',                               1),
  ('RE1', 'Objectifs qualité',                                                              2),
  ('RE1', 'Ressources / RH / Responsabilités',                                              3),
  ('RE1', 'Planification & réalisation',                                                    4),
  ('RE1', 'Evaluation des performances : Surveillance, mesure, analyse',                    5),
  ('RE1', 'NC – réclamations',                                                              6),
  ('RE1', 'AC – améliorations',                                                             7),

  -- RE2 (FOR MI 14 Programme d'audit RE2 29052025)
  ('RE2', 'Plans d''actions face aux Risques & Opportunités',                               1),
  ('RE2', 'Objectifs qualité',                                                              2),
  ('RE2', 'Ressources / RH / Responsabilités',                                              3),
  ('RE2', 'Compétences',                                                                    4),
  ('RE2', 'Infrastructures',                                                                5),
  ('RE2', 'Planification',                                                                  6),
  ('RE2', 'Réalisation (Travaux d''entretien)',                                             7),
  ('RE2', 'Evaluation des performances : Surveillance, mesure, analyse',                    8),
  ('RE2', 'NC – réclamations',                                                              9),
  ('RE2', 'AC – améliorations',                                                            10),

  -- RH (FOR MI 14 Programme d'audit RH 30052025)
  ('RH', 'Plans d''actions face aux Risques & Opportunités',                                1),
  ('RH', 'Objectifs qualité',                                                               2),
  ('RH', 'Ressources / RH / Responsabilités',                                               3),
  ('RH', 'Compétences',                                                                     4),
  ('RH', 'Sensibilisation',                                                                 5),
  ('RH', 'Evaluation des performances : Surveillance, mesure, analyse',                     6),
  ('RH', 'NC – réclamations',                                                               7),
  ('RH', 'AC – améliorations',                                                              8)
ON CONFLICT (process_code, label) DO NOTHING;

-- ─── 5. Default clause mapping per agenda step ───────────────────────────────
--
-- IMPORTANT — provenance. The FOR-MI-14 workbooks assign clauses at the PROCESS
-- level, not per step; the step-level mapping below is SOPAT's, not ISO's, and
-- not the workbook's. It exists so a finding starts out attached to the clauses
-- it plainly concerns instead of to nothing, which is what happened before:
-- audit_program_items.clause_ref was never populated by any code path, so the
-- ISO end of the traceability chain was empty for every finding ever recorded.
--
-- Two safeguards keep this from inventing requirements:
--   * every pair is matched on the step's exact label, so nothing is inferred
--     from wording that merely resembles a step;
--   * the join to qms_process_clauses intersects the mapping with the clause set
--     the workbook already assigns to that process, so a step can never acquire
--     a clause its own process is not audited against.
-- These are defaults for a newly created programme. The auditor can change the
-- clauses on any finding, and that choice is stored per finding, not here.

CREATE TABLE IF NOT EXISTS qms_process_step_clauses (
  step_id     uuid        NOT NULL REFERENCES qms_process_steps(id) ON DELETE CASCADE,
  clause_code varchar(10) NOT NULL REFERENCES iso_clauses(code),
  PRIMARY KEY (step_id, clause_code)
);

CREATE INDEX IF NOT EXISTS qms_process_step_clauses_clause_idx ON qms_process_step_clauses(clause_code);

INSERT INTO qms_process_step_clauses (step_id, clause_code)
SELECT s.id, m.clause_code
FROM qms_process_steps s
JOIN (VALUES
    ('Contexte : enjeux, parties intéressées',                                       '4.1'),
    ('Contexte : enjeux, parties intéressées',                                       '4.2'),
    ('Contexte : enjeux, parties intéressées',                                       '4.3'),
    ('Plan d''action face aux risques & opportunités',                               '6.1'),
    ('Plans d''actions face aux Risques & Opportunités',                             '6.1'),
    ('Objectifs qualité',                                                            '6.2'),
    ('Politique et objectifs qualité / planification de l''atteinte des objectifs',  '5.2'),
    ('Politique et objectifs qualité / planification de l''atteinte des objectifs',  '6.2'),
    ('Responsabilité – autorités',                                                   '5.1'),
    ('Responsabilité – autorités',                                                   '5.3'),
    ('Ressources / RH / Responsabilités',                                            '5.3'),
    ('Ressources / RH / Responsabilités',                                            '7.1'),
    ('Compétences',                                                                  '7.2'),
    ('Sensibilisation',                                                              '7.3'),
    ('Communication',                                                                '7.4'),
    ('Communication avec les clients',                                               '8.2'),
    ('Gestion des connaissances',                                                    '7.1'),
    ('Infrastructures',                                                              '7.1'),
    ('Satisfaction client',                                                          '9.1'),
    ('Evaluation des performances : Surveillance, mesure, analyse',                  '9.1'),
    ('Audit Interne',                                                                '9.2'),
    ('Revue de direction',                                                           '9.3'),
    ('Revue des offres / des contrats',                                              '8.2'),
    ('Etudes',                                                                       '8.3'),
    ('Produits & services fournis par des prestataires externes',                    '8.4'),
    ('Produits & services fournis par des prestataires externes',                    '8.6'),
    ('Produits & services fournis par des prestataires externes',                    '8.7'),
    ('Planification & réalisation',                                                  '8.1'),
    ('Planification & réalisation',                                                  '8.5'),
    ('Planification & réalisation',                                                  '8.6'),
    ('Planification',                                                                '8.1'),
    ('Réalisation (Travaux d''entretien)',                                           '8.5'),
    ('Réalisation (Travaux d''entretien)',                                           '8.6'),
    ('NC – Actions Correctives',                                                     '8.7'),
    ('NC – Actions Correctives',                                                    '10.2'),
    ('NC – réclamations',                                                            '8.7'),
    ('NC – réclamations',                                                           '10.2'),
    ('AC – améliorations',                                                          '10.2'),
    ('AC – améliorations',                                                          '10.3'),
    ('Améliorations',                                                               '10.1'),
    ('Améliorations',                                                               '10.3')
  ) AS m(label, clause_code) ON m.label = s.label
-- Intersection guard: the step's process must already be audited against the clause.
JOIN qms_process_clauses pc
  ON pc.process_code = s.process_code AND pc.clause_code = m.clause_code
ON CONFLICT DO NOTHING;

-- ─── 6. Clause scope of an actual audit programme ────────────────────────────
--
-- Transactional, not reference: an auditor may narrow or widen the scope of one
-- audit relative to the process default, and the record must show what was in
-- scope for THAT audit.
--
-- audit_programs.criteria (free text, e.g. "4.4; 6.1; 8.4") is kept and becomes a
-- server-maintained rendering of these rows, written only by setAuditProgramClauses
-- in src/lib/db/iso.ts. It is a cache with a single writer, not a second source of
-- truth: existing DMS exports, the NC register's reference_doc and the audit card
-- all read that string and keep working unchanged.

CREATE TABLE IF NOT EXISTS audit_program_clauses (
  audit_program_id uuid        NOT NULL REFERENCES audit_programs(id) ON DELETE CASCADE,
  clause_code      varchar(10) NOT NULL REFERENCES iso_clauses(code),
  PRIMARY KEY (audit_program_id, clause_code)
);

CREATE INDEX IF NOT EXISTS audit_program_clauses_clause_idx ON audit_program_clauses(clause_code);

-- ─── 7. Clause scope of an individual finding ────────────────────────────────
--
-- The link that was missing entirely. With it the chain
--   iso_clauses → qms_process_clauses → audit_program_clauses
--              → audit_program_item_clauses → audit_program_items (evidence,
--                conformity) → non_conformances → corrective_actions
-- is navigable in both directions, so "every finding raised against 8.4 in 2025,
-- and whether its corrective action was verified" becomes a query.
--
-- No ON DELETE CASCADE reliance for correctness: upsertAuditProgramItems no
-- longer deletes and reinserts the item set (see the same migration's note in
-- src/lib/db/iso.ts), so an item keeps its id, its clauses and its NC across saves.

CREATE TABLE IF NOT EXISTS audit_program_item_clauses (
  item_id     uuid        NOT NULL REFERENCES audit_program_items(id) ON DELETE CASCADE,
  clause_code varchar(10) NOT NULL REFERENCES iso_clauses(code),
  PRIMARY KEY (item_id, clause_code)
);

CREATE INDEX IF NOT EXISTS audit_program_item_clauses_clause_idx ON audit_program_item_clauses(clause_code);

-- Which reusable criterion this finding was copied from, when it came from the
-- template rather than being added ad hoc by the auditor. ON DELETE SET NULL:
-- retiring a template step must never destroy an executed audit record.
ALTER TABLE audit_program_items
  ADD COLUMN IF NOT EXISTS process_step_id uuid REFERENCES qms_process_steps(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS audit_program_items_step_idx ON audit_program_items(process_step_id);

-- ─── 8. Referential integrity for the process code ───────────────────────────
--
-- Safe because qms_processes is seeded above with every value of the nc_dept
-- enum, so no existing audit_programs row can fail the constraint.

DO $$ BEGIN
  ALTER TABLE audit_programs
    ADD CONSTRAINT audit_programs_dept_fk
    FOREIGN KEY (dept) REFERENCES qms_processes(code);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 9. Backfill of existing records ─────────────────────────────────────────
--
-- Only new tables are written. Nothing already recorded is modified, with the
-- single exception of audit_program_items.process_step_id, which was NULL for
-- every row until this migration created the column.

-- 9a. Clause scope of existing programmes, parsed from the free-text criteria.
--     Commas are normalised to periods first so a decimal comma inherited from
--     the workbooks ("6,2") reads as 6.2 rather than as the two clauses 6 and 2.
--     Tokens that match no clause in the register are left out of the join; the
--     original criteria string is untouched, so nothing is discarded.
INSERT INTO audit_program_clauses (audit_program_id, clause_code)
SELECT ap.id, c.code
FROM audit_programs ap
CROSS JOIN LATERAL regexp_matches(replace(ap.criteria, ',', '.'), '[0-9]+(?:\.[0-9]+)*', 'g') AS m(tok)
JOIN iso_clauses c ON c.code = m.tok[1]
WHERE ap.criteria IS NOT NULL AND btrim(ap.criteria) <> ''
ON CONFLICT DO NOTHING;

-- 9b. Point existing findings at the reusable criterion they correspond to,
--     matching on the exact step label.
--
--     Programmes created through the previous UI carry that UI's merged labels
--     ("Plans R&O / Objectifs" stood for two workbook steps), which match no
--     single template step and are deliberately left unlinked: choosing one of
--     the two merged steps would be a guess recorded as an audit fact. Those
--     findings keep their text exactly as the auditor recorded it and can be
--     linked by hand if anyone wants to.
UPDATE audit_program_items i
SET process_step_id = s.id
FROM audit_programs ap
JOIN qms_process_steps s ON s.process_code = ap.dept
WHERE i.audit_program_id = ap.id
  AND s.label = i.agenda_step
  AND i.process_step_id IS NULL;

-- 9c. Give those findings the default clauses of the criterion they matched.
INSERT INTO audit_program_item_clauses (item_id, clause_code)
SELECT i.id, sc.clause_code
FROM audit_program_items i
JOIN qms_process_step_clauses sc ON sc.step_id = i.process_step_id
WHERE i.process_step_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 9d. Anything an auditor had typed into the legacy free-text clause_ref column
--     is preserved as real clause links where it parses.
INSERT INTO audit_program_item_clauses (item_id, clause_code)
SELECT i.id, c.code
FROM audit_program_items i
CROSS JOIN LATERAL regexp_matches(replace(i.clause_ref, ',', '.'), '[0-9]+(?:\.[0-9]+)*', 'g') AS m(tok)
JOIN iso_clauses c ON c.code = m.tok[1]
WHERE i.clause_ref IS NOT NULL AND btrim(i.clause_ref) <> ''
ON CONFLICT DO NOTHING;

-- ─── 10. Auditor identity on a programme ─────────────────────────────────────
--
-- audit_programs recorded the auditor as free text only, so nothing connected an
-- audit to the register of qualified internal auditors (LIS-MI-05,
-- users.is_internal_auditor) and no check on clause 9.2.2 c) — objectivity and
-- impartiality in the selection of auditors — was possible.
--
-- `auditor_name` is kept and stays authoritative for the record. The 2025 cycle
-- was conducted by an external auditor with no user account, and rewriting those
-- rows to point at nobody would lose information that is currently correct.
-- auditor_id is the optional link for internal auditors from here on.
ALTER TABLE audit_programs
  ADD COLUMN IF NOT EXISTS auditor_id uuid REFERENCES users(id);

CREATE INDEX IF NOT EXISTS audit_programs_auditor_idx ON audit_programs(auditor_id);
