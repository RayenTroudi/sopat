-- Migration 0034 : assistant de réunion IA (Recall.ai + OpenAI).
--
-- Pourquoi rien de nouveau ne remplace le PV
-- ------------------------------------------
-- SOPAT possède déjà l'entité « réunion » : meeting_minutes (FOR-MI-04) et ses
-- actions meeting_action_items. Une réunion transcrite par l'IA est une réunion
-- SOPAT — même référence PV-AAAA-NNN, même écran, même registre qualité. Créer
-- une seconde table « Meeting » aurait produit deux registres de réunions dont
-- l'un ne serait jamais exporté ni audité. Cette migration ÉTEND donc l'entité
-- existante au lieu de la dupliquer.
--
-- Compatibilité : toutes les colonnes ajoutées sont nullables ou ont une valeur
-- par défaut. `source` vaut 'manual' pour toutes les lignes existantes, donc un
-- PV saisi à la main garde exactement le comportement qu'il avait ; l'écran ne
-- montre la partie IA que si source = 'ai_assistant'.
--
-- Idempotence : la fiabilité du module repose sur trois contraintes d'unicité
-- posées ici, pas sur du code applicatif.
--
--   1. meeting_minutes.recall_bot_id UNIQUE
--      → un bot Recall appartient à un seul PV : impossible que deux réunions
--        se disputent le même flux d'événements.
--   2. meeting_webhook_events (provider, event_id) UNIQUE
--      → un événement livré deux fois (Recall réessaie pendant 24 h) n'est
--        traité qu'une fois : pas de transcription, de rapport ni d'e-mail en
--        double.
--   3. meeting_action_items (meeting_id, dedupe_key) UNIQUE
--      → une régénération d'analyse ne recrée pas les actions déjà extraites.
--        dedupe_key est NULL pour les actions saisies à la main, et Postgres ne
--        considère jamais deux NULL comme égaux : les saisies manuelles ne sont
--        donc pas contraintes.
--
-- Réversible : DROP des trois tables, des colonnes ajoutées et des types.

-- ── Types ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE meeting_source AS ENUM ('manual', 'ai_assistant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Uniquement les plateformes réellement prises en charge par le bot Recall.ai.
DO $$ BEGIN
  CREATE TYPE meeting_platform AS ENUM ('google_meet', 'zoom', 'microsoft_teams', 'webex');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE meeting_ai_status AS ENUM (
    'scheduled', 'bot_created', 'joining', 'in_meeting',
    'processing', 'completed', 'failed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE meeting_action_source AS ENUM ('manual', 'ai');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE meeting_action_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE meeting_report_email_status AS ENUM ('pending', 'sent', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── meeting_minutes : cycle de vie de l'assistant IA ─────────────────────────

ALTER TABLE meeting_minutes
  ADD COLUMN IF NOT EXISTS source               meeting_source NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS meeting_url          text,
  ADD COLUMN IF NOT EXISTS platform             meeting_platform,
  ADD COLUMN IF NOT EXISTS scheduled_at         timestamptz,
  ADD COLUMN IF NOT EXISTS started_at           timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at             timestamptz,
  ADD COLUMN IF NOT EXISTS duration_seconds     integer,
  ADD COLUMN IF NOT EXISTS ai_status            meeting_ai_status,
  ADD COLUMN IF NOT EXISTS ai_error             text,
  ADD COLUMN IF NOT EXISTS recall_bot_id        varchar(100),
  ADD COLUMN IF NOT EXISTS recall_recording_id  varchar(100),
  ADD COLUMN IF NOT EXISTS recall_transcript_id varchar(100),
  ADD COLUMN IF NOT EXISTS bot_name             varchar(100),
  ADD COLUMN IF NOT EXISTS auto_join            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS send_email_report    boolean NOT NULL DEFAULT false,
  -- Statut de l'e-mail SÉPARÉ du statut de la réunion : un envoi qui échoue ne
  -- doit pas faire retomber en échec une réunion dont le compte rendu est bien
  -- produit et consultable.
  ADD COLUMN IF NOT EXISTS report_email_status  meeting_report_email_status,
  ADD COLUMN IF NOT EXISTS report_email_sent_at timestamp,
  ADD COLUMN IF NOT EXISTS report_email_error   text;

CREATE UNIQUE INDEX IF NOT EXISTS meeting_minutes_recall_bot_id_idx
  ON meeting_minutes (recall_bot_id);

CREATE INDEX IF NOT EXISTS meeting_minutes_source_idx    ON meeting_minutes (source);
CREATE INDEX IF NOT EXISTS meeting_minutes_ai_status_idx ON meeting_minutes (ai_status);

-- ── meeting_action_items : actions extraites par l'IA ────────────────────────

ALTER TABLE meeting_action_items
  -- Nullable à dessein : l'IA n'affecte un utilisateur que si le rapprochement
  -- de nom est certain. Ambigu ou inconnu → NULL, et `responsible` garde le nom
  -- prononcé pour qu'un humain tranche.
  ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS source      meeting_action_source NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS priority    meeting_action_priority,
  ADD COLUMN IF NOT EXISTS dedupe_key  varchar(64);

CREATE INDEX IF NOT EXISTS meeting_action_items_assignee_idx
  ON meeting_action_items (assignee_id);

CREATE UNIQUE INDEX IF NOT EXISTS meeting_action_items_dedupe_idx
  ON meeting_action_items (meeting_id, dedupe_key);

-- ── Transcription ────────────────────────────────────────────────────────────
-- Une seule ligne par réunion (meeting_id UNIQUE) : la transcription est
-- récupérée une fois chez Recall puis relue localement. Relancer l'analyse IA
-- ne redemande donc jamais ni un bot ni un téléchargement.

CREATE TABLE IF NOT EXISTS meeting_transcripts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL UNIQUE REFERENCES meeting_minutes(id),
  provider   varchar(50) NOT NULL,
  utterances jsonb,
  plain_text text NOT NULL,
  word_count integer NOT NULL DEFAULT 0,
  fetched_at timestamp NOT NULL DEFAULT now()
);

-- ── Compte rendu IA ──────────────────────────────────────────────────────────
-- Une ligne par génération, jamais d'écrasement : l'historique des analyses
-- successives est lui-même un enregistrement qualité (ISO 9001 § traçabilité).
-- L'écran lit la plus récente par generated_at.

CREATE TABLE IF NOT EXISTS meeting_ai_reports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id     uuid NOT NULL REFERENCES meeting_minutes(id),
  model          varchar(100) NOT NULL,
  prompt_version varchar(20) NOT NULL,
  summary        text NOT NULL,
  topics         jsonb NOT NULL,
  decisions      jsonb NOT NULL,
  action_items   jsonb NOT NULL,
  risks          jsonb NOT NULL,
  questions      jsonb NOT NULL,
  follow_ups     jsonb NOT NULL,
  -- Constats QMS PROPOSÉS uniquement. Aucune NC ni action corrective formelle
  -- n'est créée par l'IA : la promotion vers non_conformances / corrective_actions
  -- exige une confirmation humaine explicite.
  qms_findings   jsonb NOT NULL,
  input_tokens   integer,
  output_tokens  integer,
  generated_at   timestamp NOT NULL DEFAULT now(),
  generated_by   uuid NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS meeting_ai_reports_meeting_idx
  ON meeting_ai_reports (meeting_id, generated_at);

-- ── Journal des webhooks ─────────────────────────────────────────────────────
-- Le verrou d'idempotence. event_id = en-tête `webhook-id` livré par Recall.

CREATE TABLE IF NOT EXISTS meeting_webhook_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider     varchar(30) NOT NULL DEFAULT 'recall',
  event_id     varchar(200) NOT NULL,
  event_type   varchar(100) NOT NULL,
  bot_id       varchar(100),
  meeting_id   uuid REFERENCES meeting_minutes(id),
  payload      jsonb,
  status       varchar(20) NOT NULL DEFAULT 'received',
  error        text,
  received_at  timestamp NOT NULL DEFAULT now(),
  processed_at timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS meeting_webhook_events_provider_event_idx
  ON meeting_webhook_events (provider, event_id);

CREATE INDEX IF NOT EXISTS meeting_webhook_events_bot_idx
  ON meeting_webhook_events (bot_id);
