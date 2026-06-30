-- Migration 0013: Align suppliers with FOR-AC-11 evaluation structure
-- Adds: supplier_code (FR-001), registre_commerce, selection/evaluation scores,
--       classification (A/B/C), next evaluation dates, expanded categories.

-- 1. Expand supplier_category enum with real categories from FOR-AC-11
ALTER TYPE "supplier_category" ADD VALUE IF NOT EXISTS 'plantes';
ALTER TYPE "supplier_category" ADD VALUE IF NOT EXISTS 'terre_vegetale';
ALTER TYPE "supplier_category" ADD VALUE IF NOT EXISTS 'gazon';
ALTER TYPE "supplier_category" ADD VALUE IF NOT EXISTS 'matiere_decorative';
ALTER TYPE "supplier_category" ADD VALUE IF NOT EXISTS 'bac_fleurs';
ALTER TYPE "supplier_category" ADD VALUE IF NOT EXISTS 'parc_auto';
ALTER TYPE "supplier_category" ADD VALUE IF NOT EXISTS 'equipements_bureautique';
ALTER TYPE "supplier_category" ADD VALUE IF NOT EXISTS 'services';
ALTER TYPE "supplier_category" ADD VALUE IF NOT EXISTS 'sous_traitants';

-- 2. Add new columns to suppliers
ALTER TABLE "suppliers"
  ADD COLUMN IF NOT EXISTS "supplier_code"      varchar(20),
  ADD COLUMN IF NOT EXISTS "registre_commerce"  varchar(100),
  ADD COLUMN IF NOT EXISTS "selection_score"    numeric(5, 2),
  ADD COLUMN IF NOT EXISTS "selection_class"    char(1),
  ADD COLUMN IF NOT EXISTS "evaluation_score"   numeric(5, 2),
  ADD COLUMN IF NOT EXISTS "evaluation_class"   char(1),
  ADD COLUMN IF NOT EXISTS "iso_class"          char(1),
  ADD COLUMN IF NOT EXISTS "next_eval_planned"  varchar(50),
  ADD COLUMN IF NOT EXISTS "next_eval_done"     varchar(50);

-- 3. Make supplier_code unique where not null
CREATE UNIQUE INDEX IF NOT EXISTS "suppliers_supplier_code_idx"
  ON "suppliers"("supplier_code")
  WHERE "supplier_code" IS NOT NULL;

-- 4. Expand supplier_evaluations with per-criteria columns (FOR-AC-11 criteria)
ALTER TABLE "supplier_evaluations"
  ADD COLUMN IF NOT EXISTS "evaluation_type"          varchar(20) DEFAULT 'selection',
  ADD COLUMN IF NOT EXISTS "taux_couverture"          smallint,
  ADD COLUMN IF NOT EXISTS "niveau_qualite"           smallint,
  ADD COLUMN IF NOT EXISTS "prix"                     smallint,
  ADD COLUMN IF NOT EXISTS "delai_livraison"          smallint,
  ADD COLUMN IF NOT EXISTS "mode_livraison"           smallint,
  ADD COLUMN IF NOT EXISTS "modalites_paiement"       smallint,
  ADD COLUMN IF NOT EXISTS "proximite_livraison"      smallint,
  ADD COLUMN IF NOT EXISTS "notoriete_reference"      smallint,
  ADD COLUMN IF NOT EXISTS "respect_exigences"        smallint,
  ADD COLUMN IF NOT EXISTS "respect_prix"             smallint,
  ADD COLUMN IF NOT EXISTS "respect_delai"            smallint,
  ADD COLUMN IF NOT EXISTS "reactivite"               smallint,
  ADD COLUMN IF NOT EXISTS "assistance_technique"     smallint,
  ADD COLUMN IF NOT EXISTS "documentation_technique"  smallint,
  ADD COLUMN IF NOT EXISTS "computed_score"           numeric(5, 2),
  ADD COLUMN IF NOT EXISTS "classification"           char(1);
