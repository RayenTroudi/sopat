/**
 * FOR-AC-10 — business calculations of « Suivi d'approvisionnement de chantier ».
 *
 * Pure functions over plain numbers: no database, no formatting of inputs, no
 * rounding of intermediates. The register never stores a derived value, so every
 * figure the UI and the export show comes from here and recomputes when a
 * delivery or a price is corrected.
 *
 * Excel column → function, with the workbook's own formula quoted:
 *
 *   E  Prix total HTVA      =D*C                  plannedTotalHtva
 *   I  QUANTITE (réel)      per delivery row      deliveredQuantity (Σ)
 *   J  Ecart de Quantité    =SUM(I…)-C            quantityVariance
 *   K  % Ecart Quantité     =J/C                  quantityVariancePct
 *   L  P.U.H.T réel         =D (overridable)      actualUnitPriceHtva
 *   M  Ecart PU             =L-D                  unitPriceVariance
 *   N  % Ecart PU           =L/D                  unitPriceVariancePct ← corrected
 *   O  P.TOTAL HTVA réel    =L*SUM(I…)            actualTotalHtva
 *   P  Ecart PT             =O-E                  totalVariance
 *   Q  % Ecart PT           =P/E                  totalVariancePct
 *   V  Prix total d'achat   =U*T                  purchaseTotalHtva
 *   W  … TTC                =V                    purchaseTotalTtc (vatRate 0)
 *   G4 Coût total prév.     =SUM(E…)              plannedTotalHtva (register)
 *   G5 Coût total réel      =SUM(O…)              actualTotalHtva (register)
 *   I4 Taux de respect coût =G5/G4                costComplianceRate
 *   I5 Taux de respect qté  =AVERAGE(K…)          quantityComplianceRate ← corrected
 *
 * TWO CORRECTIONS to the source workbook, both settled business decisions.
 * Do not "restore" either of them to match the spreadsheet.
 *
 * 1. Column N. The source computes `L/D`, a ratio: an unchanged price reads
 *    100 %, contradicting column M (`L-D`, zero when unchanged) right beside
 *    it. The header says « % Ecart PU », so this is a VARIANCE:
 *        unitPriceVariancePct = (L - D) / D
 *    L and D themselves are untouched. D = 0 yields null, never Infinity.
 *
 * 2. The register's « Taux de respect de quantité ». The source averages the
 *    per-line variance percentages (`AVERAGE(K…)`), which weights a 1-unit
 *    line the same as a 300-unit line and is not a compliance rate at all.
 *    It is now OVERALL compliance:
 *        quantityComplianceRate = Σ delivered / Σ planned
 *    across the whole register. A line with no planned quantity contributes
 *    its delivered units to the numerator and 0 to the denominator, so it can
 *    never make the ratio undefined on its own; only a register whose planned
 *    total is 0 yields null.
 *
 * Division by zero is never propagated. The workbook shows #DIV/0! on the four
 * lines whose planned quantity is 0 (rows 27, 28, 29, 32) and that error leaks
 * into the header indicator I5, breaking it entirely. Here every ratio with a
 * zero denominator returns `null`, which renders as « — ».
 */

/** A ratio that is undefined when its denominator is zero — never NaN, never Infinity. */
export function safeRatio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null
  const r = numerator / denominator
  return Number.isFinite(r) ? r : null
}

export type SupplyDeliveryInput = {
  quantity: number
}

export type SupplyPurchaseInput = {
  quantity: number
  unitPriceHtva: number
  /** Fraction, not percent: 0.19 is 19 %. The workbook uses 0. */
  vatRate: number
}

export type SupplyItemInput = {
  plannedQuantity: number
  plannedUnitPriceHtva: number
  /** Column L override. `null` means "unchanged from the devis". */
  actualUnitPriceHtva: number | null
  deliveries: SupplyDeliveryInput[]
  purchases: SupplyPurchaseInput[]
}

export type PurchaseTotals = {
  totalHtva: number
  vatAmount: number
  totalTtc: number
}

export function computePurchase(p: SupplyPurchaseInput): PurchaseTotals {
  const totalHtva = p.quantity * p.unitPriceHtva
  const vatAmount = totalHtva * p.vatRate
  return { totalHtva, vatAmount, totalTtc: totalHtva + vatAmount }
}

export type SupplyItemTotals = {
  /** C — carried through so the register can total it. */ plannedQuantity: number
  /** E */ plannedTotalHtva: number
  /** Σ I */ deliveredQuantity: number
  /** J */ quantityVariance: number
  /** K — null when the planned quantity is 0 */ quantityVariancePct: number | null
  /** L, resolved */ actualUnitPriceHtva: number
  /** M */ unitPriceVariance: number
  /**
   * N — the price VARIANCE `(L - D) / D`, which is what the column header
   * says. Null when the planned unit price is 0. The source workbook's `L/D`
   * ratio is deliberately not produced anywhere; see the note above.
   */
  unitPriceVariancePct: number | null
  /** O */ actualTotalHtva: number
  /** P */ totalVariance: number
  /** Q — null when the planned total is 0 */ totalVariancePct: number | null
  /** Σ V */ purchaseTotalHtva: number
  /** Σ (W − V) */ purchaseVatAmount: number
  /** Σ W */ purchaseTotalTtc: number
  /** Σ T */ purchasedQuantity: number
  deliveryCount: number
  purchaseCount: number
}

export function computeItem(item: SupplyItemInput): SupplyItemTotals {
  const plannedTotalHtva = item.plannedQuantity * item.plannedUnitPriceHtva

  // Σ over every delivery of the line. A line with no delivery yet contributes
  // 0, which is what the sheet shows on rows 19, 23 and 24 (fully unfulfilled).
  const deliveredQuantity = item.deliveries.reduce((s, d) => s + d.quantity, 0)
  const quantityVariance = deliveredQuantity - item.plannedQuantity

  // Column L: an absent override means the devis price still applies.
  const actualUnitPriceHtva = item.actualUnitPriceHtva ?? item.plannedUnitPriceHtva
  const unitPriceVariance = actualUnitPriceHtva - item.plannedUnitPriceHtva

  const actualTotalHtva = actualUnitPriceHtva * deliveredQuantity
  const totalVariance = actualTotalHtva - plannedTotalHtva

  const purchases = item.purchases.map(computePurchase)

  return {
    plannedQuantity: item.plannedQuantity,
    plannedTotalHtva,
    deliveredQuantity,
    quantityVariance,
    quantityVariancePct: safeRatio(quantityVariance, item.plannedQuantity),
    actualUnitPriceHtva,
    unitPriceVariance,
    unitPriceVariancePct: safeRatio(unitPriceVariance, item.plannedUnitPriceHtva),
    actualTotalHtva,
    totalVariance,
    totalVariancePct: safeRatio(totalVariance, plannedTotalHtva),
    purchaseTotalHtva: purchases.reduce((s, p) => s + p.totalHtva, 0),
    purchaseVatAmount: purchases.reduce((s, p) => s + p.vatAmount, 0),
    purchaseTotalTtc:  purchases.reduce((s, p) => s + p.totalTtc, 0),
    purchasedQuantity: item.purchases.reduce((s, p) => s + p.quantity, 0),
    deliveryCount: item.deliveries.length,
    purchaseCount: item.purchases.length,
  }
}

export type SupplyRegisterTotals = {
  /** G4 — devis validé */ plannedTotalHtva: number
  /** G5 — facturé au client */ actualTotalHtva: number
  /** G5 − G4 */ totalVariance: number
  /** I4 — null when nothing is planned */ costComplianceRate: number | null
  /** Σ of every line's planned quantity, across the register. */
  totalPlannedQuantity: number
  /** Σ of every delivery's quantity, across the register. */
  totalDeliveredQuantity: number
  /**
   * OVERALL quantity compliance: `Σ delivered / Σ planned`.
   *
   * NOT the average of the per-line variance percentages the source workbook
   * uses — that weights a 1-unit line the same as a 300-unit one, and any line
   * with a planned quantity of 0 turns the whole indicator into #DIV/0!. This
   * is a settled business decision; do not revert it to an average.
   *
   * 1.0 means delivered exactly as planned. Null only when the register's
   * planned total is 0, i.e. there is nothing to comply with.
   */
  quantityComplianceRate: number | null
  /** S36 — dépenses réelles de SOPAT */ purchaseTotalHtva: number
  purchaseVatAmount: number
  purchaseTotalTtc: number
  /** Margin between what is billed to the client and what was bought. */
  grossMargin: number
  itemCount: number
  deliveryCount: number
  purchaseCount: number
  /** Lines whose planned quantity is 0, so their own K and Q are undefined. */
  itemsWithoutPlannedQuantity: number
}

export function computeRegister(items: SupplyItemTotals[]): SupplyRegisterTotals {
  const sum = (f: (t: SupplyItemTotals) => number) => items.reduce((s, t) => s + f(t), 0)

  const plannedTotalHtva  = sum((t) => t.plannedTotalHtva)
  const actualTotalHtva   = sum((t) => t.actualTotalHtva)
  const purchaseTotalHtva = sum((t) => t.purchaseTotalHtva)

  const totalPlannedQuantity   = sum((t) => t.plannedQuantity)
  const totalDeliveredQuantity = sum((t) => t.deliveredQuantity)

  return {
    plannedTotalHtva,
    actualTotalHtva,
    totalVariance: actualTotalHtva - plannedTotalHtva,
    costComplianceRate: safeRatio(actualTotalHtva, plannedTotalHtva),
    totalPlannedQuantity,
    totalDeliveredQuantity,
    quantityComplianceRate: safeRatio(totalDeliveredQuantity, totalPlannedQuantity),
    purchaseTotalHtva,
    purchaseVatAmount: sum((t) => t.purchaseVatAmount),
    purchaseTotalTtc:  sum((t) => t.purchaseTotalTtc),
    grossMargin: actualTotalHtva - purchaseTotalHtva,
    itemCount: items.length,
    deliveryCount: sum((t) => t.deliveryCount),
    purchaseCount: sum((t) => t.purchaseCount),
    itemsWithoutPlannedQuantity: items.filter((t) => t.quantityVariancePct === null).length,
  }
}

// ─── Presentation helpers ────────────────────────────────────────────────────

/** Money, matching the workbook's `#,##0.000` format. */
export function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

/** Quantities: up to 3 decimals, no trailing zeros (the sheet shows 0,3 and 120). */
export function formatQuantity(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 3 })
}

/** A ratio as a percentage; `null` (undefined ratio) renders as an em dash. */
export function formatPercent(r: number | null | undefined, decimals = 2): string {
  if (r === null || r === undefined || !Number.isFinite(r)) return '—'
  return `${(r * 100).toLocaleString('fr-FR', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  })} %`
}

/**
 * Severity of a variance, for colouring. Positive means "more than planned":
 * over-delivery and over-spend alike, which is what the sheet's red figures
 * signal. Exactly on plan is neutral.
 */
export type VarianceTone = 'neutral' | 'over' | 'under'

export function varianceTone(v: number | null | undefined): VarianceTone {
  if (v === null || v === undefined || !Number.isFinite(v) || v === 0) return 'neutral'
  return v > 0 ? 'over' : 'under'
}

/** Parses a decimal column (Drizzle returns `numeric` as string) to a number. */
export function num(v: string | number | null | undefined, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

/** Same, but preserving "absent" as null — used for the column-L override. */
export function numOrNull(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}
