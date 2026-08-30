-- Migration 0036 — motif de réouverture d'un bordereau FOR-CO-02.
--
-- Pourquoi
-- --------
-- Rouvrir une offre approuvée annule un engagement commercial déjà transmis au
-- client. ISO 9001:2015 §8.2.3.2 demande de conserver l'information documentée
-- sur les modifications apportées aux exigences relatives au produit ou au
-- service : il faut donc savoir POURQUOI, pas seulement QUE.
--
-- Le motif était bien saisi, mais il n'atterrissait que dans
-- `audit_logs.metadata->>'reason'`. Utilisable pour une enquête, inutilisable
-- pour l'historique de révision affiché sur l'offre : rien ne relie la ligne
-- de journal à la version remplacée. On le porte donc sur la version elle-même,
-- avec son auteur et sa date — l'enregistrement devient auto-portant.
--
-- Le journal d'audit continue d'enregistrer l'action : les deux traces sont
-- complémentaires, pas redondantes.

ALTER TABLE offer_versions
  ADD COLUMN IF NOT EXISTS reopen_reason text,
  ADD COLUMN IF NOT EXISTS reopened_by   uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reopened_at   timestamp;

COMMENT ON COLUMN offer_versions.reopen_reason IS
  'Motif de la réouverture qui a remplacé cette version (ISO 9001 §8.2.3.2). Écrit une seule fois.';

-- Cohérence : les trois colonnes sont renseignées ensemble ou pas du tout, et
-- seule une version remplacée peut en porter. Une version approuvée en cours
-- n'a, par définition, pas encore été rouverte.
ALTER TABLE offer_versions
  DROP CONSTRAINT IF EXISTS offer_versions_reopen_chk;
ALTER TABLE offer_versions
  ADD CONSTRAINT offer_versions_reopen_chk CHECK (
    (reopen_reason IS NULL AND reopened_by IS NULL AND reopened_at IS NULL)
    OR (reopen_reason IS NOT NULL AND reopened_by IS NOT NULL AND reopened_at IS NOT NULL
        AND status = 'superseded')
  );

-- Le garde d'immuabilité reprend les règles de 0035 et y ajoute la seule qui
-- manque : le motif de réouverture s'écrit une fois. Un motif réécrit après
-- coup vaudrait moins que pas de motif du tout — il donnerait l'apparence
-- d'une trace tout en étant révisable.
CREATE OR REPLACE FUNCTION offer_versions_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'offer_versions est immuable : la version % ne peut pas être supprimée', OLD.version_no;
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
      'offer_versions est immuable : le contenu de la version % ne peut pas être modifié',
      OLD.version_no;
  END IF;

  IF OLD.status = 'approved' AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'une version approuvée ne peut pas redevenir un brouillon';
  END IF;
  IF OLD.status = 'superseded' AND NEW.status <> 'superseded' THEN
    RAISE EXCEPTION 'une version remplacée ne peut pas être réactivée';
  END IF;
  IF OLD.approved_by IS NOT NULL AND NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
    RAISE EXCEPTION 'l''approbateur d''une version ne peut pas être réécrit';
  END IF;

  IF OLD.reopen_reason IS NOT NULL
  AND (NEW.reopen_reason IS DISTINCT FROM OLD.reopen_reason
    OR NEW.reopened_by  IS DISTINCT FROM OLD.reopened_by
    OR NEW.reopened_at  IS DISTINCT FROM OLD.reopened_at) THEN
    RAISE EXCEPTION
      'le motif de réouverture de la version % ne peut pas être réécrit', OLD.version_no;
  END IF;

  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS offer_versions_guard_trg ON offer_versions;
CREATE TRIGGER offer_versions_guard_trg
  BEFORE UPDATE OR DELETE ON offer_versions
  FOR EACH ROW EXECUTE FUNCTION offer_versions_guard();
