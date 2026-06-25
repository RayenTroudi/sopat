CREATE TYPE "public"."dms_row_highlight" AS ENUM('none', 'green', 'red');--> statement-breakpoint
ALTER TABLE "corrective_actions" ADD COLUMN "dms_document_code" varchar(20);--> statement-breakpoint
ALTER TABLE "dms_documents" ADD COLUMN "row_highlight" "dms_row_highlight" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "dms_document_code" varchar(20);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "dms_document_code" varchar(20);--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "dms_document_code" varchar(20);