/**
 * Runtime schemas for FOR-AC-10 « Suivi d'approvisionnement de chantier ».
 *
 * The register is edited as a whole grid, so the PUT body is the complete list
 * of planned lines with their deliveries and purchases. That makes validation
 * the only thing standing between a client payload and four tables, hence:
 *
 * - `.strict()` everywhere, so an unexpected key is a 400 rather than being
 *   silently dropped. A typo in a field name should fail loudly here, not
 *   surface later as a column that stopped being written.
 * - money and quantities are finite and non-negative; prices are capped to the
 *   column's numeric(12,3) so a payload cannot fail at the database instead.
 * - dates are ISO calendar days, matching the `date` column, and stay strings:
 *   parsing them to Date and back would shift them by the server's offset.
 *
 * Quantities are allowed to be 0 — the workbook has planned lines at 0 (rows
 * 27, 28, 29, 32) and deliveries of 0 — but never negative: a negative arrival
 * is a return, which is FOR-AC-05, a different form.
 */
import { z } from 'zod'

/** numeric(12,3) — the largest value the money and quantity columns hold. */
const MAX_DECIMAL_12_3 = 999_999_999.999

const amount = z
  .number()
  .finite()
  .min(0, 'Valeur négative interdite')
  .max(MAX_DECIMAL_12_3, 'Valeur hors limites')

/**
 * VAT, as a fraction rather than a percentage: 0.19 is 19 %. numeric(5,4)
 * bounds it to 0 → 9.9999. Never hardcoded to a country rate — the applicable
 * rate is entered per purchase.
 */
const vatRate = z
  .number()
  .finite()
  .min(0, 'Taux de TVA négatif interdit')
  .max(9.9999, 'Taux de TVA hors limites')

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ')

const uuid = z.string().uuid()

/** Trims, and turns an emptied text input into a real NULL rather than "". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Texte trop long (max ${max} caractères)`)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()

export const supplyDeliverySchema = z
  .object({
    id:             uuid.optional(),
    deliveryDate:   isoDate.nullable().optional(),
    supplierId:     uuid.nullable().optional(),
    supplierLabel:  optionalText(255),
    blNumber:       optionalText(100),
    deliveryNoteId: uuid.nullable().optional(),
    quantity:       amount,
  })
  .strict()

export const supplyPurchaseSchema = z
  .object({
    id:            uuid.optional(),
    supplierId:    uuid.nullable().optional(),
    supplierLabel: optionalText(255),
    norme:         optionalText(100),
    quantity:      amount,
    unitPriceHtva: amount,
    vatRate:       vatRate.optional(),
    // Names the bon de commande that already accounts for this purchase, so
    // the amount is not counted twice in the project's budget consumption.
    purchaseOrderId: uuid.nullable().optional(),
  })
  .strict()

export const supplyItemSchema = z
  .object({
    id:                   uuid.optional(),
    designation:          z.string().trim().min(1, 'Désignation obligatoire').max(2000),
    norme:                optionalText(100),
    plannedQuantity:      amount,
    plannedUnitPriceHtva: amount,
    // null is meaningful: "no override", i.e. the devis price still applies.
    actualUnitPriceHtva:  amount.nullable().optional(),
    observations:         optionalText(4000),
    deliveries:           z.array(supplyDeliverySchema).max(200).default([]),
    purchases:            z.array(supplyPurchaseSchema).max(200).default([]),
  })
  .strict()

/** Full-grid replacement body. */
export const supplyItemsSchema = z
  .object({
    items: z.array(supplyItemSchema).max(500, 'Trop de lignes (max 500)'),
  })
  .strict()

export const supplyObservationsSchema = z
  .object({
    observations: optionalText(4000),
  })
  .strict()

export type SupplyItemPayload = z.infer<typeof supplyItemSchema>
export type SupplyItemsPayload = z.infer<typeof supplyItemsSchema>
