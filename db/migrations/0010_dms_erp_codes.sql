-- db/migrations/0010_dms_erp_codes.sql
-- Adds dms_document_code to ERP tables for fast display without DMS join

ALTER TABLE non_conformances    ADD COLUMN IF NOT EXISTS dms_document_code varchar(20);
ALTER TABLE corrective_actions  ADD COLUMN IF NOT EXISTS dms_document_code varchar(20);
ALTER TABLE purchase_orders     ADD COLUMN IF NOT EXISTS dms_document_code varchar(20);
ALTER TABLE projects            ADD COLUMN IF NOT EXISTS dms_document_code varchar(20);
