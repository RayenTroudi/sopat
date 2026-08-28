-- Migration 0033: link a FOR-AC-10 purchase line to the bon de commande that
-- already accounts for it, so procurement spend is counted exactly once.
--
-- Why this column is technically required
-- ---------------------------------------
-- Project budget consumption is `Σ purchase_orders.total_cost + Σ approved
-- extra_expenses.amount` (see src/lib/notifications.ts and src/lib/db/achat.ts).
-- FOR-AC-10 purchase lines were not part of that sum, and nothing connected
-- them to `purchase_orders`: no foreign key, no shared reference, no code path
-- writing one from the other. They are a disjoint set of records describing
-- real money spent on a chantier, so they belong in the total.
--
-- But the same physical purchase CAN legitimately be recorded twice — once as
-- a bon de commande and once on the register — and without an explicit link
-- there is no way to tell that from two genuinely separate purchases. Guessing
-- (by supplier, amount or date) would silently under- or over-count a
-- chantier's cost. This column makes the answer data rather than inference:
--
--   purchase_order_id IS NULL     → not represented elsewhere; counts toward
--                                   budget consumption.
--   purchase_order_id IS NOT NULL → already counted via purchase_orders; the
--                                   register line is excluded from the sum.
--
-- Nullable, additive, and defaulting to NULL, so every existing row keeps
-- exactly the meaning it had. No existing table or row is modified.
--
-- Reversible: drop the column and its index.

ALTER TABLE supply_purchases
  ADD COLUMN IF NOT EXISTS purchase_order_id uuid REFERENCES purchase_orders(id);

CREATE INDEX IF NOT EXISTS supply_purchases_purchase_order_idx
  ON supply_purchases (purchase_order_id);
