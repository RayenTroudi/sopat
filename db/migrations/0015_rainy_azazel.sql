CREATE TYPE "public"."amenagement_type" AS ENUM('amenagement', 'reamenagement', 'autre');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'rh_manager';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'rh_agent';--> statement-breakpoint
CREATE TABLE "attendance_sheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"entries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"days_worked" integer,
	"salary_advance" numeric(10, 3),
	"supervisor_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"issued_date" date,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"delivered_by" uuid,
	"returned_date" date,
	"returned_notes" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mission_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"cin_number" varchar(20),
	"cin_issued_at" varchar(100),
	"destination" text,
	"mission_purpose" text,
	"start_date" date,
	"end_date" date,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"gm_approved_at" timestamp,
	"gm_approved_by" uuid,
	"rh_approved_at" timestamp,
	"rh_approved_by" uuid,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personnel_file_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"has_cin" boolean DEFAULT false,
	"has_birth_certificate" boolean DEFAULT false,
	"has_photos" boolean DEFAULT false,
	"has_info_sheet" boolean DEFAULT false,
	"has_bulletin3" boolean DEFAULT false,
	"has_cnss" boolean DEFAULT false,
	"has_rib" boolean DEFAULT false,
	"has_medical_cert" boolean DEFAULT false,
	"has_diplomas" boolean DEFAULT false,
	"has_prev_payslip" boolean DEFAULT false,
	"has_drivers_license" boolean DEFAULT false,
	"has_prev_employment_cert" boolean DEFAULT false,
	"supervisor_id" uuid,
	"rh_signed_at" timestamp,
	"supervisor_signed_at" timestamp,
	"employee_signed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "personnel_file_checklists_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "substitutes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"position_label" varchar(255) NOT NULL,
	"holder_user_id" uuid,
	"substitute_user_id" uuid,
	"updated_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_study_records" ADD COLUMN "amenagement_type" "amenagement_type";--> statement-breakpoint
ALTER TABLE "attendance_sheets" ADD CONSTRAINT "attendance_sheets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sheets" ADD CONSTRAINT "attendance_sheets_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sheets" ADD CONSTRAINT "attendance_sheets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_receipts" ADD CONSTRAINT "equipment_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_receipts" ADD CONSTRAINT "equipment_receipts_delivered_by_users_id_fk" FOREIGN KEY ("delivered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_receipts" ADD CONSTRAINT "equipment_receipts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_orders" ADD CONSTRAINT "mission_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_orders" ADD CONSTRAINT "mission_orders_gm_approved_by_users_id_fk" FOREIGN KEY ("gm_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_orders" ADD CONSTRAINT "mission_orders_rh_approved_by_users_id_fk" FOREIGN KEY ("rh_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_orders" ADD CONSTRAINT "mission_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personnel_file_checklists" ADD CONSTRAINT "personnel_file_checklists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personnel_file_checklists" ADD CONSTRAINT "personnel_file_checklists_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personnel_file_checklists" ADD CONSTRAINT "personnel_file_checklists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "substitutes" ADD CONSTRAINT "substitutes_holder_user_id_users_id_fk" FOREIGN KEY ("holder_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "substitutes" ADD CONSTRAINT "substitutes_substitute_user_id_users_id_fk" FOREIGN KEY ("substitute_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "substitutes" ADD CONSTRAINT "substitutes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_user_month_idx" ON "attendance_sheets" USING btree ("user_id","month","year");--> statement-breakpoint
CREATE INDEX "equipment_receipt_user_idx" ON "equipment_receipts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mission_order_user_idx" ON "mission_orders" USING btree ("user_id");