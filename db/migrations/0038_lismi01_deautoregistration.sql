-- Migration 0038 : sortir de LIS-MI-01 les enregistrements ERP qui n'auraient
-- jamais dû y entrer, et rebrancher ceux-ci sur la définition qui les régit.
--
-- ── Cause racine ─────────────────────────────────────────────────────────────
-- `attachDmsCode()` (src/lib/dms/attach.ts, supprimée par ce même changement)
-- était appelée dans huit chemins de création ERP — clients.ts, projects.ts,
-- suppliers.ts, realisation.ts et quatre fois dans iso.ts. À chaque création
-- d'entité elle : (1) incrémentait `dms_code_sequences`, (2) INSÉRAIT une ligne
-- dans `dms_documents`, (3) la reliait à l'entité par un `dms_document_links`
-- de rôle 'origin'. Chaque transaction ERP fabriquait donc une « information
-- documentée interne ». Le même défaut existait dans
-- db/seeds/backfill-dms-codes.ts, neutralisé au passage.
--
-- ── État constaté avant nettoyage ────────────────────────────────────────────
--   714 lignes vivantes dans dms_documents
--   485 portent un lien 'origin' vers une entité ERP  -> fabriquées par le bug
--   229 n'en portent aucun                            -> registre authentique
--       (148 du seed 0009, 69 de l'import du registre, 12 saisies explicites)
--
-- Le lien 'origin' est un discriminant EXACT, vérifié dans les deux sens :
--   - aucune entité ERP portant un dms_document_code ne pointe vers un document
--     dépourvu de lien 'origin' (0 sur 231 entités codées) ;
--   - aucun document dépourvu de lien 'origin' n'est référencé par une entité.
-- Le nettoyage ne repose donc sur aucune liste choisie à la main.
--
-- ── Ce que fait la migration ─────────────────────────────────────────────────
--  1. relie chaque enregistrement opérationnel à sa DÉFINITION maîtrisée
--     (link_role = 'instance'), sans créer le moindre document ;
--  2. repointe `dms_document_code` des entités vers cette définition, et le
--     vide pour les données de référence (client, projet, fournisseur) ;
--  3. journalise puis SOFT-DELETE les 485 lignes fabriquées ;
--  4. rembobine `dms_code_sequences` sur le registre réellement subsistant.
--
-- Rien n'est effacé physiquement : `deleted_at` est renseigné, les liens
-- 'origin' sont conservés comme trace de la provenance, et dms_audit_log garde
-- l'évènement. ISO 9001 §7.5.3 — traçabilité intégrale.

BEGIN;

-- ── 0. Le lot traité, figé une fois pour toutes ──────────────────────────────
-- Table temporaire : la migration doit voir le MÊME ensemble à chaque étape,
-- y compris après avoir posé les liens 'instance' de l'étape 1.
CREATE TEMP TABLE _bug_docs ON COMMIT DROP AS
SELECT DISTINCT d.id, d.document_number, l.entity_type, l.entity_id
FROM dms_documents d
JOIN dms_document_links l
  ON l.document_id = d.id AND l.link_role = 'origin'
WHERE d.deleted_at IS NULL;

-- Correspondance entité ERP -> définition maîtrisée qui la régit.
-- Doit rester identique à CONTROLLED_DOCUMENT_BY_ENTITY (src/lib/dms/attach.ts).
CREATE TEMP TABLE _controlled_map (entity_type text PRIMARY KEY, code text NOT NULL)
ON COMMIT DROP;
INSERT INTO _controlled_map VALUES
  ('purchase_order',    'FOR-AC-03'),  -- Bon de commande
  ('non_conformance',   'FOR-MI-05'),  -- Registre de suivi des NC, PNC et réclamations
  ('corrective_action', 'PRC-MI-04'),  -- Procédure d'actions correctives et préventives
  ('audit_log',         'FOR-MI-13'),  -- Rapport d'audit
  ('audit_program',     'FOR-MI-14');  -- Programme d'audit

-- Les définitions cibles doivent exister et être authentiques (aucun lien
-- 'origin'), sans quoi on rebrancherait les instances sur une ligne du bug.
DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(m.code, ', ') INTO missing
  FROM _controlled_map m
  WHERE NOT EXISTS (
    SELECT 1 FROM dms_documents d
    WHERE d.document_number = m.code
      AND d.deleted_at IS NULL
      AND d.id NOT IN (SELECT id FROM _bug_docs)
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Definitions maitrisees absentes du registre : %', missing;
  END IF;
END $$;

-- ── 1. Relier les enregistrements opérationnels à leur définition ────────────
-- Une ligne par (définition, entité) : cent bons de commande partagent la même
-- définition FOR-AC-03 et n'en produisent aucune copie.
--
-- La clause d'existence n'est pas une précaution de principe. Le bug a survécu
-- à ses entités : 186 documents portent un lien 'origin' vers un programme
-- d'audit alors qu'un seul programme subsiste, 90 vers une NC pour 51 NC
-- vivantes. Sans ce filtre, la migration poserait des centaines de liens
-- 'instance' pointant vers des lignes disparues — on remplacerait un registre
-- faux par des relations fausses.
INSERT INTO dms_document_links (document_id, entity_type, entity_id, link_role, notes, created_by)
SELECT def.id,
       b.entity_type,
       b.entity_id,
       'instance',
       'Rebranche par la migration 0038 (ex-' || b.document_number || ')',
       def.created_by
FROM _bug_docs b
JOIN _controlled_map m ON m.entity_type = b.entity_type::text
JOIN dms_documents def
  ON def.document_number = m.code
 AND def.deleted_at IS NULL
 AND def.id NOT IN (SELECT id FROM _bug_docs)
WHERE CASE b.entity_type::text
        WHEN 'purchase_order'    THEN EXISTS (SELECT 1 FROM purchase_orders    x WHERE x.id = b.entity_id)
        WHEN 'non_conformance'   THEN EXISTS (SELECT 1 FROM non_conformances   x WHERE x.id = b.entity_id AND x.deleted_at IS NULL)
        WHEN 'corrective_action' THEN EXISTS (SELECT 1 FROM corrective_actions x WHERE x.id = b.entity_id)
        WHEN 'audit_log'         THEN EXISTS (SELECT 1 FROM audit_logs         x WHERE x.id = b.entity_id)
        WHEN 'audit_program'     THEN EXISTS (SELECT 1 FROM audit_programs     x WHERE x.id = b.entity_id)
        ELSE false
      END
ON CONFLICT DO NOTHING;

-- ── 2. Repointer dms_document_code sur les entités ───────────────────────────
-- Uniquement là où la colonne pointe vers une ligne du bug : rien de
-- légitimement saisi n'est écrasé.
UPDATE purchase_orders e SET dms_document_code = 'FOR-AC-03'
WHERE e.dms_document_code IN (SELECT document_number FROM _bug_docs);
UPDATE non_conformances e SET dms_document_code = 'FOR-MI-05'
WHERE e.dms_document_code IN (SELECT document_number FROM _bug_docs);
UPDATE corrective_actions e SET dms_document_code = 'PRC-MI-04'
WHERE e.dms_document_code IN (SELECT document_number FROM _bug_docs);
UPDATE audit_logs e SET dms_document_code = 'FOR-MI-13'
WHERE e.dms_document_code IN (SELECT document_number FROM _bug_docs);
UPDATE audit_programs e SET dms_document_code = 'FOR-MI-14'
WHERE e.dms_document_code IN (SELECT document_number FROM _bug_docs);

-- Données de référence : produites par aucun formulaire, donc aucune référence.
UPDATE clients   e SET dms_document_code = NULL
WHERE e.dms_document_code IN (SELECT document_number FROM _bug_docs);
UPDATE projects  e SET dms_document_code = NULL
WHERE e.dms_document_code IN (SELECT document_number FROM _bug_docs);
UPDATE suppliers e SET dms_document_code = NULL
WHERE e.dms_document_code IN (SELECT document_number FROM _bug_docs);

-- ── 3. Journaliser, puis soft-delete ─────────────────────────────────────────
INSERT INTO dms_audit_log (document_id, event, actor_id, actor_role_snapshot, previous_state, new_state, metadata)
SELECT DISTINCT ON (d.id)
       d.id,
       'soft_deleted',
       '00000000-0000-0000-0000-000000000001',   -- compte système (migration 0026)
       -- Le rôle est lu sur la ligne elle-même : le figer en dur avait cassé la
       -- migration (user_role n'a pas de valeur 'super_admin').
       (SELECT u.role FROM users u WHERE u.id = '00000000-0000-0000-0000-000000000001'),
       jsonb_build_object('documentNumber', d.document_number, 'title', d.title,
                          'status', d.status, 'deletedAt', NULL),
       jsonb_build_object('deletedAt', now()),
       jsonb_build_object(
         'migration', '0038_lismi01_deautoregistration',
         'reason',    'Enregistrement ERP inscrit a tort dans LIS-MI-01 par attachDmsCode()',
         'entityType', b.entity_type, 'entityId', b.entity_id)
FROM dms_documents d
JOIN _bug_docs b ON b.id = d.id
WHERE d.deleted_at IS NULL;

UPDATE dms_documents d
SET deleted_at = now(), updated_at = now()
WHERE d.deleted_at IS NULL
  AND d.id IN (SELECT id FROM _bug_docs);

-- ── 4. Rembobiner les compteurs sur le registre subsistant ───────────────────
-- attachDmsCode avait poussé FOR-AC à 50 alors que le registre s'arrête à
-- FOR-AC-11 : sans ce recalage, « Nouveau document » proposerait FOR-AC-51.
-- Le compteur est ramené au plus grand numéro RÉELLEMENT utilisé, jamais
-- au-dessous — les trous existants (FOR-AC-02, 07, 09) sont préservés tels quels.
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
