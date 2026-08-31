-- Migration 0037 — FOR-CO-02 : revue formelle, traçabilité de version et
-- conservation du fichier source.
--
-- Ce que 0035/0036 avaient déjà réglé
-- -----------------------------------
-- L'arbre section → catégorie → ligne, l'immuabilité d'une version approuvée,
-- le registre d'imports idempotent par SHA-256, le motif de réouverture, et la
-- séparation stricte entre `contract_amount` (prix de vente) et
-- `approved_budget` (plafond de coût interne). Rien de tout cela ne bouge ici.
--
-- Ce qui manquait
-- ---------------
-- 1. **Aucune revue.** Le cycle était brouillon → approuvé : l'auteur figeait
--    une version, la direction l'approuvait, mais rien n'enregistrait qu'une
--    version avait été SOUMISE, ni qu'elle avait été REFUSÉE et pourquoi.
--    ISO 9001:2015 §7.5.2 b) demande « la revue et l'approbation » de
--    l'information documentée — deux actes, pas un. §8.2.3.1 demande la revue
--    des exigences AVANT l'engagement de fournir. Un refus sans motif conservé
--    est une décision qualité perdue.
--
-- 2. **Aucune restriction d'édition pendant la revue.** Le document restait
--    librement modifiable tant qu'il n'était pas approuvé, donc l'objet revu
--    pouvait changer sous les yeux du relecteur. L'index partiel
--    `offer_versions_one_submitted_uidx` rend une seule soumission possible à
--    la fois, et le code applicatif verrouille le document tant qu'elle dure.
--
-- 3. **Le montant contractuel ne nommait pas sa version.** `projects` gardait
--    `contract_amount_source_offer_id` : on savait DE QUELLE OFFRE venait le
--    chiffre, pas de quelle RÉVISION. Après une réouverture et une V2, un
--    auditeur ne pouvait plus répondre à « quelle version du bordereau a servi
--    de base au contrat de ce chantier ? ». C'est exactement l'identification
--    et la traçabilité du §8.5.2.
--
-- 4. **Le fichier source n'était pas conservé.** `offer_imports` gardait le
--    nom, la taille et l'empreinte — de quoi refuser un doublon, pas de quoi
--    rejouer une contestation. §7.5.3.2 demande la maîtrise de l'information
--    documentée d'origine externe jugée nécessaire ; le classeur reçu du client
--    en fait partie. Les colonnes ajoutées pointent vers le fichier archivé.
--
-- Réversible : supprimer les colonnes ajoutées et l'index partiel. Les deux
-- valeurs d'énumération ajoutées ne se retirent pas en PostgreSQL, mais aucune
-- ligne existante ne les porte, donc leur présence est inerte.

-- ─── 1. Les deux états manquants du cycle de vie ─────────────────────────────
--
-- Ajoutés en queue : aucune requête ne trie ni ne compare `status` par ordre
-- d'énumération, donc la position est sans effet et l'ajout est sûr.
ALTER TYPE offer_version_status ADD VALUE IF NOT EXISTS 'submitted';
ALTER TYPE offer_version_status ADD VALUE IF NOT EXISTS 'rejected';

-- ─── 2. Qui a soumis, qui a revu, et pourquoi un refus ───────────────────────
ALTER TABLE offer_versions
  ADD COLUMN IF NOT EXISTS submitted_by     uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS submitted_at     timestamp,
  ADD COLUMN IF NOT EXISTS reviewed_by      uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at      timestamp,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

COMMENT ON COLUMN offer_versions.submitted_by IS
  'Auteur de la soumission pour revue (ISO 9001 7.5.2 b). Ecrit une seule fois.';
COMMENT ON COLUMN offer_versions.rejection_reason IS
  'Motif du refus en revue (ISO 9001 8.2.3). Ecrit une seule fois, jamais reecrit.';

-- Cohérence : les trois colonnes du refus vont ensemble, et seule une version
-- refusée peut en porter.
ALTER TABLE offer_versions DROP CONSTRAINT IF EXISTS offer_versions_rejection_chk;
ALTER TABLE offer_versions
  ADD CONSTRAINT offer_versions_rejection_chk CHECK (
    (rejection_reason IS NULL AND status <> 'rejected')
    OR (rejection_reason IS NOT NULL AND reviewed_by IS NOT NULL
        AND reviewed_at IS NOT NULL AND status = 'rejected')
  );

-- Une seule version en revue à la fois par offre : sans cela, deux soumissions
-- concurrentes rendraient indéterminé ce que le relecteur approuve.
CREATE UNIQUE INDEX IF NOT EXISTS offer_versions_one_submitted_uidx
  ON offer_versions (offer_id) WHERE status = 'submitted';

-- ─── 3. Le garde d'immuabilité, étendu aux nouveaux états ────────────────────
--
-- Reprend intégralement 0035 + 0036 et ajoute la machine à états. Les
-- transitions autorisées, et elles seules :
--
--   draft      → submitted           (soumission pour revue)
--   submitted  → approved | rejected (décision de revue)
--   draft      → superseded          (brouillon abandonné, jamais supprimé)
--   approved   → superseded          (remplacée par une révision)
--
-- `rejected` est terminal : une version refusée reste la trace de ce qui a été
-- refusé. La suite du travail se fait sur le brouillon et produit une nouvelle
-- version, ce qui rend le cycle refus → correction → resoumission lisible dans
-- l'historique au lieu de l'effacer.
CREATE OR REPLACE FUNCTION offer_versions_guard() RETURNS trigger AS $guard$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'offer_versions est immuable : la version % ne peut pas etre supprimee', OLD.version_no;
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
      'offer_versions est immuable : le contenu de la version % ne peut pas etre modifie',
      OLD.version_no;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
         (OLD.status = 'draft'     AND NEW.status IN ('submitted', 'superseded'))
      OR (OLD.status = 'submitted' AND NEW.status IN ('approved', 'rejected'))
      OR (OLD.status = 'approved'  AND NEW.status = 'superseded')
    ) THEN
      RAISE EXCEPTION
        'transition de statut interdite sur la version % : % vers %',
        OLD.version_no, OLD.status, NEW.status;
    END IF;
  END IF;

  IF OLD.approved_by IS NOT NULL AND NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
    RAISE EXCEPTION 'l''approbateur d''une version ne peut pas etre reecrit';
  END IF;

  -- La soumission et la décision de revue s'écrivent une seule fois : une
  -- trace réécrite après coup vaudrait moins que pas de trace du tout.
  IF OLD.submitted_by IS NOT NULL
  AND (NEW.submitted_by IS DISTINCT FROM OLD.submitted_by
    OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at) THEN
    RAISE EXCEPTION 'la soumission de la version % ne peut pas etre reecrite', OLD.version_no;
  END IF;

  IF OLD.reviewed_by IS NOT NULL
  AND (NEW.reviewed_by      IS DISTINCT FROM OLD.reviewed_by
    OR NEW.reviewed_at      IS DISTINCT FROM OLD.reviewed_at
    OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason) THEN
    RAISE EXCEPTION 'la decision de revue de la version % ne peut pas etre reecrite', OLD.version_no;
  END IF;

  IF OLD.reopen_reason IS NOT NULL
  AND (NEW.reopen_reason IS DISTINCT FROM OLD.reopen_reason
    OR NEW.reopened_by  IS DISTINCT FROM OLD.reopened_by
    OR NEW.reopened_at  IS DISTINCT FROM OLD.reopened_at) THEN
    RAISE EXCEPTION
      'le motif de reouverture de la version % ne peut pas etre reecrit', OLD.version_no;
  END IF;

  RETURN NEW;
END $guard$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS offer_versions_guard_trg ON offer_versions;
CREATE TRIGGER offer_versions_guard_trg
  BEFORE UPDATE OR DELETE ON offer_versions
  FOR EACH ROW EXECUTE FUNCTION offer_versions_guard();

-- ─── 4. Le montant contractuel nomme sa version ──────────────────────────────
--
-- L'offre ne suffit pas : elle a pu être rouverte et révisée depuis. La version
-- est immuable, donc ce pointeur répond définitivement à « sur quelle base le
-- contrat a-t-il été chiffré ? » (ISO 9001 §8.5.2 — identification et
-- traçabilité).
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS contract_amount_source_version_id uuid REFERENCES offer_versions(id);

COMMENT ON COLUMN projects.contract_amount_source_version_id IS
  'Version FOR-CO-02 immuable dont le montant contractuel a ete tire (ISO 9001 8.5.2).';

-- ─── 5. Le classeur source, conservé ─────────────────────────────────────────
--
-- Le fichier est archivé tel qu'il a été reçu, à côté de son empreinte : le
-- hash prouve que l'archive est bien l'octet-pour-octet de ce qui a été
-- importé. `source_file_url` est nullable — un import antérieur à cette
-- migration, ou un envoi vers le stockage qui échoue, ne doit pas faire perdre
-- l'import lui-même.
ALTER TABLE offer_imports
  ADD COLUMN IF NOT EXISTS source_file_url       text,
  ADD COLUMN IF NOT EXISTS source_file_public_id varchar(255),
  ADD COLUMN IF NOT EXISTS source_file_stored_at timestamp;

COMMENT ON COLUMN offer_imports.source_file_url IS
  'Classeur d''origine archive tel quel (ISO 9001 7.5.3.2). NULL si non conserve.';

-- ─── 6. Index manquant sur le registre d'imports ─────────────────────────────
-- L'historique d'import d'une offre est lu à chaque ouverture du bordereau.
CREATE INDEX IF NOT EXISTS offer_imports_offer_idx ON offer_imports (offer_id, imported_at DESC);
