-- Systeme de notifications in-app : transitions de phase + alertes budget

CREATE TYPE "notification_type" AS ENUM ('phase_transition', 'budget_alert');

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recipient_id" uuid NOT NULL REFERENCES "users"("id"),
  "type" "notification_type" NOT NULL,
  "title" varchar(255) NOT NULL,
  "body" text,
  "href" varchar(500),
  "project_id" uuid REFERENCES "projects"("id"),
  "read_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "created_by" uuid REFERENCES "users"("id")
);
CREATE INDEX IF NOT EXISTS "notifications_recipient_unread_idx" ON "notifications" ("recipient_id", "read_at");
CREATE INDEX IF NOT EXISTS "notifications_recipient_created_idx" ON "notifications" ("recipient_id", "created_at");

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "budget_alert_90_notified_at" timestamp;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "budget_alert_over_notified_at" timestamp;
