ALTER TABLE "dms_documents" ADD COLUMN "version_label" varchar(20);--> statement-breakpoint
ALTER TABLE "dms_documents" ADD COLUMN "storage_type" varchar(50);--> statement-breakpoint
ALTER TABLE "dms_documents" ADD COLUMN "managed_by_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "dms_documents" ADD COLUMN "observations" text;