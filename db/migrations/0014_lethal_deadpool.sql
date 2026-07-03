CREATE TYPE "public"."contract_type" AS ENUM('cdi', 'cdd', 'civp', 'stage', 'interim', 'autre');--> statement-breakpoint
CREATE TYPE "public"."evaluation_result" AS ENUM('tres_satisfaisant', 'satisfaisant', 'insuffisant', 'tres_insuffisant');--> statement-breakpoint
CREATE TYPE "public"."leave_status" AS ENUM('en_attente', 'approuve', 'refuse', 'annule');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('conge_annuel', 'conge_maladie', 'conge_maternite', 'conge_paternite', 'conge_sans_solde', 'jour_ferie', 'autre');--> statement-breakpoint
CREATE TYPE "public"."recruitment_status" AS ENUM('ouvert', 'en_cours', 'pourvu', 'annule');--> statement-breakpoint
CREATE TYPE "public"."training_status" AS ENUM('planifie', 'en_cours', 'realise', 'reporte', 'annule');--> statement-breakpoint
CREATE TABLE "employee_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"matricule" varchar(50),
	"cin" varchar(20),
	"matricule_cnss" varchar(50),
	"family_situation" varchar(50),
	"contract_type" "contract_type",
	"contract_start_date" date,
	"contract_end_date" date,
	"job_position_id" uuid,
	"job_title" varchar(255),
	"hierarchical_superior_id" uuid,
	"planned_days_per_year" integer DEFAULT 220,
	"leave_balance_days" numeric(5, 1) DEFAULT '0',
	"leave_balance_previous" numeric(5, 1) DEFAULT '0',
	"integration_pilot" varchar(255),
	"integration_start_date" date,
	"integration_end_date" date,
	"deputy_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "employee_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "exit_authorizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"duration_hours" numeric(4, 1),
	"reason" text,
	"status" "leave_status" DEFAULT 'en_attente' NOT NULL,
	"supervisor_approval" "leave_status",
	"supervisor_approved_by" uuid,
	"rh_approval" "leave_status",
	"rh_approved_by" uuid,
	"notes" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pilot_id" uuid,
	"planned_start_date" date,
	"planned_end_date" date,
	"items" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(30),
	"title" varchar(255) NOT NULL,
	"department" varchar(100),
	"hierarchical_superior" varchar(255),
	"initial_training" text,
	"continuous_training" text,
	"main_missions" text,
	"attributions" text,
	"indispensable_criteria" text,
	"desirable_criteria" text,
	"work_techniques" jsonb DEFAULT '[]'::jsonb,
	"updated_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"leave_type" "leave_type" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"duration_days" numeric(5, 1) NOT NULL,
	"reason" text,
	"status" "leave_status" DEFAULT 'en_attente' NOT NULL,
	"supervisor_approval" "leave_status",
	"supervisor_approved_by" uuid,
	"supervisor_approved_at" timestamp,
	"supervisor_note" text,
	"rh_approval" "leave_status",
	"rh_approved_by" uuid,
	"rh_approved_at" timestamp,
	"direction_approval" "leave_status",
	"direction_approved_by" uuid,
	"direction_approved_at" timestamp,
	"balance_before_days" numeric(5, 1),
	"notes" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"evaluator_id" uuid NOT NULL,
	"evaluation_date" date NOT NULL,
	"current_position" varchar(255),
	"seniority_company" varchar(50),
	"seniority_position" varchar(50),
	"work_techniques_criteria" jsonb DEFAULT '[]'::jsonb,
	"work_techniques_score" numeric(4, 2),
	"work_techniques_desired" numeric(4, 2),
	"attendance_score" numeric(4, 2),
	"rigor_score" numeric(4, 2),
	"discipline_score" numeric(4, 2),
	"discipline_desired" numeric(4, 2),
	"improvement_score" numeric(4, 2),
	"smq_respect_score" numeric(4, 2),
	"risk_analysis_score" numeric(4, 2),
	"quality_score" numeric(4, 2),
	"quality_desired" numeric(4, 2),
	"communication_score" numeric(4, 2),
	"teamwork_score" numeric(4, 2),
	"management_score" numeric(4, 2),
	"learning_score" numeric(4, 2),
	"integration_score" numeric(4, 2),
	"integration_desired" numeric(4, 2),
	"global_score" numeric(4, 2),
	"global_score_pct" numeric(5, 2),
	"previous_score" numeric(4, 2),
	"evaluee_needs" text,
	"training_actions" jsonb DEFAULT '[]'::jsonb,
	"next_objectives" text,
	"remarks" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recruitment_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref_code" varchar(30),
	"job_position_id" uuid,
	"post_title" varchar(255) NOT NULL,
	"requesting_dept" varchar(100),
	"hierarchical_superior" varchar(255),
	"proposed_status" varchar(50),
	"reason" text,
	"study_level" varchar(255),
	"study_specialty" varchar(255),
	"experience_duration" varchar(100),
	"main_missions" text,
	"required_skills" text,
	"status" "recruitment_status" DEFAULT 'ouvert' NOT NULL,
	"opened_date" date,
	"closed_date" date,
	"filled_by_user_id" uuid,
	"notes" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"attended" boolean DEFAULT true NOT NULL,
	"hot_eval_score" numeric(4, 1),
	"hot_eval_notes" text,
	"cold_eval_score" numeric(4, 1),
	"cold_eval_notes" text,
	"cold_eval_competencies" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref_code" varchar(30),
	"year" integer NOT NULL,
	"thematic" varchar(100),
	"theme" varchar(500) NOT NULL,
	"requested_by_user_id" uuid,
	"requested_date" date,
	"objective" text,
	"trainer_name" varchar(255),
	"training_org" varchar(255),
	"location" varchar(255),
	"planned_start_date" date,
	"planned_end_date" date,
	"actual_start_date" date,
	"actual_end_date" date,
	"status" "training_status" DEFAULT 'planifie' NOT NULL,
	"action_type" varchar(50),
	"hot_eval_date" date,
	"cold_eval_date" date,
	"notes" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_job_position_id_job_positions_id_fk" FOREIGN KEY ("job_position_id") REFERENCES "public"."job_positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_hierarchical_superior_id_users_id_fk" FOREIGN KEY ("hierarchical_superior_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_deputy_id_users_id_fk" FOREIGN KEY ("deputy_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_authorizations" ADD CONSTRAINT "exit_authorizations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_authorizations" ADD CONSTRAINT "exit_authorizations_supervisor_approved_by_users_id_fk" FOREIGN KEY ("supervisor_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_authorizations" ADD CONSTRAINT "exit_authorizations_rh_approved_by_users_id_fk" FOREIGN KEY ("rh_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exit_authorizations" ADD CONSTRAINT "exit_authorizations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_plans" ADD CONSTRAINT "integration_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_plans" ADD CONSTRAINT "integration_plans_pilot_id_users_id_fk" FOREIGN KEY ("pilot_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_plans" ADD CONSTRAINT "integration_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_positions" ADD CONSTRAINT "job_positions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_supervisor_approved_by_users_id_fk" FOREIGN KEY ("supervisor_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_rh_approved_by_users_id_fk" FOREIGN KEY ("rh_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_direction_approved_by_users_id_fk" FOREIGN KEY ("direction_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_evaluations" ADD CONSTRAINT "performance_evaluations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_evaluations" ADD CONSTRAINT "performance_evaluations_evaluator_id_users_id_fk" FOREIGN KEY ("evaluator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_evaluations" ADD CONSTRAINT "performance_evaluations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruitment_requests" ADD CONSTRAINT "recruitment_requests_job_position_id_job_positions_id_fk" FOREIGN KEY ("job_position_id") REFERENCES "public"."job_positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruitment_requests" ADD CONSTRAINT "recruitment_requests_filled_by_user_id_users_id_fk" FOREIGN KEY ("filled_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruitment_requests" ADD CONSTRAINT "recruitment_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_participants" ADD CONSTRAINT "training_participants_training_session_id_training_sessions_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_participants" ADD CONSTRAINT "training_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_participants" ADD CONSTRAINT "training_participants_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employee_profiles_user_id_idx" ON "employee_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employee_profiles_matricule_idx" ON "employee_profiles" USING btree ("matricule");--> statement-breakpoint
CREATE INDEX "exit_auth_user_idx" ON "exit_authorizations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "exit_auth_date_idx" ON "exit_authorizations" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "integration_plan_user_idx" ON "integration_plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "job_positions_dept_idx" ON "job_positions" USING btree ("department");--> statement-breakpoint
CREATE INDEX "leave_requests_user_idx" ON "leave_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "leave_requests_status_idx" ON "leave_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leave_requests_date_idx" ON "leave_requests" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "perf_eval_user_idx" ON "performance_evaluations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "perf_eval_date_idx" ON "performance_evaluations" USING btree ("evaluation_date");--> statement-breakpoint
CREATE INDEX "recruitment_status_idx" ON "recruitment_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "training_participants_session_idx" ON "training_participants" USING btree ("training_session_id");--> statement-breakpoint
CREATE INDEX "training_participants_user_idx" ON "training_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "training_year_idx" ON "training_sessions" USING btree ("year");--> statement-breakpoint
CREATE INDEX "training_status_idx" ON "training_sessions" USING btree ("status");