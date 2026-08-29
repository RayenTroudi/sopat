/**
 * FOR-CO-02 import — parsing and safety analysis.
 *
 * One parser serves two jobs, because they read the same sheet:
 *
 *   - seeding the blank `.xltx` as the catalogue (`bordereau_templates`), and
 *   - importing a FILLED copy into an offer.
 *
 * The uploaded reference file is the blank template. It has no client, no
 * date, no price, no total and no VAT rate anywhere, so a parse of it yields a
 * structure with null figures — which is the correct answer, not a failure.
 * Nothing here ever substitutes a default for an absent number.
 *
 * Why preview-then-commit rather than a one-shot upload
 * -----------------------------------------------------
 * Same reasoning as FOR-AC-10, plus one of its own. The sheet carries no
 * stable identifier for any line, and its « Référence projet » uses a
 * different scheme from `projects.reference`, so it cannot name its own
 * target. Matching imported rows onto existing lines would have to guess, and
 * a wrong guess silently rewrites a priced commercial commitment. So the
 * import never merges: it parses into a preview the user reads, and commits
 * only as a whole-tree replacement into a document the user explicitly named.
 *
 * Rules that hold throughout
 * --------------------------
 * - **No derived cell is ever read.** Column G (Montant), every « TOTAL
 *   PARTIEL », the « TOTAL GENERAL » and the whole recap are recomputed by
 *   `bordereau-calc`. This is what makes it structurally impossible for the
 *   twelve `#REF!` formulas in the source to reach the database.
 * - **Category banner formulas are ignored.** All seventeen category rows
 *   carry a self-referential `=F{row}*E{row}` in a MERGED LABEL cell
 *   (`C24:G24` and friends). It is a leftover, not a line total. A category is
 *   recognised by having no figures of its own and is stored with none; if its
 *   banner cell holds anything, that fact is reported and discarded.
 * - **Merged continuations are skipped.** ExcelJS returns the MASTER's value
 *   for a merged slave cell, so line I.2 — merged down over rows 10 and 11 —
 *   would otherwise import twice. Section I has nine lines, not ten.
 * - **No master data is ever created.** A designation is matched against the
 *   existing `plant_species` and `decorative_materials` registers, accent- and
 *   case-insensitively; anything unmatched stays free text and is reported.
 * - **Units are preserved verbatim.** The sheet writes both "P" and "p", plus
 *   "Ens", "M³", "M²", "Sac" and "TONNE". Normalising them would change the
 *   business meaning of a line a client signed, so they are stored as found.
 * - **Both numberings are kept.** `sourceCode` is what the body prints — it
 *   skips II.12 and prints II.17 twice — and `displayCode` is the recap's
 *   corrected 1…17, read from the recap rather than recomputed. Neither is
 *   derived from the other and nothing is silently renumbered.
 */
import { createHash } from 'crypto'
import ExcelJS from 'exceljs'
import { db } from '@/db'
import { decorativeMaterials, plantSpecies } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { lineTotal, type BordereauLineType } from '@/lib/bordereau-calc'

export const IMPORT_MAX_BYTES = 8 * 1024 * 1024

/** The sheet the official form uses. Any single sheet is accepted as a fallback. */
const PREFERRED_SHEET = 'OFFRE DE PRIX'

/**
 * Above this length a designation is prose, not a name: it is the
 * specification paragraph that IS the priced line (« ENGAZONNEMENT », the
 * three murs végétaux). Species names top out around forty characters.
 *
 * The distinction is presentational — `item` and `spec` are both priceable and
 * total identically — so a misclassification can never move a figure.
 */
const SPEC_TEXT_MIN_LENGTH = 180

/** Accent-, case- and spacing-insensitive key for matching labels and names. */
export function normalize(v: string): string {
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

// ─── Cell readers ────────────────────────────────────────────────────────────

/**
 * True for the lower cells of a merge.
 *
 * ExcelJS returns the MASTER's value when a merged slave is read. Without
 * this, line I.2 (merged over rows 10–11) imports twice and every category
 * banner's `C:G` merge reports its formula five times over.
 */
function isMergedContinuation(cell: ExcelJS.Cell): boolean {
  return cell.isMerged && cell.master?.address !== cell.address
}

type RawCell = {
  value: unknown
  /** '#REF!', '#DIV/0!', … when the cell resolves to an Excel error. */
  error: string | null
  /** The formula text, when there is one — used for reporting, never for value. */
  formula: string | null
}

/**
 * A cell's effective value, with Excel errors surfaced rather than stringified.
 *
 * A formula's CACHED RESULT is what is read, never the formula text — and when
 * that result is itself an error object (`{ error: '#REF!' }`), it becomes a
 * null plus a reported error. The twelve broken subtotals in the source arrive
 * here and go no further.
 */
function raw(cell: ExcelJS.Cell): RawCell {
  if (isMergedContinuation(cell)) return { value: null, error: null, formula: null }
  const v = cell.value
  if (v && typeof v === 'object') {
    if ('error' in v) return { value: null, error: String((v as { error: unknown }).error), formula: null }
    if ('formula' in v || 'sharedFormula' in v) {
      const f = 'formula' in v ? String((v as { formula: unknown }).formula) : '(partagée)'
      const result = (v as { result?: unknown }).result
      if (result && typeof result === 'object' && 'error' in result) {
        return { value: null, error: String((result as { error: unknown }).error), formula: f }
      }
      return { value: result ?? null, error: null, formula: f }
    }
    if ('richText' in v) {
      return {
        value: (v as { richText: { text: string }[] }).richText.map((t) => t.text).join(''),
        error: null,
        formula: null,
      }
    }
    if ('text' in v) return { value: (v as { text: string }).text, error: null, formula: null }
  }
  return { value: v ?? null, error: null, formula: null }
}

function readText(cell: ExcelJS.Cell): string | null {
  const { value } = raw(cell)
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const s = String(value).replace(/ /g, ' ').trim()
  return s === '' ? null : s
}

type NumberRead = { value: number | null; problem: string | null }

function readNumber(cell: ExcelJS.Cell): NumberRead {
  const { value, error } = raw(cell)
  if (error) return { value: null, problem: `cellule en erreur (${error})` }
  if (value === null || value === undefined || value === '') return { value: null, problem: null }
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? { value, problem: null }
      : { value: null, problem: 'valeur numérique non finie' }
  }
  if (value instanceof Date) {
    return { value: null, problem: "une date a été trouvée à la place d'un nombre" }
  }
  const s = String(value).replace(/\s/g, '').replace(/ /g, '').replace(',', '.')
  // The blank form fills its value slots with dot leaders ("...........").
  if (/^\.+$/.test(s)) return { value: null, problem: null }
  const n = Number(s)
  return Number.isFinite(n)
    ? { value: n, problem: null }
    : { value: null, problem: `« ${String(value)} » n'est pas un nombre` }
}

function readDate(cell: ExcelJS.Cell): string | null {
  const { value } = raw(cell)
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const fr = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (!fr) return null
  const [, d, m, y] = fr
  const year = y.length === 2 ? `20${y}` : y
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

// ─── Preview shapes ──────────────────────────────────────────────────────────

export type ImportWarning = { row: number | null; message: string }

export type BordereauPreviewLine = {
  /** Provenance only. Never an identifier; nothing joins on it. */
  sourceRow: number
  lineType: BordereauLineType
  /** As printed by the body: 'I.1', 'II.17' — which the body prints twice. */
  sourceCode: string | null
  /** The recap's corrected numbering, read from the recap. */
  displayCode: string | null
  designation: string
  /** The long French specification split out of column B. */
  description: string | null
  norme: string | null
  unit: string | null
  quantity: number | null
  unitPrice: number | null
  /** Computed here by `bordereau-calc`; column G is never read. */
  total: number | null
  plantSpeciesId: string | null
  decorativeMaterialId: string | null
  /** The register name when matched, else the raw designation. */
  catalogName: string | null
  catalogMatched: boolean
  children: BordereauPreviewLine[]
}

export type BordereauPreviewMilestone = {
  label: string
  percentage: number
  basis: 'htva' | 'ttc'
  triggerEvent: 'confirmation' | 'during_works' | 'completion' | 'other'
}

export type BordereauImportPreview = {
  ok: boolean
  /** Blocking problems. When non-empty, nothing may be committed. */
  errors: ImportWarning[]
  /** Non-blocking observations the user must read before committing. */
  warnings: ImportWarning[]
  /** The document tree: sections at the root. */
  sections: BordereauPreviewLine[]
  milestones: BordereauPreviewMilestone[]
  header: {
    documentCode: string | null
    formRevision: number | null
    offerDate: string | null
    clientName: string | null
    projectTitle: string | null
    projectReferenceText: string | null
    siteLocation: string | null
    maitreDouvrage: string | null
    validityDays: number | null
  }
  stats: {
    sectionCount: number
    categoryCount: number
    /** Priceable rows: `item` + `spec`. */
    lineCount: number
    specCount: number
    /** Of the priceable rows, those carrying both a quantity and a unit price. */
    pricedCount: number
    /** Recomputed by the ERP — never the workbook's own total. */
    totalHtva: number
    /** `#REF!` and friends found and discarded. */
    refErrorCount: number
    /** Category banner cells that held a formula or text, all discarded. */
    bannerFormulaCount: number
    matchedSpecies: number
    matchedMaterials: number
    unmatchedNames: string[]
    milestoneCount: number
    milestonePercentageTotal: number
  }
}

/** SHA-256 of the uploaded bytes — the key the import ledger is unique on. */
export function hashWorkbook(buffer: ArrayBuffer): string {
  return createHash('sha256').update(Buffer.from(buffer)).digest('hex')
}

// ─── Column location ─────────────────────────────────────────────────────────

type ColumnMap = {
  number: number
  designation: number
  norme: number
  unit: number
  quantity: number
  unitPrice: number
  /** Located so it can be deliberately NOT read. */
  amount: number
}

/**
 * Finds the header row and maps the seven columns.
 *
 * Unlike FOR-AC-10, the price columns cannot be located by header text:
 * `F6:G6` is ONE merged « Prix (DT) » cell and the sub-headers that would say
 * "P.U." and "Montant" are empty. So the two price columns are positional,
 * immediately right of QTE — and that reading is then cross-checked against
 * the `=F{row}*E{row}` pattern the sheet's own banner formulas leave behind,
 * which names both columns explicitly.
 */
function locateColumns(
  ws: ExcelJS.Worksheet,
): { headerRow: number; columns: ColumnMap } | string {
  let headerRow = 0
  let designationCol = 0

  for (let r = 1; r <= Math.min(ws.rowCount, 40) && !headerRow; r++) {
    for (let c = 1; c <= Math.min(Math.max(ws.columnCount, 10), 40); c++) {
      const text = readText(ws.getCell(r, c))
      if (text && normalize(text).startsWith('DESIGNATION')) {
        headerRow = r
        designationCol = c
        break
      }
    }
  }

  if (!headerRow) {
    return 'Colonne « Désignation des prestations » introuvable : ce fichier ne ressemble pas à un FOR-CO-02.'
  }

  const at = (c: number) => {
    const t = readText(ws.getCell(headerRow, c))
    return t ? normalize(t) : ''
  }

  const columns: ColumnMap = {
    number:      designationCol - 1,
    designation: designationCol,
    norme:       designationCol + 1,
    unit:        designationCol + 2,
    quantity:    designationCol + 3,
    unitPrice:   designationCol + 4,
    amount:      designationCol + 5,
  }

  if (columns.number < 1) return 'Colonne « N° » introuvable à gauche de la désignation.'
  if (!at(columns.unit).startsWith('UNITE')) {
    return 'Colonne « Unité » introuvable à la position attendue (troisième colonne du tableau).'
  }
  if (!at(columns.quantity).startsWith('QTE') && !at(columns.quantity).startsWith('QUANTITE')) {
    return 'Colonne « Qté » introuvable à la position attendue (quatrième colonne du tableau).'
  }
  if (!at(columns.norme).startsWith('NORME')) {
    return 'Colonne « Norme » introuvable à la position attendue (deuxième colonne du tableau).'
  }

  return { headerRow, columns }
}

/**
 * Confirms the price columns against the sheet's own arithmetic.
 *
 * A FOR-CO-02 states its line total as a bare product of two cells — the
 * source leaves `=F24*E24` behind in every category banner, and this
 * application's own export writes `=F*E` on each priced row. Either one names
 * the unit-price column and the quantity column, so finding one proves the
 * positional guess right.
 *
 * ONLY the bare two-cell product is consulted. Anything else — a `SUM`, a
 * `ROUND(…*rate,3)` on a VAT line — says nothing about the column layout and
 * is ignored rather than treated as a contradiction. Absence of any product at
 * all is inconclusive, not an error: a sheet retyped from scratch has none.
 */
const BARE_PRODUCT = /^\+?([A-Z]{1,3})(\d+)\*([A-Z]{1,3})(\d+)$/i

function priceColumnsAgree(ws: ExcelJS.Worksheet, columns: ColumnMap): boolean | null {
  const expected = new Set([
    ws.getColumn(columns.unitPrice).letter.toUpperCase(),
    ws.getColumn(columns.quantity).letter.toUpperCase(),
  ])

  for (let r = 1; r <= ws.rowCount; r++) {
    for (const c of [columns.norme, columns.unit, columns.quantity, columns.unitPrice, columns.amount]) {
      const { formula } = raw(ws.getCell(r, c))
      if (!formula) continue
      const m = formula.replace(/\s/g, '').match(BARE_PRODUCT)
      if (!m) continue
      const used = new Set([m[1].toUpperCase(), m[3].toUpperCase()])
      return used.size === 2 && [...used].every((letter) => expected.has(letter))
    }
  }
  return null
}

// ─── Designation / description split ─────────────────────────────────────────

/**
 * Splits « Transplantations : L'opération concerne les palmiers… » into a
 * designation and the specification that follows it.
 *
 * The specification is a business requirement — it is what the client signs
 * for — so it is preserved in full, never truncated and never discarded. When
 * no short lead-in exists (a species name, or a paragraph whose first colon
 * arrives deep inside the prose) the whole cell stays the designation.
 */
export function splitDesignation(text: string): { designation: string; description: string | null } {
  const m = text.match(/^([^\n]{3,120}?)\s*:\s+([\s\S]+)$/)
  if (!m) return { designation: text, description: null }
  const [, head, rest] = m
  // A long tail is a specification; a short one is part of the name itself
  // ("Pot 30 : 3 branches"), so it is left where it was written.
  if (rest.trim().length < 60) return { designation: text, description: null }
  return { designation: head.trim(), description: rest.trim() }
}

// ─── Parse ───────────────────────────────────────────────────────────────────

const SECTION_CODE = /^[IVX]+\.$/
const SUB_CODE = /^[IVX]+\.\d+$/

type MutableLine = BordereauPreviewLine

/**
 * Parses a FOR-CO-02 workbook into a preview.
 *
 * Reads the database only to resolve catalogue names; writes nothing, creates
 * nothing. Safe to call on an untrusted upload.
 */
export async function parseBordereauWorkbook(
  buffer: ArrayBuffer,
): Promise<BordereauImportPreview> {
  const errors: ImportWarning[] = []
  const warnings: ImportWarning[] = []

  const emptyStats = {
    sectionCount: 0, categoryCount: 0, lineCount: 0, specCount: 0, pricedCount: 0,
    totalHtva: 0, refErrorCount: 0, bannerFormulaCount: 0,
    matchedSpecies: 0, matchedMaterials: 0, unmatchedNames: [] as string[],
    milestoneCount: 0, milestonePercentageTotal: 0,
  }
  const emptyHeader = {
    documentCode: null, formRevision: null, offerDate: null, clientName: null,
    projectTitle: null, projectReferenceText: null, siteLocation: null,
    maitreDouvrage: null, validityDays: null,
  }

  const fail = (message: string): BordereauImportPreview => ({
    ok: false,
    errors: [{ row: null, message }],
    warnings,
    sections: [],
    milestones: [],
    header: { ...emptyHeader },
    stats: { ...emptyStats },
  })

  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(buffer)
  } catch {
    return fail('Fichier illisible : un classeur Excel (.xlsx / .xltx) est attendu.')
  }

  const ws =
    wb.worksheets.find((s) => normalize(s.name) === normalize(PREFERRED_SHEET)) ?? wb.worksheets[0]
  if (!ws) return fail('Le classeur ne contient aucune feuille.')
  if (wb.worksheets.length > 1) {
    warnings.push({
      row: null,
      message: `Le classeur contient ${wb.worksheets.length} feuilles ; seule « ${ws.name} » est lue.`,
    })
  }

  const located = locateColumns(ws)
  if (typeof located === 'string') return fail(located)
  const { headerRow, columns } = located

  const agree = priceColumnsAgree(ws, columns)
  if (agree === false) {
    return fail(
      "Les colonnes de prix ne correspondent pas à la structure FOR-CO-02 : " +
      "les formules du classeur ne pointent pas vers les colonnes P.U. et Qté attendues."
    )
  }

  let refErrorCount = 0
  let bannerFormulaCount = 0
  /** Counts an Excel error cell. The value itself is already null by then. */
  const noteError = (error: string | null) => {
    if (error) refErrorCount++
  }

  // ── Header block, read for display only ───────────────────────────────────
  //
  // Never used to pick a client or a project: the sheet's own « Référence
  // projet » follows a different scheme from `projects.reference`, so binding
  // on it would guess. The user chooses the target explicitly.
  const labelled = (label: string): string | null => {
    const key = normalize(label)
    for (let r = 1; r < headerRow; r++) {
      for (let c = 1; c <= Math.max(ws.columnCount, 8); c++) {
        const text = readText(ws.getCell(r, c))
        if (!text) continue
        const cleaned = normalize(text).replace(/\s*:\s*$/, '')
        if (cleaned !== key) continue
        for (let n = c + 1; n <= Math.max(ws.columnCount, 8); n++) {
          const v = readText(ws.getCell(r, n))
          if (!v) continue
          // Another label, not this one's value — the sheet puts two
          // label/value pairs side by side on rows 3 to 5.
          if (/:\s*$/.test(v)) break
          if (/^\.+$/.test(v.trim())) return null
          return v
        }
        return null
      }
    }
    return null
  }

  const headerDate = (() => {
    const key = normalize('DATE')
    for (let r = 1; r < headerRow; r++) {
      for (let c = 1; c <= Math.max(ws.columnCount, 8); c++) {
        const text = readText(ws.getCell(r, c))
        if (!text || normalize(text).replace(/\s*:\s*$/, '') !== key) continue
        for (let n = c + 1; n <= Math.max(ws.columnCount, 8); n++) {
          if (readText(ws.getCell(r, n))) return readDate(ws.getCell(r, n))
        }
      }
    }
    return null
  })()

  // The document code and its revision live in the sheet's top-right corner.
  let documentCode: string | null = null
  let formRevision: number | null = null
  for (let r = 1; r < headerRow && !documentCode; r++) {
    for (let c = 1; c <= Math.max(ws.columnCount, 8); c++) {
      const text = readText(ws.getCell(r, c))
      if (text && /^FOR[-\s]?CO[-\s]?02$/i.test(text.trim())) {
        documentCode = 'FOR-CO-02'
        const below = readNumber(ws.getCell(r + 1, c))
        formRevision = below.value !== null ? Math.trunc(below.value) : null
        break
      }
    }
  }
  if (!documentCode) {
    warnings.push({ row: null, message: "Le code document « FOR-CO-02 » n'a pas été trouvé dans l'en-tête." })
  }

  // ── Catalogue registers, for name resolution. Never written to. ───────────
  const speciesRows = await db
    .select({ id: plantSpecies.id, name: plantSpecies.botanicalName })
    .from(plantSpecies)
  const materialRows = await db
    .select({ id: decorativeMaterials.id, name: decorativeMaterials.name })
    .from(decorativeMaterials)
    .where(eq(decorativeMaterials.isActive, true))

  const speciesByName = new Map(speciesRows.map((s) => [normalize(s.name), s]))
  const materialsByName = new Map(materialRows.map((m) => [normalize(m.name), m]))

  let matchedSpecies = 0
  let matchedMaterials = 0
  const unmatched = new Set<string>()

  function resolveCatalog(designation: string) {
    const key = normalize(designation)
    const species = speciesByName.get(key)
    if (species) {
      matchedSpecies++
      return {
        plantSpeciesId: species.id,
        decorativeMaterialId: null,
        catalogName: species.name,
        catalogMatched: true,
      }
    }
    const material = materialsByName.get(key)
    if (material) {
      matchedMaterials++
      return {
        plantSpeciesId: null,
        decorativeMaterialId: material.id,
        catalogName: material.name,
        catalogMatched: true,
      }
    }
    unmatched.add(designation)
    return {
      plantSpeciesId: null,
      decorativeMaterialId: null,
      catalogName: designation,
      catalogMatched: false,
    }
  }

  // ── Body ──────────────────────────────────────────────────────────────────
  const sections: MutableLine[] = []
  const sectionsByCode = new Map<string, MutableLine>()
  let currentSection: MutableLine | null = null
  let currentCategory: MutableLine | null = null
  let recapRow = 0

  const makeLine = (over: Partial<MutableLine> & { sourceRow: number; lineType: BordereauLineType; designation: string }): MutableLine => ({
    sourceCode: null,
    displayCode: null,
    description: null,
    norme: null,
    unit: null,
    quantity: null,
    unitPrice: null,
    total: null,
    plantSpeciesId: null,
    decorativeMaterialId: null,
    catalogName: null,
    catalogMatched: false,
    children: [],
    ...over,
  })

  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const code = readText(ws.getCell(r, columns.number))
    const designationCell = readText(ws.getCell(r, columns.designation))

    if (code && normalize(code).startsWith('RECAPITULATIF')) { recapRow = r; break }
    if (designationCell && normalize(designationCell).startsWith('RECAPITULATIF')) { recapRow = r; break }

    // A repeated column-header block (the sheet repeats it at row 21).
    if (code && normalize(code) === 'N°') continue
    if (designationCell && normalize(designationCell).startsWith('DESIGNATION DES PRESTATIONS')) continue

    // Subtotal rows are recomputed, never read. This is where the twelve
    // broken `#REF!` formulas live, and where they stop.
    if (code && /^TOTAL\b/i.test(code)) {
      for (const c of [columns.norme, columns.unit, columns.quantity, columns.unitPrice, columns.amount]) {
        noteError(raw(ws.getCell(r, c)).error)
      }
      currentCategory = null
      continue
    }

    if (!designationCell) continue

    const normalizedCode = code ? code.replace(/\s+/g, '') : null

    // ── Section header ──
    if (normalizedCode && SECTION_CODE.test(normalizedCode)) {
      const existing = sectionsByCode.get(normalizedCode)
      if (existing) {
        // The sheet repeats « II. » at row 23 to carry the section's own
        // specification text. It is a description, not a second section.
        const stripped = designationCell.startsWith(existing.designation)
          ? designationCell.slice(existing.designation.length).trim()
          : designationCell
        if (stripped) {
          existing.description = existing.description
            ? `${existing.description}\n${stripped}`
            : stripped
        }
        currentCategory = null
        continue
      }
      const section = makeLine({
        sourceRow: r,
        lineType: 'section',
        sourceCode: normalizedCode,
        designation: designationCell.trim(),
      })
      sections.push(section)
      sectionsByCode.set(normalizedCode, section)
      currentSection = section
      currentCategory = null
      continue
    }

    const unit = readText(ws.getCell(r, columns.unit))
    const qty = readNumber(ws.getCell(r, columns.quantity))
    const pu = readNumber(ws.getCell(r, columns.unitPrice))
    const normeRead = raw(ws.getCell(r, columns.norme))
    noteError(normeRead.error)
    noteError(raw(ws.getCell(r, columns.quantity)).error)
    noteError(raw(ws.getCell(r, columns.unitPrice)).error)
    // Column G — the Montant — is deliberately never read for a value. It is
    // touched only to count an error, so a broken one is reported and dropped.
    noteError(raw(ws.getCell(r, columns.amount)).error)

    if (qty.problem) warnings.push({ row: r, message: `Quantité ignorée — ${qty.problem}.` })
    if (pu.problem) warnings.push({ row: r, message: `Prix unitaire ignoré — ${pu.problem}.` })

    const hasFigures = unit !== null || qty.value !== null || pu.value !== null

    // ── Category banner ──
    //
    // A coded row with no unit, no quantity and no unit price. Its `C:G`
    // merge holds a self-referential `=F*E`; it is discarded and reported.
    if (normalizedCode && SUB_CODE.test(normalizedCode) && !hasFigures) {
      if (normeRead.formula || normeRead.value !== null) bannerFormulaCount++
      const category = makeLine({
        sourceRow: r,
        lineType: 'category',
        sourceCode: normalizedCode,
        designation: designationCell.trim(),
      })
      if (!currentSection) {
        warnings.push({ row: r, message: `Catégorie « ${normalizedCode} » rencontrée hors de toute section.` })
        const orphan = makeLine({ sourceRow: r, lineType: 'section', sourceCode: null, designation: 'Sans section' })
        sections.push(orphan)
        currentSection = orphan
      }
      currentSection.children.push(category)
      currentCategory = category
      continue
    }

    // ── Priceable line ──
    const { designation, description } = splitDesignation(designationCell.trim())
    const lineType: BordereauLineType =
      !normalizedCode && designationCell.trim().length >= SPEC_TEXT_MIN_LENGTH ? 'spec' : 'item'

    const catalog = lineType === 'item' && !normalizedCode
      ? resolveCatalog(designation)
      : { plantSpeciesId: null, decorativeMaterialId: null, catalogName: null, catalogMatched: false }

    const line = makeLine({
      sourceRow: r,
      lineType,
      sourceCode: normalizedCode && SUB_CODE.test(normalizedCode) ? normalizedCode : null,
      designation,
      description,
      norme: typeof normeRead.value === 'string' ? normeRead.value.trim() || null : null,
      unit,
      quantity: qty.value,
      unitPrice: pu.value,
      total: lineTotal(qty.value, pu.value),
      ...catalog,
    })

    const parent = currentCategory ?? currentSection
    if (!parent) {
      warnings.push({ row: r, message: 'Ligne rencontrée avant toute section ; elle est ignorée.' })
      continue
    }
    parent.children.push(line)
  }

  if (sections.length === 0) {
    return fail("Aucune section n'a été trouvée : le tableau du bordereau est vide ou illisible.")
  }

  // ── Recap: the corrected numbering ────────────────────────────────────────
  //
  // The recap is NEVER read for money — its own N° cells are formulas pointing
  // back into the body. It is read for one thing: `displayCode`, the coherent
  // 1…17 the body does not have because it skips II.12 and prints II.17 twice.
  const recapCodes: { code: string; section: string }[] = []
  if (recapRow) {
    for (let r = recapRow + 1; r <= ws.rowCount; r++) {
      const code = readText(ws.getCell(r, columns.number))
      if (!code) continue
      const c = code.replace(/\s+/g, '')
      if (/^TOTAL\b/i.test(c)) continue
      if (SUB_CODE.test(c)) recapCodes.push({ code: c, section: `${c.split('.')[0]}.` })
    }
  } else {
    warnings.push({ row: null, message: 'Aucun « RECAPITULATIF GENERAL » trouvé ; la numérotation corrigée est absente.' })
  }

  for (const section of sections) {
    if (!section.sourceCode) continue
    const codes = recapCodes.filter((c) => c.section === section.sourceCode).map((c) => c.code)
    // Recap entries map, in order, to a section's second level: the priced
    // lines of Section I, the categories of Section II.
    const targets = section.children
    if (codes.length && codes.length !== targets.length) {
      warnings.push({
        row: null,
        message:
          `Section ${section.sourceCode} : le récapitulatif liste ${codes.length} poste(s) ` +
          `pour ${targets.length} dans le corps du document ; ` +
          'la numérotation corrigée est appliquée jusquà la plus courte des deux.',
      })
    }
    targets.forEach((child, i) => {
      if (i < codes.length) child.displayCode = codes[i]
    })
  }

  const duplicated = new Map<string, number>()
  for (const section of sections) {
    for (const child of section.children) {
      if (!child.sourceCode) continue
      duplicated.set(child.sourceCode, (duplicated.get(child.sourceCode) ?? 0) + 1)
    }
  }
  for (const [code, n] of duplicated) {
    if (n > 1) {
      warnings.push({
        row: null,
        message: `Le code « ${code} » est utilisé ${n} fois dans le corps du document ; il est conservé tel quel et la numérotation du récapitulatif est stockée à part.`,
      })
    }
  }

  // ── Commercial block ──────────────────────────────────────────────────────
  let validityDays: number | null = null
  const milestones: BordereauPreviewMilestone[] = []
  const startRow = recapRow || headerRow

  for (let r = startRow; r <= ws.rowCount; r++) {
    const text = readText(ws.getCell(r, columns.number)) ?? readText(ws.getCell(r, columns.designation))
    if (!text) continue
    const n = normalize(text)

    if (n.startsWith('OFFRE VALABLE')) {
      const m = text.match(/(\d+)\s*JOURS?/i)
      validityDays = m ? Number(m[1]) : null
      continue
    }

    const pct = text.match(/^(\d+(?:[.,]\d+)?)\s*%\s*(.*)$/)
    if (pct) {
      const percentage = Number(pct[1].replace(',', '.'))
      const label = pct[2].trim() || `${percentage} %`
      const ln = normalize(label)
      const triggerEvent: BordereauPreviewMilestone['triggerEvent'] =
        /CONFIRMATION|COMMANDE|SIGNATURE/.test(ln) ? 'confirmation'
        : /PENDANT LES TRAVAUX|EN COURS/.test(ln) ? 'during_works'
        : /FIN DU CHANTIER|FIN DE CHANTIER|RECEPTION|LIVRAISON/.test(ln) ? 'completion'
        : 'other'
      milestones.push({
        label,
        percentage,
        // The document's own wording is « la somme T.T.C », so the plan is
        // read against the TTC total unless a future sheet says otherwise.
        basis: 'ttc',
        triggerEvent,
      })
    }
  }

  const milestonePercentageTotal = milestones.reduce((s, m) => s + m.percentage, 0)
  if (milestones.length && Math.abs(milestonePercentageTotal - 100) > 1e-3) {
    warnings.push({
      row: null,
      message: `Les modalités de paiement totalisent ${milestonePercentageTotal} % au lieu de 100 %.`,
    })
  }

  // ── Statistics, all recomputed ────────────────────────────────────────────
  let categoryCount = 0
  let lineCount = 0
  let specCount = 0
  let pricedCount = 0
  let totalHtva = 0

  const walk = (node: MutableLine) => {
    if (node.lineType === 'category') categoryCount++
    if (node.lineType === 'item' || node.lineType === 'spec') {
      lineCount++
      if (node.lineType === 'spec') specCount++
      if (node.total !== null) { pricedCount++; totalHtva += node.total }
    }
    node.children.forEach(walk)
  }
  sections.forEach(walk)

  if (refErrorCount) {
    warnings.push({
      row: null,
      message: `${refErrorCount} cellule(s) en erreur (#REF!) ont été trouvées dans le classeur ; aucune n'est importée — les totaux sont recalculés par l'ERP.`,
    })
  }
  if (bannerFormulaCount) {
    warnings.push({
      row: null,
      message: `${bannerFormulaCount} formule(s) de bandeau de catégorie ont été ignorées : ce sont des résidus dans une cellule de libellé, pas des totaux de ligne.`,
    })
  }
  if (unmatched.size) {
    warnings.push({
      row: null,
      message: `${unmatched.size} désignation(s) ne correspondent à aucune fiche existante ; elles restent en texte libre — aucune fiche n'est créée par l'import.`,
    })
  }
  if (lineCount === 0) {
    errors.push({ row: null, message: 'Aucune ligne de prix trouvée dans le document.' })
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    sections,
    milestones,
    header: {
      documentCode,
      formRevision,
      offerDate: headerDate,
      clientName: labelled('CLIENT'),
      projectTitle: labelled('PROJET'),
      projectReferenceText: labelled('REFERENCE PROJET'),
      siteLocation: labelled('LOCALISATION'),
      maitreDouvrage: labelled("MAITRE D'OUVRAGE"),
      validityDays,
    },
    stats: {
      sectionCount: sections.length,
      categoryCount,
      lineCount,
      specCount,
      pricedCount,
      totalHtva,
      refErrorCount,
      bannerFormulaCount,
      matchedSpecies,
      matchedMaterials,
      unmatchedNames: [...unmatched].slice(0, 50),
      milestoneCount: milestones.length,
      milestonePercentageTotal,
    },
  }
}

/** Flattens the preview tree into the order the document prints. */
export function flattenPreview(sections: BordereauPreviewLine[]): BordereauPreviewLine[] {
  const out: BordereauPreviewLine[] = []
  const walk = (n: BordereauPreviewLine) => { out.push(n); n.children.forEach(walk) }
  sections.forEach(walk)
  return out
}
