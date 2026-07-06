CREATE TABLE "chantier_daily_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"log_date" date NOT NULL,
	"day_number" integer,
	"total_progress" numeric(5, 2),
	"works_done_today" text,
	"supplies" text,
	"anomalies" text,
	"participants" jsonb DEFAULT '[]'::jsonb,
	"other_intervenants" text,
	"remarks" text,
	"next_day_agenda" text,
	"chef_projet" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"poste" varchar(255) NOT NULL,
	"titulaire" varchar(255),
	"suppleant" varchar(255),
	"is_subcontractor" boolean DEFAULT false NOT NULL,
	"subcontractor_name" varchar(255),
	"user_id" uuid,
	"phase_start_date" date,
	"phase_end_date" date,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "realisation_action_plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"phase_code" varchar(50) NOT NULL,
	"phase_label" varchar(500) NOT NULL,
	"planned_start_date" date,
	"planned_end_date" date,
	"actual_start_date" date,
	"actual_end_date" date,
	"progress_pct" integer DEFAULT 0 NOT NULL,
	"observations" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_phase_header" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chantier_daily_logs" ADD CONSTRAINT "chantier_daily_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chantier_daily_logs" ADD CONSTRAINT "chantier_daily_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "realisation_action_plan_items" ADD CONSTRAINT "realisation_action_plan_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "realisation_action_plan_items" ADD CONSTRAINT "realisation_action_plan_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chantier_daily_logs_project_id_idx" ON "chantier_daily_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "chantier_daily_logs_date_idx" ON "chantier_daily_logs" USING btree ("log_date");--> statement-breakpoint
CREATE INDEX "project_team_members_project_id_idx" ON "project_team_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "realisation_action_plan_project_id_idx" ON "realisation_action_plan_items" USING btree ("project_id");