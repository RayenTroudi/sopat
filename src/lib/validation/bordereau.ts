/**
 * Runtime schemas for FOR-CO-02 « Bordereau des prix ».
 *
 * The document is edited and imported as a whole, so a PUT body is the entire
 * tree. That makes validation the only thing between a client payload and four
 * tables, hence `.strict()` everywhere: an unexpected key is a 400 rather than
 * being silently dropped.
 *
 * Two deliberate permissions:
 *
 * - `quantity` and `unitPrice` are NULLABLE on a priceable line. An unpriced
 *   line is the normal state of a bordereau in preparation, and the source
 *   template ships with almost every figure empty. Forcing a 0 would put a
 *   price on the document that nobody entered.
 * - `unit` is free text. The sheet writes both "P" and "p", plus "Ens", "M³",
 *   "M²", "Sac" and "TONNE"; a controlled list would change the business
 *   meaning of a line a client signed.
 */
import { z } from 'zod'

/** numeric(12,3) — the ceiling of the money and quantity columns. */
const MAX_DECIMAL_12_3 = 999_999_999.999

const amount = z
  .number()
  .finite()
  .min(0, 'Valeur négative interdite')
  .max(MAX_DECIMAL_12_3, 'Valeur hors limites')

const uuid = z.string().uuid()

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ')

/** Trims, and turns an emptied text input into a real NULL rather than "". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Texte trop long (max ${max} caractères)`)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()

export const bordereauLineTypeSchema = z.enum(['section', 'category', 'item', 'spec'])

/**
 * The tree, four levels deep at most.
 *
 * The source is three (section → category → line); the fourth is headroom for
 * a sub-grouping a future revision might introduce, and stops a hand-crafted
 * payload from recursing without bound.
 */
const MAX_DEPTH = 4

type LineInput = {
  lineType: 'section' | 'category' | 'item' | 'spec'
  sourceCode?: string | null
  displayCode?: string | null
  designation: string
  description?: string | null
  norme?: string | null
  unit?: string | null
  quantity?: number | null
  unitPrice?: number | null
  plantSpeciesId?: string | null
  decorativeMaterialId?: string | null
  sourceRow?: number | null
  children?: LineInput[]
}

const lineShape = {
  lineType: bordereauLineTypeSchema,
  sourceCode: optionalText(20),
  displayCode: optionalText(20),
  designation: z.string().trim().min(1, 'Désignation obligatoire').max(4000),
  description: optionalText(20000),
  norme: optionalText(255),
  unit: optionalText(20),
  quantity: amount.nullable().optional(),
  unitPrice: amount.nullable().optional(),
  plantSpeciesId: uuid.nullable().optional(),
  decorativeMaterialId: uuid.nullable().optional(),
  sourceRow: z.number().int().min(0).max(1_048_576).nullable().optional(),
}

function lineSchemaAtDepth(depth: number): z.ZodType<LineInput> {
  if (depth >= MAX_DEPTH) {
    return z.object({ ...lineShape, children: z.tuple([]).optional() }).strict() as z.ZodType<LineInput>
  }
  return z
    .object({
      ...lineShape,
      children: z.array(z.lazy(() => lineSchemaAtDepth(depth + 1))).max(1000).optional(),
    })
    .strict() as z.ZodType<LineInput>
}

export const bordereauLineSchema = lineSchemaAtDepth(1)

export const bordereauMilestoneSchema = z
  .object({
    label: z.string().trim().min(1, 'Libellé obligatoire').max(255),
    /** Percent, not fraction: 50 is 50 %. */
    percentage: z.number().finite().min(0).max(100, 'Pourcentage hors limites'),
    basis: z.enum(['htva', 'ttc']).optional(),
    triggerEvent: z.enum(['confirmation', 'during_works', 'completion', 'other']).optional(),
    dueDate: isoDate.nullable().optional(),
    notes: optionalText(2000),
  })
  .strict()

/** Full-document replacement body. */
export const bordereauReplaceSchema = z
  .object({
    lines: z.array(bordereauLineSchema).max(200, 'Trop de sections (max 200)'),
    milestones: z.array(bordereauMilestoneSchema).max(20).optional(),
  })
  .strict()

export const bordereauHeaderSchema = z
  .object({
    offerDate: isoDate.nullable().optional(),
    siteLocation: optionalText(255),
    maitreDouvrage: optionalText(255),
    projectReferenceText: optionalText(100),
    validityDays: z.number().int().min(0).max(3650).nullable().optional(),
    /** Fraction, not percent: 0.19 is 19 %. numeric(5,4) bounds it. */
    vatRate: z.number().finite().min(0).max(9.9999).optional(),
  })
  .strict()

export const bordereauVersionSchema = z
  .object({
    action: z.literal('create'),
    label: optionalText(60),
    changeSummary: z.string().trim().min(1, 'Motif obligatoire').max(2000),
  })
  .strict()

export const bordereauApproveSchema = z
  .object({
    action: z.literal('approve'),
    versionId: uuid,
  })
  .strict()

export const bordereauReopenSchema = z
  .object({
    action: z.literal('reopen'),
    reason: z.string().trim().min(1, 'Motif obligatoire').max(2000),
  })
  .strict()

export const bordereauVersionActionSchema = z.union([
  bordereauVersionSchema,
  bordereauApproveSchema,
  bordereauReopenSchema,
])

/**
 * Confirming a project's contract amount.
 *
 * `approvedAmount` is what the human decided; `suggestedAmount` is what the
 * won offer proposed. Both are recorded, so a confirmation that departed from
 * the offer is visible rather than merely absent.
 */
export const contractAmountSchema = z
  .object({
    offerId: uuid,
    suggestedAmount: amount,
    approvedAmount: amount,
  })
  .strict()

export type BordereauReplacePayload = z.infer<typeof bordereauReplaceSchema>
export type BordereauHeaderPayload = z.infer<typeof bordereauHeaderSchema>
