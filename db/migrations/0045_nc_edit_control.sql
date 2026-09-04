-- 0045 — Contrôle des modifications sur le registre NC/PNC/réclamations (FOR-MI-05)
--
-- Le registre couvrait déjà toutes les colonnes du formulaire : identification,
-- correction immédiate, analyse des causes, actions correctives, évaluation
-- d'efficacité et clôture. Ce qui manquait n'était pas de la donnée métier mais
-- du contrôle documentaire :
--
--   1. Aucune trace de QUI a modifié une fiche. `created_by` existait, jamais
--      `updated_by` : le registre disait qui avait ouvert la NC, jamais qui
--      avait ensuite déplacé une échéance.
--
--   2. Aucun numéro de révision. Une fiche clôturée pouvait être rouverte,
--      réécrite et re-clôturée sans que rien ne distingue la version d'origine
--      de la version corrigée (ISO 9001:2015 §7.5.3.2 c).
--
-- Les mêmes deux colonnes sont ajoutées aux actions correctives : repousser une
-- échéance d'AC est exactement le geste que la norme demande de tracer, et il se
-- fait sur `corrective_actions`, pas sur la NC.
--
-- Purement additif et rejouable. `revision_number` vaut 1 pour tout l'existant
-- (y compris les 38 fiches importées du registre historique) : rév. 1 = version
-- d'origine, ce qui est vrai par construction pour une fiche jamais révisée.

ALTER TABLE "non_conformances"
  ADD COLUMN IF NOT EXISTS "updated_by"      uuid REFERENCES "users"("id"),
  ADD COLUMN IF NOT EXISTS "revision_number" integer NOT NULL DEFAULT 1;

ALTER TABLE "corrective_actions"
  ADD COLUMN IF NOT EXISTS "updated_by"      uuid REFERENCES "users"("id"),
  ADD COLUMN IF NOT EXISTS "revision_number" integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN "non_conformances"."updated_by" IS
  'Dernier auteur d''une modification. NULL tant que la fiche n''a jamais ete modifiee depuis sa creation.';

COMMENT ON COLUMN "non_conformances"."revision_number" IS
  'Rev. 1 = version d''origine. Incremente a chaque modification d''un champ critique sur une fiche deja engagee (in_progress/closed/verified), avec motif obligatoire journalise dans record_audit_log.metadata.changeReason.';

COMMENT ON COLUMN "corrective_actions"."revision_number" IS
  'Rev. 1 = version d''origine. Incremente notamment quand une echeance ou un responsable d''AC est modifie apres engagement.';
