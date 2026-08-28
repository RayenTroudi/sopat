-- Migration 0032: FOR-AC-10 « Suivi d'approvisionnement de chantier ».
--
-- The workbook is one sheet with three column groups sharing the same rows:
--
--   A..E  Suivi prévisionnel / Devis validé par le client  → supply_items
--   F..I  Suivi réel (date, fournisseur, N° BL, quantité)  → supply_deliveries
--   R..W  Suivi d'achat (fournisseur, qté, PU, PT, TTC)    → supply_purchases
--   L     P.U.H.T réel — merged across the planned line's row span, so it is
--         ONE value per planned line, not one per delivery.
--
-- Everything else in the sheet (E, J, K, M, N, O, P, Q, the row-36 totals and
-- the four header indicators) is a formula over those inputs and is therefore
-- computed at read time, never stored. Storing a variance would let it drift
-- from the delivery rows it summarises.
--
-- The header block is NOT duplicated here: project reference, name, client,
-- start date and end date already live on `projects`. The workbook's "En cours"
-- end date is exactly `projects.actual_delivery_date IS NULL`.
--
-- Suppliers are referenced, never re-created: supplier_id FKs `suppliers`, and
-- supplier_label carries the free-text name for a supplier not yet in the
-- register (the workbook writes "SAMI" and "ABDESATTAR", which are not rows of
-- FOR-AC-11). Column H is the SUPPLIER's own delivery-note number, so it is
-- stored as text; delivery_note_id optionally links to a SOPAT bon de livraison
-- when the register line corresponds to one captured in the application.
--
-- Purchase lines are deliberately not folded into `purchase_orders`: that table
-- requires purchase_date, purchased_by and a status, and the workbook's R..W
-- group records none of them. Reusing it would mean inventing a purchase date
-- for every row.
--
-- Reversible: drop the three tables. No existing table or row is modified.

CREATE TABLE IF NOT EXISTS supply_registers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id),
  observations      text,
  dms_document_code varchar(20),
  deleted_at        timestamp,
  created_at        timestamp NOT NULL DEFAULT now(),
  updated_at        timestamp NOT NULL DEFAULT now(),
  created_by        uuid NOT NULL REFERENCES users(id)
);

-- One live register per project; a soft-deleted one must not block a new one.
CREATE UNIQUE INDEX IF NOT EXISTS supply_registers_project_uidx
  ON supply_registers (project_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS supply_items (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id             uuid NOT NULL REFERENCES supply_registers(id) ON DELETE CASCADE,
  position                integer NOT NULL DEFAULT 0,
  designation             text NOT NULL,
  -- Column B / S: unit *or* specification ("m³", "Sac", "Pot 30", " h= 2 m").
  -- Free text on purpose — the workbook does not use a controlled unit list.
  norme                   varchar(100),
  planned_quantity        numeric(12,3) NOT NULL DEFAULT 0,
  planned_unit_price_htva numeric(12,3) NOT NULL DEFAULT 0,
  -- Column L. NULL means "same as planned" — which is what the workbook's
  -- =D10 formula expresses. A value here is a deliberate override and is what
  -- makes columns M and N non-zero.
  actual_unit_price_htva  numeric(12,3),
  observations            text,
  created_at              timestamp NOT NULL DEFAULT now(),
  updated_at              timestamp NOT NULL DEFAULT now(),
  created_by              uuid NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS supply_items_register_idx ON supply_items (register_id);

CREATE TABLE IF NOT EXISTS supply_deliveries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id          uuid NOT NULL REFERENCES supply_items(id) ON DELETE CASCADE,
  position         integer NOT NULL DEFAULT 0,
  -- Nullable: rows 17, 18, 23, 24, 28 record a delivered quantity with no
  -- date, supplier or BL. Requiring them would force fabricated values.
  delivery_date    date,
  supplier_id      uuid REFERENCES suppliers(id),
  supplier_label   varchar(255),
  bl_number        varchar(100),
  delivery_note_id uuid REFERENCES delivery_notes(id),
  quantity         numeric(12,3) NOT NULL DEFAULT 0,
  created_at       timestamp NOT NULL DEFAULT now(),
  updated_at       timestamp NOT NULL DEFAULT now(),
  created_by       uuid NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS supply_deliveries_item_idx ON supply_deliveries (item_id);
CREATE INDEX IF NOT EXISTS supply_deliveries_supplier_idx ON supply_deliveries (supplier_id);

CREATE TABLE IF NOT EXISTS supply_purchases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         uuid NOT NULL REFERENCES supply_items(id) ON DELETE CASCADE,
  position        integer NOT NULL DEFAULT 0,
  supplier_id     uuid REFERENCES suppliers(id),
  supplier_label  varchar(255),
  norme           varchar(100),
  quantity        numeric(12,3) NOT NULL DEFAULT 0,
  unit_price_htva numeric(12,3) NOT NULL DEFAULT 0,
  -- Column W is labelled TTC but computes =V, i.e. no VAT. Default 0 keeps
  -- that behaviour byte-for-byte while making the column mean something.
  vat_rate        numeric(5,4) NOT NULL DEFAULT 0,
  created_at      timestamp NOT NULL DEFAULT now(),
  updated_at      timestamp NOT NULL DEFAULT now(),
  created_by      uuid NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS supply_purchases_item_idx ON supply_purchases (item_id);
CREATE INDEX IF NOT EXISTS supply_purchases_supplier_idx ON supply_purchases (supplier_id);
