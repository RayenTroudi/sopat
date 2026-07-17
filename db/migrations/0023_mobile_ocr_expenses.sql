-- Dépenses créées depuis l'app mobile via OCR : traçabilité des valeurs
-- suggérées par l'IA (texte brut + champs proposés) vs valeurs validées.

ALTER TABLE "extra_expenses" ADD COLUMN IF NOT EXISTS "source" varchar(20) NOT NULL DEFAULT 'web';
ALTER TABLE "extra_expenses" ADD COLUMN IF NOT EXISTS "ocr_raw_text" text;
ALTER TABLE "extra_expenses" ADD COLUMN IF NOT EXISTS "ocr_suggested" jsonb;
