CREATE TYPE "public"."nc_owner_type" AS ENUM('interne', 'externe');--> statement-breakpoint
CREATE TYPE "public"."nc_type" AS ENUM('technique', 'documentaire', 'reclamation_client', 'audit', 'systeme');--> statement-breakpoint
ALTER TABLE "non_conformances" ALTER COLUMN "process_affected" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "nc_type" "nc_type";--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "nc_owner_type" "nc_owner_type";--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "auditor_name" text;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "before_photo_asset_id" uuid;--> statement-breakpoint
ALTER TABLE "non_conformances" ADD COLUMN "after_photo_asset_id" uuid;