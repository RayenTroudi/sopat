-- Add dms_document_code to clients, suppliers, and audit_logs
-- These entities now participate in the ISO 9001 document coding system:
--   clients   → LIS-CO-NN  (Liste Commerciale)
--   suppliers → LIS-AC-NN  (Liste Achat / fournisseurs agréés)
--   audit_logs → FOR-MI-NN (Formulaire Management Intégré)

ALTER TABLE "clients"    ADD COLUMN "dms_document_code" varchar(20);
ALTER TABLE "suppliers"  ADD COLUMN "dms_document_code" varchar(20);
ALTER TABLE "audit_logs" ADD COLUMN "dms_document_code" varchar(20);
