-- FOR-MI-04 « PV de réunion » : structure relationnelle + édition contrôlée.
--
-- Le formulaire officiel n'est pas un bloc de texte libre. Il aligne une
-- en-tête (Date(s), Projet associé), une LISTE de participants
-- (« Nom, prénom et poste »), une GRILLE d'ordre du jour
-- (N° | Ordre de jour prévu | Points traités) et une seconde GRILLE de plan
-- d'action (N° | Action | Responsable(s) | Délai Prévu | Délai Réalisé |
-- Suivi | Commentaire(s)), puis les recommandations et la date/heure de la
-- prochaine réunion.
--
-- `meeting_minutes` n'offrait que des colonnes texte (`participants`,
-- `agenda`, `discussions`) : impossible de savoir qui s'est engagé sur quoi,
-- ni de relire un ordre du jour point par point, ni d'exporter le classeur au
-- format que l'auditeur a en main. Le plan d'action existait bien
-- (`meeting_action_items`) mais sans « Délai Réalisé », sans « Suivi » et sans
-- « Commentaire(s) » — les trois colonnes par lesquelles se lit justement
-- l'avancement d'un engagement.
--
-- Choix de conception :
--   * `meeting_action_items` est ÉTENDUE, pas doublée : une ligne du plan
--     d'action EST une action de réunion, et c'est déjà cette table que la
--     fiche PV affiche.
--   * `meeting_participants` et `meeting_agenda_items` sont de nouvelles
--     relations car rien n'existait pour elles.
--   * Les colonnes texte historiques (`participants`, `agenda`, `discussions`)
--     sont CONSERVÉES telles quelles : l'assistant de réunion IA les écrit, et
--     ce module reste hors périmètre ici. Elles servent désormais de capture
--     libre ; les relations portent la saisie structurée du formulaire.
--
-- Tout est additif et nullable : aucun PV existant ne change de sens.
-- Le motif de modification n'a pas de colonne : il voyage, avec l'avant/après,
-- dans record_audit_log.metadata.changeReason — comme FOR-MI-01 (0042) et
-- FOR-MI-02 (0043).

-- En-tête ---------------------------------------------------------------------
ALTER TABLE "meeting_minutes"
  ADD COLUMN IF NOT EXISTS "project_id"        uuid REFERENCES "projects"("id"),
  -- Réutilise l'enum de FOR-MI-01 : planifié / en cours / terminé. Défaut
  -- 'in_progress' et non 'planned' : les PV déjà en base sont des comptes
  -- rendus rédigés, et surtout aucun ne doit devenir verrouillé
  -- rétroactivement par la migration.
  ADD COLUMN IF NOT EXISTS "status"            "document_review_status" NOT NULL DEFAULT 'in_progress',
  ADD COLUMN IF NOT EXISTS "revision_number"   integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "completed_at"      timestamp,
  ADD COLUMN IF NOT EXISTS "completed_by"      uuid REFERENCES "users"("id"),
  ADD COLUMN IF NOT EXISTS "updated_by"        uuid REFERENCES "users"("id"),
  -- Bandeau « Recommandations » du formulaire, et l'heure qui accompagne la
  -- date de la prochaine réunion (cellule « Heure: »).
  ADD COLUMN IF NOT EXISTS "recommendations"   text,
  ADD COLUMN IF NOT EXISTS "next_meeting_time" varchar(10);

CREATE INDEX IF NOT EXISTS "meeting_minutes_project_idx" ON "meeting_minutes" ("project_id");
CREATE INDEX IF NOT EXISTS "meeting_minutes_status_idx"  ON "meeting_minutes" ("status");

-- Participants : « Nom, prénom et poste » -------------------------------------
CREATE TABLE IF NOT EXISTS "meeting_participants" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "meeting_id" uuid NOT NULL REFERENCES "meeting_minutes"("id"),
  -- Le formulaire demande une seule chaîne « Nom, prénom et poste ». On la
  -- décompose en deux : chercher les PV auxquels une personne a participé n'a
  -- de sens que si le nom est une colonne à lui seul.
  "full_name"  varchar(255) NOT NULL,
  "position"   varchar(255),
  -- Rattachement à un compte SOPAT quand le participant en a un ; NULL pour un
  -- intervenant externe (client, sous-traitant), qui reste un participant à
  -- part entière du PV.
  "user_id"    uuid REFERENCES "users"("id"),
  "present"    boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "deleted_at" timestamp,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "updated_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "meeting_participants_meeting_idx" ON "meeting_participants" ("meeting_id");
CREATE INDEX IF NOT EXISTS "meeting_participants_user_idx"    ON "meeting_participants" ("user_id");

-- Ordre du jour : « Ordre de jour prévu » / « Points traités » ----------------
CREATE TABLE IF NOT EXISTS "meeting_agenda_items" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "meeting_id"       uuid NOT NULL REFERENCES "meeting_minutes"("id"),
  -- Les deux colonnes du formulaire, côte à côte sur la même ligne : c'est
  -- l'écart entre le prévu et le traité qui fait la valeur du PV.
  "planned_item"     text,
  "discussed_points" text,
  "sort_order"       integer NOT NULL DEFAULT 0,
  "deleted_at"       timestamp,
  "created_by"       uuid NOT NULL REFERENCES "users"("id"),
  "updated_by"       uuid REFERENCES "users"("id"),
  "created_at"       timestamp NOT NULL DEFAULT now(),
  "updated_at"       timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "meeting_agenda_items_meeting_idx" ON "meeting_agenda_items" ("meeting_id");

-- Plan d'action : colonnes manquantes du formulaire ---------------------------
ALTER TABLE "meeting_action_items"
  -- « Délai Réalisé » : une DATE d'échéance réellement tenue, distincte de
  -- `completed_at` qui horodate le clic « marquer réalisée ». Confondre les
  -- deux ferait perdre la date que le responsable a effectivement annoncée.
  ADD COLUMN IF NOT EXISTS "actual_date" date,
  -- « Suivi » : l'état d'avancement tel qu'il est écrit dans le formulaire.
  ADD COLUMN IF NOT EXISTS "follow_up"   text,
  ADD COLUMN IF NOT EXISTS "comments"    text,
  ADD COLUMN IF NOT EXISTS "sort_order"  integer NOT NULL DEFAULT 0,
  -- « Never delete records » : une action retirée du plan reste consultable.
  ADD COLUMN IF NOT EXISTS "deleted_at"  timestamp,
  ADD COLUMN IF NOT EXISTS "updated_by"  uuid REFERENCES "users"("id");

COMMENT ON COLUMN "meeting_minutes"."revision_number" IS
  'Rev. 1 = version d''origine. Incremente a chaque modification d''un PV termine (ISO 9001:2015 7.5.3.2 c). Motif dans record_audit_log.metadata.changeReason.';
COMMENT ON COLUMN "meeting_action_items"."actual_date" IS
  'FOR-MI-04, colonne Delai Realise. Distincte de completed_at, qui horodate la cloture dans l''outil.';
COMMENT ON COLUMN "meeting_participants"."user_id" IS
  'NULL pour un participant externe : le PV doit pouvoir citer un client ou un sous-traitant sans compte SOPAT.';
