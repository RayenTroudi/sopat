-- FOR CO 02 Bordereau des prix : lignes de prix rattachées aux offres

CREATE TABLE IF NOT EXISTS "offer_line_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "offer_id" uuid NOT NULL REFERENCES "commercial_offers"("id"),
  "position" integer NOT NULL DEFAULT 0,
  "designation" text NOT NULL,
  "unit" varchar(20) NOT NULL DEFAULT 'U',
  "quantity" numeric(12,2) NOT NULL,
  "unit_price" numeric(12,3) NOT NULL,
  "total" numeric(14,3) NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "created_by" uuid NOT NULL REFERENCES "users"("id")
);
CREATE INDEX IF NOT EXISTS "offer_line_items_offer_idx" ON "offer_line_items" ("offer_id");
