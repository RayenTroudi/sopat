CREATE TABLE "design_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_name" varchar(255) NOT NULL,
	"project_type_context" "project_type"[] NOT NULL DEFAULT '{}',
	"concept_description_template" text NOT NULL,
	"recommended_vocabulary" text[] NOT NULL DEFAULT '{}',
	"recommended_palette" text[] NOT NULL DEFAULT '{}',
	"example_project_ids" uuid[] NOT NULL DEFAULT '{}',
	"reference_image_cloudinary_ids" text[] NOT NULL DEFAULT '{}',
	"created_by" uuid NOT NULL,
	"is_published" boolean NOT NULL DEFAULT false,
	"created_at" timestamp NOT NULL DEFAULT now(),
	"updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "design_templates" ADD CONSTRAINT "design_templates_created_by_fkey"
	FOREIGN KEY ("created_by") REFERENCES "users"("id");
--> statement-breakpoint
CREATE INDEX "design_templates_is_published_idx" ON "design_templates" ("is_published");
--> statement-breakpoint
CREATE INDEX "design_templates_created_by_idx" ON "design_templates" ("created_by");
