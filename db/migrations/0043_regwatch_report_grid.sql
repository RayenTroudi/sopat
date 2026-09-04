-- FOR-MI-02 « Rapport de veille normative et réglementaire » : grille + édition
-- contrôlée.
--
-- Le formulaire officiel est un rapport ANNUEL (en-tête « Année ») portant une
-- grille de 13 colonnes, une ligne par texte consulté :
--   Date | Type | Axe | Document (Référence) | Contenu | Version / Edition |
--   Document ou site de consultation | Résultats | Evaluation du degré
--   d'application | Evaluation de la conformité | Risque associé |
--   Processus Rattaché | Commentaires
--
-- `regulatory_watch` n'en couvrait que quatre (référence, titre, domaine,
-- organisme) : le résultat de la veille — ce qui a été consulté, ce qu'on en a
-- conclu, le degré d'application, la conformité et le risque associé —
-- n'existait nulle part, donc ni requêtable ni exportable au format du
-- formulaire. Il manquait par ailleurs tout regroupement annuel : le registre
-- était plat, sans le rapport que le pilote signe.
--
-- Choix de conception : `regulatory_watch` DEVIENT la table de lignes plutôt
-- que d'être doublée par une nouvelle. Une ligne de la grille EST une entrée de
-- veille ; `report_id` reste nullable, donc les entrées existantes du registre
-- restent valides sans rattachement. Créer une seconde table aurait dupliqué le
-- même objet métier dans deux systèmes parallèles.
--
-- Le motif de modification n'a pas de colonne : il voyage, avec l'avant/après,
-- dans record_audit_log.metadata.changeReason — comme pour FOR-MI-01 (0042).

CREATE TABLE IF NOT EXISTS "regulatory_watch_reports" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reference"       varchar(30) NOT NULL UNIQUE,
  -- En-tête « Année » du formulaire : le rapport de veille est annuel.
  "year"            integer NOT NULL,
  -- Réutilise l'enum de cycle de vie déjà posé par FOR-MI-01 : planifié / en
  -- cours / terminé décrit exactement le même parcours d'enregistrement, et un
  -- second enum aux mêmes valeurs n'aurait fait que diverger avec le temps.
  "status"          "document_review_status" NOT NULL DEFAULT 'planned',
  -- Rev. 1 = version d'origine. Incrémente dès qu'un rapport terminé est
  -- modifié (ISO 9001:2015 §7.5.3.2 c).
  "revision_number" integer NOT NULL DEFAULT 1,
  "completed_at"    timestamp,
  "completed_by"    uuid REFERENCES "users"("id"),
  "updated_by"      uuid REFERENCES "users"("id"),
  "created_by"      uuid NOT NULL REFERENCES "users"("id"),
  "deleted_at"      timestamp,
  "created_at"      timestamp NOT NULL DEFAULT now(),
  "updated_at"      timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "regulatory_watch_reports_year_idx"   ON "regulatory_watch_reports" ("year");
CREATE INDEX IF NOT EXISTS "regulatory_watch_reports_status_idx" ON "regulatory_watch_reports" ("status");

ALTER TABLE "regulatory_watch"
  ADD COLUMN IF NOT EXISTS "report_id"              uuid REFERENCES "regulatory_watch_reports"("id"),
  ADD COLUMN IF NOT EXISTS "watch_date"             date,
  ADD COLUMN IF NOT EXISTS "watch_type"             varchar(120),
  ADD COLUMN IF NOT EXISTS "axis"                   varchar(120),
  ADD COLUMN IF NOT EXISTS "content"                text,
  ADD COLUMN IF NOT EXISTS "version"                varchar(60),
  ADD COLUMN IF NOT EXISTS "consultation_source"    text,
  ADD COLUMN IF NOT EXISTS "results"                text,
  ADD COLUMN IF NOT EXISTS "application_level"      text,
  ADD COLUMN IF NOT EXISTS "conformity_assessment"  text,
  ADD COLUMN IF NOT EXISTS "associated_risk"        text,
  ADD COLUMN IF NOT EXISTS "process_code"           "nc_dept",
  ADD COLUMN IF NOT EXISTS "comments"               text,
  ADD COLUMN IF NOT EXISTS "sort_order"             integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "updated_by"             uuid REFERENCES "users"("id");

-- Le formulaire officiel n'a pas de colonne « Titre » : une ligne de grille se
-- décrit par sa référence et son contenu. La contrainte NOT NULL forcerait à
-- inventer une valeur, ce que le registre autonome n'exige plus non plus.
ALTER TABLE "regulatory_watch" ALTER COLUMN "title" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "regulatory_watch_report_idx" ON "regulatory_watch" ("report_id");

COMMENT ON COLUMN "regulatory_watch"."application_level" IS
  'FOR-MI-02 colonne « Evaluation du degré d''application ».';
COMMENT ON COLUMN "regulatory_watch"."conformity_assessment" IS
  'FOR-MI-02 colonne « Evaluation de la conformité ».';
COMMENT ON COLUMN "regulatory_watch"."process_code" IS
  'FOR-MI-02 colonne « Processus Rattaché » — le processus SMQ concerné par le texte.';
