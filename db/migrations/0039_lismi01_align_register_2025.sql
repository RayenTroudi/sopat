-- Migration 0039 : aligner LIS-MI-01 sur la revision 2025 du registre source.
--
-- -- Ce qui restait faux apres la 0038 ---------------------------------------
-- La 0038 a sorti du registre les 485 enregistrements ERP que `attachDmsCode()`
-- y inscrivait. Restaient 229 lignes - alors que le classeur source
-- « LIS MI 01 Liste des informations documentees internes.xlsx » en compte 148.
--
-- -- Cause --------------------------------------------------------------------
-- Le classeur contient SEIZE feuilles : une par revision du registre, de
-- 23-10-2020 a 2025. Seule la derniere (« 2025 », mise a jour des 19 et
-- 20/06/2025) est en vigueur. Les imports successifs ont verse en base des
-- codes provenant de revisions anterieures, en particulier toute la generation
-- « MQ » (Management Qualite) que la refonte 2024 a renommee en « MI »
-- (Management Integre) : FOR-MQ-01 et FOR-MI-01 designent le meme « Rapport de
-- revue documentaire », l'un perime, l'autre en vigueur.
--
-- `dms_documents.document_number` etant UNIQUE, les deux ont coexiste et le
-- registre affichait les deux generations empilees.
--
-- -- Ecart mesure ---------------------------------------------------------------
--   229 en base
--  -148 lignes de la feuille 2025  (146 codes distincts + 2 variantes « VA »,
--                                   FOR-RH-02 et ORG-MI-02 y figurant deux fois)
--  ----
--    81 a retirer :
--       69 codes presents uniquement dans des revisions ANTERIEURES du classeur
--       12 codes ne figurant dans AUCUNE revision :
--            5 fixtures SOPAT-LEGACY-* (donnees de demonstration)
--            FOR-MI-11, LIS-MI-05, PLA-MI-16, PLA-MI-17  (doublons de codes en
--              vigueur : LIS-MI-08, FOR-MI-16, FOR-MI-17...)
--            PRC-MI-02, PRC-MI-03, PRC-MI-04  (procedures fusionnees dans
--              PRC-MI-06 et PRC-MI-09)
--
-- -- Consequence sur les rattachements ------------------------------------------
-- PRC-MI-04 portait les liens 'instance' des actions correctives. Elle est
-- retiree : ces liens sont transferes vers PRC-MI-06, qui couvre desormais le
-- traitement des NC et des actions correctives. `CONTROLLED_DOCUMENT_BY_ENTITY`
-- (src/lib/dms/attach.ts) est modifie en consequence.
--
-- -- Ce que la migration NE fait pas -------------------------------------------
-- Aucune suppression physique : `deleted_at` est renseigne et chaque retrait est
-- journalise dans dms_audit_log. Un document retire reste consultable et
-- restaurable - ISO 9001 §7.5.3, les revisions perimees font partie de
-- l'historique documentaire et ne s'effacent pas.

BEGIN;

-- -- 1. Le registre en vigueur, tel qu'il figure dans la feuille « 2025 » ------
-- Liste extraite du classeur, pas deduite : c'est LA source de verite.
CREATE TEMP TABLE _register_2025 (code text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO _register_2025 (code) VALUES
  ('FOR-AC-01'), ('FOR-AC-03'), ('FOR-AC-05'), ('FOR-AC-06'),
  ('FOR-AC-10'), ('FOR-AC-11'), ('FOR-CO-01'), ('FOR-CO-02'),
  ('FOR-CO-03'), ('FOR-ET-01'), ('FOR-ET-02'), ('FOR-ET-03'),
  ('FOR-ET-04'), ('FOR-ET-05'), ('FOR-ET-06'), ('FOR-ET-07'),
  ('FOR-MI-01'), ('FOR-MI-02'), ('FOR-MI-04'), ('FOR-MI-05'),
  ('FOR-MI-07'), ('FOR-MI-08'), ('FOR-MI-09'), ('FOR-MI-10'),
  ('FOR-MI-12'), ('FOR-MI-13'), ('FOR-MI-14'), ('FOR-MI-15'),
  ('FOR-MI-16'), ('FOR-MI-17'), ('FOR-RE-03'), ('FOR-RE-04'),
  ('FOR-RE-05'), ('FOR-RE-07'), ('FOR-RE-08'), ('FOR-RE-09'),
  ('FOR-RE-10'), ('FOR-RE-11'), ('FOR-RE-12'), ('FOR-RE-13'),
  ('FOR-RE-14'), ('FOR-RE-15'), ('FOR-RH-01'), ('FOR-RH-02'),
  ('FOR-RH-02-VA'), ('FOR-RH-03'), ('FOR-RH-04'), ('FOR-RH-05'),
  ('FOR-RH-06'), ('FOR-RH-07'), ('FOR-RH-08'), ('FOR-RH-13'),
  ('FOR-RH-14'), ('FOR-RH-15'), ('FOR-RH-28'), ('FOR-RH-34'),
  ('FOR-RH-41'), ('FOR-RH-43'), ('FOR-RH-44'), ('INS-ET-01'),
  ('INS-MI-01'), ('INS-MI-02'), ('INS-MI-03'), ('INS-MI-04'),
  ('INS-MI-05'), ('INS-MI-06'), ('INS-MI-07'), ('INS-MI-08'),
  ('INS-MI-09'), ('INS-MI-10'), ('INS-MI-11'), ('INS-MI-12'),
  ('INS-MI-13'), ('INS-MI-15'), ('INS-MI-16'), ('INS-MI-17'),
  ('INS-MI-18'), ('INS-MI-19'), ('INS-MI-21'), ('INS-RE-01'),
  ('LIS-CO-01'), ('LIS-ET-02'), ('LIS-ET-03'), ('LIS-MI-01'),
  ('LIS-MI-02'), ('LIS-MI-03'), ('LIS-MI-04'), ('LIS-MI-07'),
  ('LIS-MI-08'), ('LIS-MI-09'), ('LIS-MI-10'), ('LIS-RE-02'),
  ('LIS-RH-01'), ('LIS-RH-02'), ('ORG-CO-01'), ('ORG-CO-02'),
  ('ORG-MI-01'), ('ORG-MI-02'), ('ORG-MI-02-VA'), ('ORG-MI-03'),
  ('ORG-MI-04'), ('ORG-MI-05'), ('ORG-MI-06'), ('ORG-MI-07'),
  ('ORG-MI-08'), ('ORG-MI-09'), ('ORG-MI-10'), ('ORG-RH-01'),
  ('ORG-RH-02'), ('ORG-RH-03'), ('ORG-RH-04'), ('PLA-MI-01'),
  ('PLA-MI-02'), ('PLA-MI-03'), ('PLA-MI-04'), ('PLA-MI-05'),
  ('PLA-RE-01'), ('PLA-RE-02'), ('PLA-RE-03'), ('PLA-RE-04'),
  ('PLA-RE-05'), ('PLA-RH-01'), ('PLA-RH-02'), ('PRC-AC-02'),
  ('PRC-MI-01'), ('PRC-MI-05'), ('PRC-MI-06'), ('PRC-MI-07'),
  ('PRC-MI-08'), ('PRC-MI-09'), ('PRC-MI-10'), ('PRC-MI-11'),
  ('PRC-MI-12'), ('PRC-MI-13'), ('PRC-RH-02'), ('PRC-RH-03'),
  ('PRC-RH-04'), ('PRC-RH-05'), ('PRC-RH-06'), ('PRC-RH-07'),
  ('PRS-AC-01'), ('PRS-CO-01'), ('PRS-ET-01'), ('PRS-MI-01'),
  ('PRS-MI-02'), ('PRS-RE-01'), ('PRS-RE-02'), ('PRS-RH-01');

-- Garde-fou : le registre doit compter exactement 148 lignes, et chacune doit
-- exister en base. Si l'une manque, l'ecart n'est pas celui qu'on croit et
-- retirer le reste effacerait des documents en vigueur.
DO $$
DECLARE n int; absents text;
BEGIN
  SELECT count(*) INTO n FROM _register_2025;
  IF n <> 148 THEN
    RAISE EXCEPTION 'Registre 2025 : % codes au lieu de 148', n;
  END IF;
  SELECT string_agg(r.code, ', ') INTO absents
  FROM _register_2025 r
  WHERE NOT EXISTS (
    SELECT 1 FROM dms_documents d WHERE d.document_number = r.code AND d.deleted_at IS NULL
  );
  IF absents IS NOT NULL THEN
    RAISE EXCEPTION 'Codes du registre 2025 absents de la base : %', absents;
  END IF;
END $$;

-- -- 2. Le lot retire, fige avant toute ecriture -------------------------------
CREATE TEMP TABLE _obsolete ON COMMIT DROP AS
SELECT d.id, d.document_number, d.title, d.status
FROM dms_documents d
WHERE d.deleted_at IS NULL
  AND d.document_number NOT IN (SELECT code FROM _register_2025);

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM _obsolete;
  RAISE NOTICE 'Documents hors registre 2025 : %', n;
  IF n <> 81 THEN
    RAISE EXCEPTION 'Attendu 81 retraits, obtenu % - la base a bouge, revoir avant application', n;
  END IF;
END $$;

-- -- 3. Transferer les rattachements portes par une definition retiree ---------
-- Les actions correctives pointaient sur PRC-MI-04 (retiree) ; elles relevent
-- desormais de PRC-MI-06. Sans ce transfert, cinquante CAPA perdraient leur
-- reference documentaire.
INSERT INTO dms_document_links (document_id, entity_type, entity_id, link_role, notes, created_by)
SELECT dst.id, l.entity_type, l.entity_id, l.link_role,
       'Transfere par la migration 0039 (ex-' || src.document_number || ')',
       l.created_by
FROM dms_document_links l
JOIN _obsolete src ON src.id = l.document_id
JOIN dms_documents dst
  ON dst.document_number = CASE src.document_number
       WHEN 'PRC-MI-04' THEN 'PRC-MI-06'
       WHEN 'PRC-MI-02' THEN 'PRC-MI-06'
       WHEN 'PRC-MI-03' THEN 'PRC-MI-09'
       ELSE NULL
     END
 AND dst.deleted_at IS NULL
WHERE l.link_role = 'instance'
ON CONFLICT DO NOTHING;

-- Les entites portent le code de la definition : il doit suivre le transfert.
UPDATE corrective_actions SET dms_document_code = 'PRC-MI-06'
WHERE dms_document_code IN ('PRC-MI-04', 'PRC-MI-02');

-- Le lien d'origine est retire une fois transfere. Le laisser accrocherait
-- cinquante actions correctives a une procedure qui n'est plus en vigueur : la
-- provenance est deja portee par la note « Transfere par la migration 0039 »
-- posee ci-dessus et par l'evenement dms_audit_log du retrait.
DELETE FROM dms_document_links l
USING _obsolete src
WHERE l.document_id = src.id
  AND l.link_role = 'instance';

-- -- 4. Journaliser, puis retirer ----------------------------------------------
INSERT INTO dms_audit_log (document_id, event, actor_id, actor_role_snapshot, previous_state, new_state, metadata)
SELECT o.id,
       'soft_deleted',
       '00000000-0000-0000-0000-000000000001',
       (SELECT u.role FROM users u WHERE u.id = '00000000-0000-0000-0000-000000000001'),
       jsonb_build_object('documentNumber', o.document_number, 'title', o.title,
                          'status', o.status, 'deletedAt', NULL),
       jsonb_build_object('deletedAt', now()),
       jsonb_build_object(
         'migration', '0039_lismi01_align_register_2025',
         'reason',    'Absent de la revision 2025 du registre LIS-MI-01')
FROM _obsolete o;

UPDATE dms_documents d
SET deleted_at = now(), updated_at = now()
WHERE d.id IN (SELECT id FROM _obsolete);

-- -- 5. Rembobiner les compteurs sur le registre subsistant --------------------
-- Meme logique qu'en 0038 : « Nouveau document » doit proposer le numero qui
-- suit le registre en vigueur, pas celui qui suit une generation perimee.
UPDATE dms_code_sequences s
SET last_seq = COALESCE(live.max_seq, 0), updated_at = now()
FROM (SELECT s2.type_code, s2.process_code,
             (SELECT max(substring(d.document_number from '^[A-Z]+-[A-Z]+-0*([0-9]+)$')::int)
              FROM dms_documents d
              WHERE d.deleted_at IS NULL
                AND d.document_number ~ ('^' || s2.type_code || '-' || s2.process_code || '-[0-9]+$')
             ) AS max_seq
      FROM dms_code_sequences s2) live
WHERE s.type_code = live.type_code
  AND s.process_code = live.process_code
  AND s.last_seq > COALESCE(live.max_seq, 0);

COMMIT;
