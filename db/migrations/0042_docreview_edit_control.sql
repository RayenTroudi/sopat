-- FOR-MI-01 « Rapport de revue documentaire » : édition contrôlée.
--
-- Le formulaire officiel n'est pas un résumé : c'est une grille, une ligne par
-- document revu (Réf. document / Titre / Nécessité de création, modification ou
-- élimination Oui-Non + description / Nécessité de revue d'analyse des risques
-- et opportunités Oui-Non + description / Commentaires), sous un en-tête qui
-- porte le processus et la date, et au-dessus d'une signature de pilote de
-- processus. Le registre ne stockait qu'un compteur `documents_count` et deux
-- champs libres : le contenu revu — quel document, quelle décision — n'existait
-- nulle part, donc ni requêtable ni traçable ligne à ligne.
--
-- Ajoute aussi ce qu'exige la modification d'un rapport déjà terminé
-- (ISO 9001:2015 §7.5.3.2 c) : un numéro de révision et l'auteur de la dernière
-- modification. Le motif du changement, lui, va dans record_audit_log.metadata,
-- avec l'avant/après — le journal existe déjà, en créer un second le diviserait.

ALTER TABLE "document_reviews"
  ADD COLUMN IF NOT EXISTS "process_code"    "nc_dept",
  ADD COLUMN IF NOT EXISTS "revision_number" integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "updated_by"      uuid REFERENCES "users"("id"),
  ADD COLUMN IF NOT EXISTS "completed_at"    timestamp,
  ADD COLUMN IF NOT EXISTS "completed_by"    uuid REFERENCES "users"("id");

COMMENT ON COLUMN "document_reviews"."process_code" IS
  'FOR-MI-01 en-tête « Processus: » — le processus SMQ dont le pilote signe la revue.';
COMMENT ON COLUMN "document_reviews"."revision_number" IS
  'Incrémenté à chaque modification d''une revue terminée. Rev 1 = version d''origine.';
COMMENT ON COLUMN "document_reviews"."completed_by" IS
  'FOR-MI-01 « Signature Pilote processus » — qui a clos la revue, et quand.';

-- Une ligne par document revu.
CREATE TABLE IF NOT EXISTS "document_review_lines" (
  "id"                       uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "review_id"                uuid NOT NULL REFERENCES "document_reviews"("id") ON DELETE CASCADE,
  -- Le code tel qu'il figure sur le formulaire, conservé même si le document
  -- n'existe pas (encore) au registre DMS : le rapport doit rester lisible seul.
  "document_code"            varchar(30),
  -- Le rattachement au registre DMS quand il existe. « Every document should be
  -- connected to business entities » — sans cette clé, une revue documentaire
  -- ne serait qu'un texte parlant de documents.
  "document_id"              uuid REFERENCES "dms_documents"("id"),
  "title"                    varchar(255),
  "change_needed"            boolean,
  "change_description"       text,
  "risk_review_needed"       boolean,
  "risk_review_description"  text,
  "comments"                 text,
  "sort_order"               integer NOT NULL DEFAULT 0,
  "deleted_at"               timestamp,
  "created_at"               timestamp NOT NULL DEFAULT now(),
  "updated_at"               timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "document_review_lines_review_idx"   ON "document_review_lines" ("review_id");
CREATE INDEX IF NOT EXISTS "document_review_lines_document_idx" ON "document_review_lines" ("document_id");

-- Les revues déjà saisies sont, par construction, en révision 1 et sans lignes.
UPDATE "document_reviews" SET "revision_number" = 1 WHERE "revision_number" IS NULL;
