CREATE TYPE "public"."nursery_health" AS ENUM('healthy', 'attention', 'critical', 'dead');--> statement-breakpoint
CREATE TYPE "public"."nursery_movement_type" AS ENUM('reception', 'internal_use', 'reservation', 'reservation_cancel', 'loss', 'transfer', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."nursery_source" AS ENUM('fournisseur_externe', 'pepiniere_sopat');--> statement-breakpoint
CREATE TABLE "nursery_stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"botanical_name" varchar(255) NOT NULL,
	"common_name" varchar(255),
	"category" "plant_category" NOT NULL,
	"current_quantity" numeric(10, 2) DEFAULT '0' NOT NULL,
	"reserved_quantity" numeric(10, 2) DEFAULT '0' NOT NULL,
	"unit" "plant_unit" DEFAULT 'unit' NOT NULL,
	"location" varchar(255),
	"health_status" "nursery_health" DEFAULT 'healthy' NOT NULL,
	"notes" text,
	"photo_cloudinary_id" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nursery_stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stock_id" uuid NOT NULL,
	"movement_type" "nursery_movement_type" NOT NULL,
	"quantity_delta" numeric(10, 2) NOT NULL,
	"project_id" uuid,
	"plant_list_item_id" uuid,
	"purchase_order_id" uuid,
	"notes" text,
	"moved_at" timestamp DEFAULT now() NOT NULL,
	"moved_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "nursery_source" "nursery_source" DEFAULT 'fournisseur_externe';--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "nursery_stock_id" uuid;--> statement-breakpoint
ALTER TABLE "nursery_stock" ADD CONSTRAINT "nursery_stock_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nursery_stock_movements" ADD CONSTRAINT "nursery_stock_movements_stock_id_nursery_stock_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."nursery_stock"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nursery_stock_movements" ADD CONSTRAINT "nursery_stock_movements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nursery_stock_movements" ADD CONSTRAINT "nursery_stock_movements_plant_list_item_id_plant_list_items_id_fk" FOREIGN KEY ("plant_list_item_id") REFERENCES "public"."plant_list_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nursery_stock_movements" ADD CONSTRAINT "nursery_stock_movements_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nursery_stock_movements" ADD CONSTRAINT "nursery_stock_movements_moved_by_users_id_fk" FOREIGN KEY ("moved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nursery_stock_botanical_name_idx" ON "nursery_stock" USING btree ("botanical_name");--> statement-breakpoint
CREATE INDEX "nursery_stock_category_idx" ON "nursery_stock" USING btree ("category");--> statement-breakpoint
CREATE INDEX "nursery_stock_deleted_at_idx" ON "nursery_stock" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "nursery_movements_stock_id_idx" ON "nursery_stock_movements" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "nursery_movements_project_id_idx" ON "nursery_stock_movements" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "nursery_movements_moved_at_idx" ON "nursery_stock_movements" USING btree ("moved_at");--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_nursery_stock_id_fkey" FOREIGN KEY ("nursery_stock_id") REFERENCES "public"."nursery_stock"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "chk_nursery_source_stock_id" CHECK (nursery_source <> 'pepiniere_sopat' OR nursery_stock_id IS NOT NULL);