-- Journal d'audit générique (ISO 9001 : traçabilité de toute modification).
--
-- project_activity_log ne convient pas : son project_id est NOT NULL avec une
-- clé étrangère vers projects, alors qu'une extra dépense peut n'être rattachée
-- à aucun projet. dms_audit_log est lié à dms_documents. Plutôt qu'une
-- troisième table mono-entité, celle-ci est polymorphe (entity_type +
-- entity_id) pour couvrir aussi les bons de commande, bons de livraison,
-- fournisseurs et contrats sans nouvelle migration.
--
-- Pas de clé étrangère sur entity_id : c'est le prix du polymorphisme. Une
-- entrée qui survit à son enregistrement reste d'ailleurs souhaitable pour un
-- audit.

CREATE TABLE IF NOT EXISTS record_audit_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type         varchar(50)  NOT NULL,
  entity_id           uuid         NOT NULL,
  action              varchar(50)  NOT NULL,
  actor_id            uuid         NOT NULL,
  actor_name          varchar(255) NOT NULL,
  -- Autorité détenue au moment du fait, et non celle d'aujourd'hui.
  actor_role_snapshot user_role    NOT NULL,
  -- Pour une modification : uniquement les champs qui ont changé.
  previous_state      jsonb,
  new_state           jsonb,
  metadata            jsonb,
  occurred_at         timestamp    NOT NULL DEFAULT now(),
  CONSTRAINT record_audit_log_actor_id_fk FOREIGN KEY (actor_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS record_audit_entity_idx   ON record_audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS record_audit_actor_idx    ON record_audit_log (actor_id);
CREATE INDEX IF NOT EXISTS record_audit_occurred_idx ON record_audit_log (occurred_at);
