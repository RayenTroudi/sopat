/**
 * FOR-AC-10 import — parsing and safety analysis.
 *
 * Why this is preview-then-commit rather than a one-shot upload
 * ------------------------------------------------------------
 * The workbook carries no stable identifier of any kind: no line id, no row
 * key, and its project reference uses a different scheme from the application
 * (`RE--075/24` against `SOPAT-2025-004`), so it cannot even name its own
 * target project. Matching imported rows onto existing register lines would
 * therefore have to guess — on designation, on position, or on wording — and a
 * wrong guess silently overwrites a chantier's cost record.
 *
 * So the import never merges. It parses into a preview the user reads first,
 * and commits only as a whole-register replacement into a register the user
 * explicitly named, refusing by default to overwrite one that already has
 * lines. That is the safest interpretation available and it fabricates nothing.
 *
 * Rules that hold throughout:
 *
 * - No supplier is ever created. A name is matched against the existing
 *   FOR-AC-11 register, accent- and case-insensitively; anything unmatched is
 *   kept as free text and reported. The source proves why: it writes "LES
 *   PEPINIERES DE CARTHAGE" in one column and "LES PEP DE CARTHAGE" in another
 *   for what is evidently the same supplier, and auto-creation would either
 *   duplicate it or bind the wrong one.
 * - No value is invented. An unreadable date, a formula with no cached result,
 *   a missing quantity — each becomes null plus a warning, never a default.
 * - Derived columns (E, J, K, M, N, O, P, Q, V, W) are never read. They are
 *   recomputed from the source columns, so an incorrect formula in the file
 *   cannot enter the database.
 */
import ExcelJS from 'exceljs'
import { db } from '@/db'
import { suppliers } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { supplyItemsSchema } from '@/lib/validation/supply'
import type { SupplyItemInputRow } from '@/lib/db/supply'

export const IMPORT_MAX_BYTES = 5 * 1024 * 1024

/** Accent-, case- and spacing-insensitive key for matching header and supplier text. */
function normalize(v: string): string {
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

/**
 * Columns are located by their header text, not by fixed letters, so a file
 * whose columns were nudged sideways still imports. Several headers are
 * ambiguous across the sheet's three groups (« Norme », « Quantité » and
 * « Fournisseurs » each appear twice), so they are resolved by which group
 * band they fall under rather than by name alone.
 */
type ColumnMap = {
  designation: number
  norme: number
  plannedQuantity: number
  plannedUnitPrice: number
  actualUnitPrice: number
  deliveryDate: number
  deliverySupplier: number
  blNumber: number
  deliveryQuantity: number
  purchaseSupplier: number
  purchaseNorme: number
  purchaseQuantity: number
  purchaseUnitPrice: number
  observations: number
}

export type ImportWarning = { row: number | null; message: string }

export type ImportPreviewLine = {
  row: number
  designation: string
  norme: string | null
  plannedQuantity: number
  plannedUnitPriceHtva: number
  actualUnitPriceHtva: number | null
  observations: string | null
  deliveries: {
    deliveryDate: string | null
    supplierId: string | null
    supplierLabel: string | null
    supplierName: string | null
    /** true when the name was found in the supplier register. */
    supplierMatched: boolean
    blNumber: string | null
    quantity: number
  }[]
  purchases: {
    supplierId: string | null
    supplierLabel: string | null
    supplierName: string | null
    supplierMatched: boolean
    norme: string | null
    quantity: number
    unitPriceHtva: number
    vatRate: number
  }[]
}

export type ImportPreview = {
  ok: boolean
  /** Blocking problems. When non-empty, nothing may be committed. */
  errors: ImportWarning[]
  /** Non-blocking observations the user should read before committing. */
  warnings: ImportWarning[]
  lines: ImportPreviewLine[]
  stats: {
    lineCount: number
    deliveryCount: number
    purchaseCount: number
    matchedSuppliers: number
    unmatchedSupplierNames: string[]
  }
  /** The « Réf Projet » found in the sheet header, for the user to eyeball. */
  workbookProjectReference: string | null
  workbookProjectName: string | null
  workbookClientName: string | null
}

// ─── Cell readers ────────────────────────────────────────────────────────────

/**
 * True for the lower cells of a vertical merge.
 *
 * ExcelJS returns the MASTER's value when a merged slave is read, so without
 * this a planned line merged down over six delivery rows is re-read as six
 * separate planned lines — which is exactly the shape the source workbook uses.
 * A slave carries no value of its own, so it reads as empty.
 */
function isMergedContinuation(cell: ExcelJS.Cell): boolean {
  return cell.isMerged && cell.master?.address !== cell.address
}

/** A cell's effective value: a formula's cached result, else its literal. */
function cellValue(cell: ExcelJS.Cell): unknown {
  if (isMergedContinuation(cell)) return null
  const v = cell.value
  if (v && typeof v === 'object') {
    if ('formula' in v || 'sharedFormula' in v) {
      return (v as { result?: unknown }).result ?? null
    }
    if ('richText' in v) {
      return (v as { richText: { text: string }[] }).richText.map((t) => t.text).join('')
    }
    if ('text' in v) return (v as { text: string }).text
  }
  return v ?? null
}

function readText(cell: ExcelJS.Cell): string | null {
  const v = cellValue(cell)
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

type NumberRead = { value: number | null; problem: string | null }

function readNumber(cell: ExcelJS.Cell): NumberRead {
  const v = cellValue(cell)
  if (v === null || v === undefined || v === '') return { value: null, problem: null }
  if (typeof v === 'number') {
    return Number.isFinite(v)
      ? { value: v, problem: null }
      : { value: null, problem: 'valeur numérique non finie' }
  }
  if (v instanceof Date) return { value: null, problem: 'une date a été trouvée à la place d\'un nombre' }
  // Excel error values arrive as objects like { error: '#DIV/0!' }.
  if (typeof v === 'object' && v !== null && 'error' in v) {
    return { value: null, problem: `cellule en erreur (${String((v as { error: unknown }).error)})` }
  }
  const s = String(v).replace(/\s/g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n)
    ? { value: n, problem: null }
    : { value: null, problem: `« ${String(v)} » n'est pas un nombre` }
}

type DateRead = { value: string | null; problem: string | null }

function readDate(cell: ExcelJS.Cell): DateRead {
  const v = cellValue(cell)
  if (v === null || v === undefined || v === '') return { value: null, problem: null }
  if (v instanceof Date) return { value: v.toISOString().slice(0, 10), problem: null }
  const s = String(v).trim()
  // The source writes "En cours" in a date cell; that is a status, not a date.
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return { value: s.slice(0, 10), problem: null }
  const fr = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (fr) {
    const [, d, m, y] = fr
    const year = y.length === 2 ? `20${y}` : y
    return { value: `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`, problem: null }
  }
  return { value: null, problem: `date illisible « ${s} »` }
}

// ─── Header location ─────────────────────────────────────────────────────────

const HEADER_ALIASES: Record<keyof ColumnMap, string[]> = {
  designation:       ['DESIGNATION'],
  norme:             ['NORME'],
  plannedQuantity:   ['QUANTITE'],
  plannedUnitPrice:  ['PRIX UNITAIRE HTVA'],
  actualUnitPrice:   ['P.U.H.T', 'PUHT'],
  deliveryDate:      ['DATE'],
  deliverySupplier:  ['FOURNISSEURS', 'FOURNISSEUR'],
  blNumber:          ['N° DU BL', 'N DU BL', 'NO DU BL'],
  deliveryQuantity:  ['QUANTITE'],
  purchaseSupplier:  ['FOURNISSEURS', 'FOURNISSEUR'],
  purchaseNorme:     ['NORME'],
  purchaseQuantity:  ['QUANTITE'],
  purchaseUnitPrice: ["PRIX UNITAIRE D'ACHAT HTVA", 'PRIX UNITAIRE DACHAT HTVA'],
  observations:      ['OBSERVATIONS'],
}

/**
 * Finds the column-header row and maps every column this import reads.
 *
 * The three duplicated headers are disambiguated positionally: the sheet's
 * groups always run planned → réel → achat left to right, and « P.U.H.T »
 * (the real unit price) and « Prix unitaire d'achat » are unique, so they act
 * as the boundary markers between the bands.
 */
function locateColumns(ws: ExcelJS.Worksheet): { headerRow: number; columns: ColumnMap } | string {
  let headerRow = 0
  let designationCol = 0

  for (let r = 1; r <= Math.min(ws.rowCount, 40); r++) {
    for (let c = 1; c <= Math.min(ws.columnCount, 40); c++) {
      const text = readText(ws.getCell(r, c))
      if (text && normalize(text) === 'DESIGNATION') {
        headerRow = r
        designationCol = c
        break
      }
    }
    if (headerRow) break
  }

  if (!headerRow) return "Colonne « Désignation » introuvable : ce fichier ne ressemble pas à un FOR-AC-10."

  // Read the whole header row once.
  const headers: { col: number; key: string }[] = []
  for (let c = 1; c <= Math.max(ws.columnCount, designationCol + 30); c++) {
    const text = readText(ws.getCell(headerRow, c))
    if (text) headers.push({ col: c, key: normalize(text) })
  }

  const findAll = (field: keyof ColumnMap) =>
    headers.filter((h) => HEADER_ALIASES[field].some((a) => h.key === normalize(a))).map((h) => h.col)

  const actualUnitPrice = findAll('actualUnitPrice')[0] ?? 0
  const purchaseUnitPrice = findAll('purchaseUnitPrice')[0] ?? 0

  if (!actualUnitPrice) return "Colonne « P.U.H.T » (prix unitaire réel) introuvable."
  if (!purchaseUnitPrice) return "Colonne « Prix unitaire d'achat HTVA » introuvable."

  // Band boundaries: planned columns sit left of the delivery date, the
  // purchase band starts at the last « Fournisseurs » before the purchase price.
  const quantities = findAll('plannedQuantity').sort((a, b) => a - b)
  const normes = findAll('norme').sort((a, b) => a - b)
  const supplierCols = findAll('deliverySupplier').sort((a, b) => a - b)

  const plannedQuantity = quantities.find((c) => c < actualUnitPrice) ?? 0
  const deliveryQuantity = quantities.find((c) => c > plannedQuantity && c < actualUnitPrice) ?? 0
  const purchaseQuantity = quantities.find((c) => c > actualUnitPrice && c < purchaseUnitPrice) ?? 0
  const norme = normes.find((c) => c < actualUnitPrice) ?? 0
  const purchaseNorme = normes.find((c) => c > actualUnitPrice) ?? 0
  const deliverySupplier = supplierCols.find((c) => c < actualUnitPrice) ?? 0
  const purchaseSupplier = supplierCols.find((c) => c > actualUnitPrice) ?? 0

  const columns: ColumnMap = {
    designation: designationCol,
    norme,
    plannedQuantity,
    plannedUnitPrice: findAll('plannedUnitPrice')[0] ?? 0,
    actualUnitPrice,
    deliveryDate: findAll('deliveryDate')[0] ?? 0,
    deliverySupplier,
    blNumber: findAll('blNumber')[0] ?? 0,
    deliveryQuantity,
    purchaseSupplier,
    purchaseNorme,
    purchaseQuantity,
    purchaseUnitPrice,
    observations: findAll('observations')[0] ?? 0,
  }

  for (const required of ['plannedQuantity', 'plannedUnitPrice', 'deliveryQuantity'] as const) {
    if (!columns[required]) return `Colonne obligatoire manquante : ${required}.`
  }

  return { headerRow, columns }
}

// ─── Parse ───────────────────────────────────────────────────────────────────

/**
 * Parses an uploaded FOR-AC-10 into a preview. Reads the database only to
 * resolve supplier names; writes nothing.
 */
export async function parseSupplyWorkbook(buffer: ArrayBuffer): Promise<ImportPreview> {
  const errors: ImportWarning[] = []
  const warnings: ImportWarning[] = []

  const fail = (message: string): ImportPreview => ({
    ok: false,
    errors: [{ row: null, message }],
    warnings,
    lines: [],
    stats: { lineCount: 0, deliveryCount: 0, purchaseCount: 0, matchedSuppliers: 0, unmatchedSupplierNames: [] },
    workbookProjectReference: null,
    workbookProjectName: null,
    workbookClientName: null,
  })

  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(buffer)
  } catch {
    return fail("Fichier illisible : un classeur Excel (.xlsx) est attendu.")
  }

  const ws = wb.worksheets[0]
  if (!ws) return fail('Le classeur ne contient aucune feuille.')
  if (wb.worksheets.length > 1) {
    warnings.push({
      row: null,
      message: `Le classeur contient ${wb.worksheets.length} feuilles ; seule « ${ws.name} » est importée.`,
    })
  }

  const located = locateColumns(ws)
  if (typeof located === 'string') return fail(located)
  const { headerRow, columns } = located

  // Header block: read for display only, never used to pick a target project.
  const labelled = (label: string): string | null => {
    for (let r = 1; r < headerRow; r++) {
      for (let c = 1; c <= 12; c++) {
        const text = readText(ws.getCell(r, c))
        if (text && normalize(text).startsWith(normalize(label))) {
          for (let n = c + 1; n <= c + 4; n++) {
            const v = readText(ws.getCell(r, n))
            if (v) return v
          }
        }
      }
    }
    return null
  }

  const workbookProjectReference = labelled('REF PROJET')
  const workbookProjectName = labelled('PROJET')
  const workbookClientName = labelled('CLIENT')

  // Supplier register, for name resolution. Never written to.
  const supplierRows = await db
    .select({ id: suppliers.id, name: suppliers.name })
    .from(suppliers)
    .where(eq(suppliers.isActive, true))
  const byName = new Map(supplierRows.map((s) => [normalize(s.name), s]))

  const unmatched = new Set<string>()
  let matchedCount = 0

  function resolveSupplier(raw: string | null) {
    if (!raw) return { supplierId: null, supplierLabel: null, supplierName: null, supplierMatched: false }
    const hit = byName.get(normalize(raw))
    if (hit) {
      matchedCount++
      return { supplierId: hit.id, supplierLabel: null, supplierName: hit.name, supplierMatched: true }
    }
    unmatched.add(raw)
    return { supplierId: null, supplierLabel: raw, supplierName: raw, supplierMatched: false }
  }

  const lines: ImportPreviewLine[] = []
  let blankRun = 0

  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const designation = readText(ws.getCell(r, columns.designation))

    // The totals row closes the table, exactly as row 36 does in the source.
    if (designation && /^somme\b/i.test(designation)) break

    const deliveryQty = readNumber(ws.getCell(r, columns.deliveryQuantity))
    const purchaseQty = readNumber(ws.getCell(r, columns.purchaseQuantity))
    const deliveryDate = readDate(ws.getCell(r, columns.deliveryDate))
    const deliverySupplierRaw = readText(ws.getCell(r, columns.deliverySupplier))
    const blNumber = readText(ws.getCell(r, columns.blNumber))
    const purchaseSupplierRaw = columns.purchaseSupplier
      ? readText(ws.getCell(r, columns.purchaseSupplier)) : null
    const purchaseUnitPrice = readNumber(ws.getCell(r, columns.purchaseUnitPrice))

    const hasDelivery = deliveryQty.value !== null || deliveryDate.value !== null ||
      deliverySupplierRaw !== null || blNumber !== null
    const hasPurchase = purchaseQty.value !== null || purchaseUnitPrice.value !== null ||
      purchaseSupplierRaw !== null
    const isBlank = !designation && !hasDelivery && !hasPurchase

    if (isBlank) {
      // A run of empty rows ends the table; the source pads well past its data.
      if (++blankRun >= 5) break
      continue
    }
    blankRun = 0

    if (designation) {
      const plannedQuantity = readNumber(ws.getCell(r, columns.plannedQuantity))
      const plannedUnitPrice = readNumber(ws.getCell(r, columns.plannedUnitPrice))
      const actualUnitPrice = readNumber(ws.getCell(r, columns.actualUnitPrice))

      if (plannedQuantity.problem)
        warnings.push({ row: r, message: `Quantité prévue ignorée : ${plannedQuantity.problem}.` })
      if (plannedUnitPrice.problem)
        warnings.push({ row: r, message: `Prix unitaire ignoré : ${plannedUnitPrice.problem}.` })

      const planned = plannedUnitPrice.value ?? 0
      // The source's column L is `=D`, so a real price equal to the devis price
      // is not an override — storing it as one would fabricate a decision.
      const actual = actualUnitPrice.value !== null && actualUnitPrice.value !== planned
        ? actualUnitPrice.value
        : null

      lines.push({
        row: r,
        designation,
        norme: columns.norme ? readText(ws.getCell(r, columns.norme)) : null,
        plannedQuantity: plannedQuantity.value ?? 0,
        plannedUnitPriceHtva: planned,
        actualUnitPriceHtva: actual,
        observations: columns.observations ? readText(ws.getCell(r, columns.observations)) : null,
        deliveries: [],
        purchases: [],
      })
    }

    const current = lines[lines.length - 1]

    if (!current) {
      if (hasDelivery || hasPurchase)
        warnings.push({ row: r, message: 'Ligne de livraison ou d\'achat sans désignation au-dessus : ignorée.' })
      continue
    }

    if (hasDelivery) {
      if (deliveryDate.problem) warnings.push({ row: r, message: `${deliveryDate.problem} — date laissée vide.` })
      if (deliveryQty.problem) warnings.push({ row: r, message: `Quantité livrée : ${deliveryQty.problem}.` })
      current.deliveries.push({
        deliveryDate: deliveryDate.value,
        ...resolveSupplier(deliverySupplierRaw),
        blNumber,
        quantity: deliveryQty.value ?? 0,
      })
    }

    if (hasPurchase) {
      if (purchaseQty.problem) warnings.push({ row: r, message: `Quantité achetée : ${purchaseQty.problem}.` })
      if (purchaseUnitPrice.problem)
        warnings.push({ row: r, message: `Prix d'achat : ${purchaseUnitPrice.problem}.` })
      current.purchases.push({
        ...resolveSupplier(purchaseSupplierRaw),
        norme: columns.purchaseNorme ? readText(ws.getCell(r, columns.purchaseNorme)) : null,
        quantity: purchaseQty.value ?? 0,
        unitPriceHtva: purchaseUnitPrice.value ?? 0,
        // The source's TTC column equals HTVA, so no rate can be inferred from
        // it. Importing 0 preserves that; a real rate is a human decision.
        vatRate: 0,
      })
    }
  }

  if (lines.length === 0) errors.push({ row: null, message: 'Aucune ligne de devis trouvée dans le fichier.' })

  // Duplicate designations are legitimate in this form when the norme differs
  // ("Cycas revoluta" in Pot 24 and Pot 30), so only an exact pair is flagged.
  const seen = new Map<string, number>()
  for (const line of lines) {
    const key = `${normalize(line.designation)}|${normalize(line.norme ?? '')}`
    const firstRow = seen.get(key)
    if (firstRow !== undefined) {
      warnings.push({
        row: line.row,
        message: `« ${line.designation} » (${line.norme ?? 'sans norme'}) apparaît déjà ligne ${firstRow} — doublon probable.`,
      })
    } else {
      seen.set(key, line.row)
    }
  }

  if (unmatched.size > 0) {
    warnings.push({
      row: null,
      message:
        `${unmatched.size} fournisseur(s) absent(s) du registre FOR-AC-11 : ${[...unmatched].join(', ')}. ` +
        'Ils seront conservés en texte libre ; aucun fournisseur n\'est créé automatiquement.',
    })
  }

  // Last gate: the parsed shape must satisfy the same schema the write API uses.
  const candidate = { items: lines.map(toInputRow) }
  const parsed = supplyItemsSchema.safeParse(candidate)
  if (!parsed.success) {
    for (const [path, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
      errors.push({ row: null, message: `${path} : ${(messages ?? []).join(', ')}` })
    }
    errors.push({ row: null, message: 'Le contenu du fichier ne satisfait pas la validation du registre.' })
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    lines,
    stats: {
      lineCount: lines.length,
      deliveryCount: lines.reduce((s, l) => s + l.deliveries.length, 0),
      purchaseCount: lines.reduce((s, l) => s + l.purchases.length, 0),
      matchedSuppliers: matchedCount,
      unmatchedSupplierNames: [...unmatched],
    },
    workbookProjectReference,
    workbookProjectName,
    workbookClientName,
  }
}

/** Preview line → the exact shape `replaceSupplyItems` writes. */
export function toInputRow(line: ImportPreviewLine): SupplyItemInputRow {
  return {
    designation: line.designation,
    norme: line.norme,
    plannedQuantity: line.plannedQuantity,
    plannedUnitPriceHtva: line.plannedUnitPriceHtva,
    actualUnitPriceHtva: line.actualUnitPriceHtva,
    observations: line.observations,
    deliveries: line.deliveries.map((d) => ({
      deliveryDate: d.deliveryDate,
      supplierId: d.supplierId,
      supplierLabel: d.supplierLabel,
      blNumber: d.blNumber,
      quantity: d.quantity,
    })),
    purchases: line.purchases.map((p) => ({
      supplierId: p.supplierId,
      supplierLabel: p.supplierLabel,
      norme: p.norme,
      quantity: p.quantity,
      unitPriceHtva: p.unitPriceHtva,
      vatRate: p.vatRate,
    })),
  }
}
