/**
 * FOR-CO-02 — business calculations of « Bordereau des prix ».
 *
 * Pure functions over plain numbers: no database, no Excel, no formatting of
 * inputs. THE ERP IS AUTHORITATIVE. Not one figure here is read back from the
 * workbook, because the source cannot be trusted to produce any of them:
 *
 * - Twelve subtotal cells are broken references — nine `=SUM(#REF!)`, two
 *   `=#REF!` and one `=#REF!+#REF!` — and four more « TOTAL PARTIEL HTVA »
 *   rows carry no formula at all.
 * - Every one of the seventeen category banner rows holds a self-referential
 *   `=F{row}*E{row}` sitting in a MERGED LABEL cell (`C24:G24` and friends).
 *   It is a leftover, not a line total; treating it as one invents seventeen
 *   priced rows that do not exist.
 * - The recap's own N° cells are formulas pointing back into the body
 *   (`=+A46`, `=A74`, …), so even the numbering is derived.
 *
 * So the tree is the model and everything above a line is summed from it:
 *
 *   line.total        = round3(quantity × unitPrice)      ← column G
 *   category.subtotal = Σ child totals                    ← « TOTAL PARTIEL HTVA »
 *   section.subtotal  = Σ (categories + direct lines)     ← « TOTAL PARTIEL I./II. »
 *   totalHtva         = Σ section subtotals
 *   totalVat          = round3(totalHtva × vatRate)
 *   totalTtc          = totalHtva + totalVat              ← « la somme T.T.C de : … »
 *
 * Rounding is half-away-from-zero at three decimals — millimes, which is what
 * the document's own wording asks for (« … Dinars, … Millimes ») and what every
 * `numeric(_, 3)` column in this schema stores. It is applied at each stored
 * level, so a subtotal shown to a client is the exact sum of the rounded lines
 * printed above it rather than a figure that disagrees with them by a millime.
 *
 * VAT is never inferred. The workbook contains no rate anywhere — only the
 * labels « HTVA » and « T.T.C » — so `vatRate` arrives from the offer, which
 * takes it from `system_settings` for a new document and keeps 0 for every
 * document created before VAT support existed.
 */

/** A section or category holds no figures; only `item` and `spec` are priced. */
export type BordereauLineType = 'section' | 'category' | 'item' | 'spec'

export type BordereauCalcNode = {
  lineType: BordereauLineType
  /** Null on headers, and on a priceable line nobody has priced yet. */
  quantity: number | null
  unitPrice: number | null
  children: BordereauCalcNode[]
}

export type BordereauNodeTotals = {
  /** `round3(quantity × unitPrice)` for a priced line; the sum of children otherwise. */
  total: number
  /** True when this node's own quantity and unit price are both present. */
  priced: boolean
  /** Priceable descendants (`item` + `spec`), this node included when it is one. */
  lineCount: number
  /** Priceable descendants that actually carry both figures. */
  pricedCount: number
}

/**
 * Millimes, half away from zero.
 *
 * `Math.round` rounds −0.0005 to −0.000 and 0.0005 to 0.001, which is
 * half-UP: two symmetric amounts would not round symmetrically. Prices are
 * never negative here, but a rounding helper that behaves differently either
 * side of zero is a trap for the next caller, so the sign is handled.
 */
export function round3(n: number): number {
  if (!Number.isFinite(n)) return 0
  const scaled = n * 1000
  // 1e-9 absorbs binary representation error: 1.0005 * 1000 is 1000.4999…,
  // which would otherwise round down and contradict the printed value.
  const rounded = Math.sign(scaled) * Math.round(Math.abs(scaled) + 1e-9)
  return rounded / 1000
}

/** `quantity × unitPrice`, or null when either figure is missing. */
export function lineTotal(
  quantity: number | null | undefined,
  unitPrice: number | null | undefined,
): number | null {
  if (quantity === null || quantity === undefined) return null
  if (unitPrice === null || unitPrice === undefined) return null
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return null
  return round3(quantity * unitPrice)
}

/**
 * Totals for one node and, recursively, its subtree.
 *
 * A priceable node with children — which the source has none of today, but the
 * tree permits — totals its own figures AND its children, so nothing can be
 * lost by a later edit that nests a line under another.
 */
export function computeNode(node: BordereauCalcNode): BordereauNodeTotals {
  const own = lineTotal(node.quantity, node.unitPrice)
  const isPriceable = node.lineType === 'item' || node.lineType === 'spec'

  let total = own ?? 0
  let lineCount = isPriceable ? 1 : 0
  let pricedCount = isPriceable && own !== null ? 1 : 0

  for (const child of node.children) {
    const t = computeNode(child)
    total += t.total
    lineCount += t.lineCount
    pricedCount += t.pricedCount
  }

  return { total: round3(total), priced: own !== null, lineCount, pricedCount }
}

export type BordereauSectionTotals = {
  /** As printed by the sheet: 'I.', 'II.'. */
  sourceCode: string | null
  designation: string
  subtotal: number
  lineCount: number
  pricedCount: number
}

export type BordereauTotals = {
  /** Σ section subtotals — the « TOTAL GENERAL ». */
  totalHtva: number
  /** Fraction, not percent: 0.19 is 19 %. */
  vatRate: number
  totalVat: number
  totalTtc: number
  /** Priceable lines in the whole document. */
  lineCount: number
  /** Of those, how many carry both a quantity and a unit price. */
  pricedCount: number
  sectionCount: number
  categoryCount: number
  /** « RECAPITULATIF GENERAL », generated — never a stored duplicate. */
  sections: BordereauSectionTotals[]
}

export type BordereauCalcSection = BordereauCalcNode & {
  sourceCode: string | null
  designation: string
}

/**
 * The whole document. `sections` are the roots of the tree; a flat legacy
 * offer whose lines have no section parent is handled by the caller passing
 * those lines as a single anonymous root, so the old flat bordereau still
 * totals exactly as `syncOfferAmount()` totalled it.
 */
export function computeBordereau(input: {
  vatRate: number
  sections: BordereauCalcSection[]
}): BordereauTotals {
  const vatRate = Number.isFinite(input.vatRate) && input.vatRate > 0 ? input.vatRate : 0

  const sections: BordereauSectionTotals[] = []
  let totalHtva = 0
  let lineCount = 0
  let pricedCount = 0
  let categoryCount = 0

  const countCategories = (n: BordereauCalcNode): number =>
    (n.lineType === 'category' ? 1 : 0) + n.children.reduce((s, c) => s + countCategories(c), 0)

  for (const section of input.sections) {
    const t = computeNode(section)
    sections.push({
      sourceCode: section.sourceCode,
      designation: section.designation,
      subtotal: t.total,
      lineCount: t.lineCount,
      pricedCount: t.pricedCount,
    })
    totalHtva += t.total
    lineCount += t.lineCount
    pricedCount += t.pricedCount
    categoryCount += countCategories(section)
  }

  totalHtva = round3(totalHtva)
  const totalVat = round3(totalHtva * vatRate)

  return {
    totalHtva,
    vatRate,
    totalVat,
    totalTtc: round3(totalHtva + totalVat),
    lineCount,
    pricedCount,
    sectionCount: input.sections.length,
    categoryCount,
    sections,
  }
}

// ─── Payment milestones ──────────────────────────────────────────────────────

export type MilestoneCalcInput = {
  label: string
  /** Percent, not fraction: 50 is 50 %. */
  percentage: number
  basis: 'htva' | 'ttc'
}

export type MilestoneTotals = MilestoneCalcInput & {
  amount: number
}

export type MilestoneSummary = {
  milestones: MilestoneTotals[]
  /** Σ percentages. The workbook's 50 + 30 + 20 must come to exactly 100. */
  totalPercentage: number
  /** Σ amounts — equal to the basis when the percentages complete. */
  totalAmount: number
  /** False when the percentages do not sum to 100 within a thousandth. */
  complete: boolean
}

/**
 * Milestone amounts, with the rounding residue absorbed by the LAST milestone
 * on each basis rather than left to disappear.
 *
 * 33,333 % of 100 TND three times is 33,333 × 3 = 99,999: a millime short of
 * the total the client is asked to pay. Giving the shortfall to the final
 * instalment is the ordinary commercial convention and keeps
 * `Σ milestone amounts === basis` an invariant the tests can assert.
 *
 * Only milestones whose percentages actually complete to 100 are adjusted;
 * an incomplete plan is left showing its true, incomplete arithmetic instead
 * of being silently balanced into looking finished.
 */
export function computeMilestones(
  milestones: MilestoneCalcInput[],
  totals: { totalHtva: number; totalTtc: number },
): MilestoneSummary {
  const basisAmount = (basis: 'htva' | 'ttc') =>
    basis === 'htva' ? totals.totalHtva : totals.totalTtc

  const computed: MilestoneTotals[] = milestones.map((m) => ({
    ...m,
    amount: round3(basisAmount(m.basis) * (m.percentage / 100)),
  }))

  const totalPercentage = round3(milestones.reduce((s, m) => s + m.percentage, 0))
  const complete = Math.abs(totalPercentage - 100) < 1e-3

  if (complete) {
    // Per basis, so a plan mixing HTVA and TTC milestones is not "corrected"
    // by moving a residue between two different totals.
    for (const basis of ['htva', 'ttc'] as const) {
      const indices = computed
        .map((m, i) => (m.basis === basis ? i : -1))
        .filter((i) => i >= 0)
      if (indices.length === 0) continue
      const share = round3(
        milestones.filter((m) => m.basis === basis).reduce((s, m) => s + m.percentage, 0),
      )
      // Only a group that is itself the whole 100 % can absorb a residue; a
      // partial group has no target amount to reconcile against.
      if (Math.abs(share - 100) >= 1e-3) continue
      const target = basisAmount(basis)
      const sum = round3(indices.reduce((s, i) => s + computed[i].amount, 0))
      const residue = round3(target - sum)
      if (residue !== 0) {
        const last = indices[indices.length - 1]
        computed[last] = { ...computed[last], amount: round3(computed[last].amount + residue) }
      }
    }
  }

  return {
    milestones: computed,
    totalPercentage,
    totalAmount: round3(computed.reduce((s, m) => s + m.amount, 0)),
    complete,
  }
}

// ─── Coercion and formatting ─────────────────────────────────────────────────

/** `numeric` columns arrive as strings from pg. Absent stays absent. */
export function numOrNull(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

export function num(v: string | number | null | undefined, fallback = 0): number {
  return numOrNull(v) ?? fallback
}

/** Money at the document's three-decimal precision; absent renders as an em dash. */
export function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

/** Quantities: up to three decimals, no trailing zeros. */
export function formatQuantity(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 3 })
}

/** A VAT fraction as a percentage: 0.19 → « 19 % ». */
export function formatVatRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) return '—'
  return `${(rate * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`
}
