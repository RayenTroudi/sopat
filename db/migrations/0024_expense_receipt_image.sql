-- Photo du justificatif scanné depuis l'app mobile (URL Cloudinary),
-- affichée dans le panneau admin à côté des données extraites par OCR.

ALTER TABLE "extra_expenses" ADD COLUMN IF NOT EXISTS "receipt_image_url" varchar(500);
