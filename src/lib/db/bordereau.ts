/**
 * FOR-CO-02 — « Bordereau des prix ».
 *
 * The document is `commercial_offers` plus the tree in `offer_line_items`:
 * section → category → item/spec, addressed by uuid. Nothing derived is
 * stored on a header row — subtotals, the general total and the recap are all
 * produced by `@/lib/bordereau-calc` at read time, so correcting one line
 * price corrects every figure above it and the recap can never drift from the
 * body it summarises.
 *
 * Three things are deliberately NOT done here:
 *
 * 1. **No master data is created.** A designation is linked to an existing
 *    `plant_species` or `decorative_materials` row when it matches; otherwise
 *    it stays free text. The catalogue is curated by people, not by imports.
 * 2. **No project budget is touched.** `projects.approved_budget` is an
 *    internal COST ceiling owned by the budget-validation flow, and
 *    `project-spend.ts` measures consumption against it. A selling price never
 *    goes near it. `contract_amount` exists for the commercial figure and is
 *    written only through `confirmContractAmount`, by a human.
 * 3. **No invoice or client-account entry is created.** Payment milestones are
 *    a plan; FOR-CO-03 records what actually happened.
 */
import { randomUUID } from 'crypto'
import { db, type DB } from '@/db'
import {
  bordereauTemplateLines,
  bordereauTemplates,
  clients,
  commercialOffers,
  offerImports,
  offerLineItems,
  offerPaymentMilestones,
  offerVersions,
  projects,
  systemSettings,
  users,
} from '@/db/schema'
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { recordAudit, type AuditActor } from '@/lib/audit-record'
import {
  computeBordereau,
  computeMilestones,
  lineTotal,
  num,
  numOrNull,
  round3,
  type BordereauLineType,
  type BordereauTotals,
  type MilestoneSummary,
} from '@/lib/bordereau-calc'
import type {
  BordereauImportPreview,
  BordereauPreviewLine,
  BordereauPreviewMilestone,
} from '@/lib/import/bordereau-import'

export const BORDEREAU_FORM_CODE = 'FOR-CO-02'

type Executor = DB | Parameters<Parameters<DB['transaction']>[0]>[0]

/**
 * Who may edit a bordereau — unchanged from the offer module it lives in, so
 * this feature grants nobody a right they did not already have.
 */
export const BORDEREAU_WRITE_ROLES = ['admin', 'direction', 'etudes_chef'] as const

/**
 * Who may approve and lock one. Narrower on purpose: approving turns a draft
 * into an immutable commercial commitment and the figure a project's contract
 * amount is then proposed from, which is a direction decision.
 */
export const BORDEREAU_APPROVE_ROLES = ['admin', 'direction'] as const

export function canEditBordereau(role: string): boolean {
  return (BORDEREAU_WRITE_ROLES as readonly string[]).includes(role)
}

export function canApproveBordereau(role: string): boolean {
  return (BORDEREAU_APPROVE_ROLES as readonly string[]).includes(role)
}

/**
 * Splits a bulk insert so a 266-line document stays under Postgres' 65 535
 * bind-parameter ceiling. Order is preserved, which is what lets a parent row
 * land in the same chunk as — or an earlier chunk than — its children.
 */
function chunked<T>(rows: T[], size = 250): T[][] {
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size))
  return out
}

// ─── VAT default ─────────────────────────────────────────────────────────────

/** Tunisia's standard rate, as a fraction. Only ever a DEFAULT for a NEW document. */
export const DEFAULT_VAT_RATE = 0.19

/**
 * The configured VAT rate for new FOR-CO-02 documents.
 *
 * The workbook carries no rate at all — only the labels « HTVA » and « T.T.C »
 * — so none is ever inferred from it. Existing offers keep the 0 they were
 * created with; nothing here rewrites them.
 */
export async function getDefaultVatRate(): Promise<number> {
  const [row] = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, 'commercial'))
    .limit(1)
  const configured = (row?.value as { vatRate?: unknown } | null)?.vatRate
  const n = numOrNull(typeof configured === 'number' || typeof configured === 'string' ? configured : null)
  return n !== null && n >= 0 && n <= 9.9999 ? n : DEFAULT_VAT_RATE
}

// ─── Read shapes ─────────────────────────────────────────────────────────────

export type BordereauLineRow = {
  id: string
  parentId: string | null
  lineType: BordereauLineType
  sourceCode: string | null
  displayCode: string | null
  position: number
  designation: string
  description: string | null
  norme: string | null
  unit: string | null
  quantity: number | null
  unitPrice: number | null
  /** Recomputed, never trusted from storage. */
  total: number | null
  /** Σ of the subtree — what a « TOTAL PARTIEL » row prints. */
  subtotal: number
  plantSpeciesId: string | null
  decorativeMaterialId: string | null
  sourceRow: number | null
  children: BordereauLineRow[]
}

export type BordereauMilestoneRow = {
  id: string
  position: number
  label: string
  percentage: number
  basis: 'htva' | 'ttc'
  triggerEvent: 'confirmation' | 'during_works' | 'completion' | 'other'
  dueDate: string | null
  clientAccountEntryId: string | null
  notes: string | null
  /** Computed from the document's totals; never stored. */
  amount: number
}

export type BordereauVersionRow = {
  id: string
  versionNo: number
  label: string | null
  status: 'draft' | 'approved' | 'superseded'
  totalHtva: number
  totalVat: number
  totalTtc: number
  vatRate: number
  lineCount: number
  changeSummary: string
  createdAt: Date
  createdByName: string | null
  approvedByName: string | null
  approvedAt: Date | null
}

export type BordereauRow = {
  offer: {
    id: string
    reference: string
    documentCode: string
    formRevision: number | null
    projectTitle: string
    clientId: string | null
    clientName: string | null
    projectId: string | null
    projectReferenceText: string | null
    siteLocation: string | null
    maitreDouvrage: string | null
    offerDate: string | null
    validityDate: string | null
    validityDays: number | null
    currency: string
    vatRate: number
    status: string
    currentVersionNo: number
    approvedVersionId: string | null
    lockedAt: Date | null
    createdAt: Date
    updatedAt: Date
  }
  sections: BordereauLineRow[]
  milestones: BordereauMilestoneRow[]
  milestoneSummary: MilestoneSummary
  totals: BordereauTotals
  versions: BordereauVersionRow[]
  /** True while the document is approved: edits and imports are refused. */
  locked: boolean
}

const LINE_COLUMNS = {
  id: offerLineItems.id,
  parentId: offerLineItems.parentId,
  lineType: offerLineItems.lineType,
  sourceCode: offerLineItems.sourceCode,
  displayCode: offerLineItems.displayCode,
  position: offerLineItems.position,
  designation: offerLineItems.designation,
  description: offerLineItems.description,
  norme: offerLineItems.norme,
  unit: offerLineItems.unit,
  quantity: offerLineItems.quantity,
  unitPrice: offerLineItems.unitPrice,
  plantSpeciesId: offerLineItems.plantSpeciesId,
  decorativeMaterialId: offerLineItems.decorativeMaterialId,
  sourceRow: offerLineItems.sourceRow,
}

type FlatLine = {
  id: string
  parentId: string | null
  lineType: BordereauLineType
  sourceCode: string | null
  displayCode: string | null
  position: number
  designation: string
  description: string | null
  norme: string | null
  unit: string | null
  quantity: string | null
  unitPrice: string | null
  plantSpeciesId: string | null
  decorativeMaterialId: string | null
  sourceRow: number | null
}

/**
 * Rebuilds the tree from flat rows and totals every node.
 *
 * A legacy flat bordereau — every row a root-level `item`, which is what
 * migration 0021 created — is wrapped in one anonymous section, so its total
 * is exactly the sum `syncOfferAmount()` has always produced.
 */
function buildTree(rows: FlatLine[]): BordereauLineRow[] {
  const byId = new Map<string, BordereauLineRow>()
  for (const r of rows) {
    byId.set(r.id, {
      id: r.id,
      parentId: r.parentId,
      lineType: r.lineType,
      sourceCode: r.sourceCode,
      displayCode: r.displayCode,
      position: r.position,
      designation: r.designation,
      description: r.description,
      norme: r.norme,
      unit: r.unit,
      quantity: numOrNull(r.quantity),
      unitPrice: numOrNull(r.unitPrice),
      total: lineTotal(numOrNull(r.quantity), numOrNull(r.unitPrice)),
      subtotal: 0,
      plantSpeciesId: r.plantSpeciesId,
      decorativeMaterialId: r.decorativeMaterialId,
      sourceRow: r.sourceRow,
      children: [],
    })
  }

  const roots: BordereauLineRow[] = []
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  const sortRec = (list: BordereauLineRow[]) => {
    list.sort((a, b) => a.position - b.position)
    list.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)

  const subtotal = (n: BordereauLineRow): number => {
    n.subtotal = round3((n.total ?? 0) + n.children.reduce((s, c) => s + subtotal(c), 0))
    return n.subtotal
  }
  roots.forEach(subtotal)

  return roots
}

/** The roots as sections, wrapping a legacy flat list in one anonymous section. */
function asSections(roots: BordereauLineRow[]): BordereauLineRow[] {
  if (roots.length === 0) return []
  if (roots.every((r) => r.lineType === 'section')) return roots
  const loose = roots.filter((r) => r.lineType !== 'section')
  const real = roots.filter((r) => r.lineType === 'section')
  const wrapper: BordereauLineRow = {
    id: '__legacy__',
    parentId: null,
    lineType: 'section',
    sourceCode: null,
    displayCode: null,
    position: -1,
    designation: 'Bordereau',
    description: null,
    norme: null,
    unit: null,
    quantity: null,
    unitPrice: null,
    total: null,
    subtotal: round3(loose.reduce((s, l) => s + l.subtotal, 0)),
    plantSpeciesId: null,
    decorativeMaterialId: null,
    sourceRow: null,
    children: loose,
  }
  return [wrapper, ...real]
}

const toCalcSections = (sections: BordereauLineRow[]) =>
  sections.map((s) => ({
    sourceCode: s.sourceCode,
    designation: s.designation,
    lineType: s.lineType,
    quantity: s.quantity,
    unitPrice: s.unitPrice,
    children: s.children.map(function toCalc(n): {
      lineType: BordereauLineType
      quantity: number | null
      unitPrice: number | null
      children: ReturnType<typeof toCalc>[]
    } {
      return {
        lineType: n.lineType,
        quantity: n.quantity,
        unitPrice: n.unitPrice,
        children: n.children.map(toCalc),
      }
    }),
  }))

/** The whole FOR-CO-02 document, with every derived figure recomputed. */
export async function getOfferBordereau(offerId: string): Promise<BordereauRow | null> {
  const [row] = await db
    .select({ offer: commercialOffers, clientCompany: clients.companyName })
    .from(commercialOffers)
    .leftJoin(clients, eq(commercialOffers.clientId, clients.id))
    .where(and(eq(commercialOffers.id, offerId), isNull(commercialOffers.deletedAt)))
    .limit(1)
  if (!row) return null

  const [lineRows, milestoneRows, versionRows] = await Promise.all([
    db.select(LINE_COLUMNS).from(offerLineItems)
      .where(eq(offerLineItems.offerId, offerId))
      .orderBy(asc(offerLineItems.position)),
    db.select().from(offerPaymentMilestones)
      .where(eq(offerPaymentMilestones.offerId, offerId))
      .orderBy(asc(offerPaymentMilestones.position)),
    db.select({
      id: offerVersions.id,
      versionNo: offerVersions.versionNo,
      label: offerVersions.label,
      status: offerVersions.status,
      totalHtva: offerVersions.totalHtva,
      totalVat: offerVersions.totalVat,
      totalTtc: offerVersions.totalTtc,
      vatRate: offerVersions.vatRate,
      lineCount: offerVersions.lineCount,
      changeSummary: offerVersions.changeSummary,
      createdAt: offerVersions.createdAt,
      createdByName: users.name,
      approvedAt: offerVersions.approvedAt,
      approvedById: offerVersions.approvedBy,
    })
      .from(offerVersions)
      .leftJoin(users, eq(offerVersions.createdBy, users.id))
      .where(eq(offerVersions.offerId, offerId))
      .orderBy(desc(offerVersions.versionNo)),
  ])

  const approverIds = versionRows.map((v) => v.approvedById).filter((v): v is string => !!v)
  const approvers = approverIds.length
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, approverIds))
    : []
  const approverName = new Map(approvers.map((a) => [a.id, a.name]))

  const sections = asSections(buildTree(lineRows as FlatLine[]))
  const vatRate = num(row.offer.vatRate)
  const totals = computeBordereau({ vatRate, sections: toCalcSections(sections) })

  const milestoneSummary = computeMilestones(
    milestoneRows.map((m) => ({
      label: m.label,
      percentage: num(m.percentage),
      basis: m.basis,
    })),
    totals,
  )

  const milestones: BordereauMilestoneRow[] = milestoneRows.map((m, i) => ({
    id: m.id,
    position: m.position,
    label: m.label,
    percentage: num(m.percentage),
    basis: m.basis,
    triggerEvent: m.triggerEvent,
    dueDate: m.dueDate,
    clientAccountEntryId: m.clientAccountEntryId,
    notes: m.notes,
    amount: milestoneSummary.milestones[i]?.amount ?? 0,
  }))

  return {
    offer: {
      id: row.offer.id,
      reference: row.offer.reference,
      documentCode: row.offer.documentCode,
      formRevision: row.offer.formRevision,
      projectTitle: row.offer.projectTitle,
      clientId: row.offer.clientId,
      clientName: row.clientCompany ?? row.offer.clientName,
      projectId: row.offer.projectId,
      projectReferenceText: row.offer.projectReferenceText,
      siteLocation: row.offer.siteLocation,
      maitreDouvrage: row.offer.maitreDouvrage,
      offerDate: row.offer.offerDate,
      validityDate: row.offer.validityDate,
      validityDays: row.offer.validityDays,
      currency: row.offer.currency,
      vatRate,
      status: row.offer.status,
      currentVersionNo: row.offer.currentVersionNo,
      approvedVersionId: row.offer.approvedVersionId,
      lockedAt: row.offer.lockedAt,
      createdAt: row.offer.createdAt,
      updatedAt: row.offer.updatedAt,
    },
    sections,
    milestones,
    milestoneSummary,
    totals,
    versions: versionRows.map((v) => ({
      id: v.id,
      versionNo: v.versionNo,
      label: v.label,
      status: v.status,
      totalHtva: num(v.totalHtva),
      totalVat: num(v.totalVat),
      totalTtc: num(v.totalTtc),
      vatRate: num(v.vatRate),
      lineCount: v.lineCount,
      changeSummary: v.changeSummary,
      createdAt: v.createdAt,
      createdByName: v.createdByName,
      approvedByName: v.approvedById ? approverName.get(v.approvedById) ?? null : null,
      approvedAt: v.approvedAt,
    })),
    locked: row.offer.approvedVersionId !== null,
  }
}

// ─── Totals sync ─────────────────────────────────────────────────────────────

/**
 * Recomputes the document's totals onto `commercial_offers`.
 *
 * `amount` KEEPS its historical meaning — the HTVA sum of the lines — because
 * the commercial pipeline, the client screens and the dashboards already read
 * it and none of them should move because VAT support arrived. `total_htva`
 * mirrors it; VAT and TTC are added beside it.
 */
export async function syncOfferTotals(tx: Executor, offerId: string): Promise<BordereauTotals> {
  const [offer] = await tx
    .select({ vatRate: commercialOffers.vatRate })
    .from(commercialOffers)
    .where(eq(commercialOffers.id, offerId))
    .limit(1)

  const lineRows = await tx
    .select(LINE_COLUMNS)
    .from(offerLineItems)
    .where(eq(offerLineItems.offerId, offerId))
    .orderBy(asc(offerLineItems.position))

  const sections = asSections(buildTree(lineRows as FlatLine[]))
  const totals = computeBordereau({
    vatRate: num(offer?.vatRate),
    sections: toCalcSections(sections),
  })

  await tx
    .update(commercialOffers)
    .set({
      amount: totals.lineCount ? totals.totalHtva.toFixed(3) : null,
      totalHtva: totals.lineCount ? totals.totalHtva.toFixed(3) : null,
      totalVat: totals.lineCount ? totals.totalVat.toFixed(3) : null,
      totalTtc: totals.lineCount ? totals.totalTtc.toFixed(3) : null,
      updatedAt: new Date(),
    })
    .where(eq(commercialOffers.id, offerId))

  return totals
}

/** Persists each line's stored `total`, so exports and reports agree with the model. */
async function syncStoredLineTotals(tx: Executor, offerId: string) {
  await tx.execute(sql`
    UPDATE offer_line_items
       SET total = CASE
             WHEN quantity IS NULL OR unit_price IS NULL THEN NULL
             ELSE round(quantity * unit_price, 3)
           END
     WHERE offer_id = ${offerId}
  `)
}

// ─── Writing the tree ────────────────────────────────────────────────────────

export type BordereauInputLine = {
  lineType: BordereauLineType
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
  children?: BordereauInputLine[]
}

export type BordereauInputMilestone = {
  label: string
  percentage: number
  basis?: 'htva' | 'ttc'
  triggerEvent?: 'confirmation' | 'during_works' | 'completion' | 'other'
  dueDate?: string | null
  notes?: string | null
}

/** Guard used by every write path: an approved document is evidence, not a draft. */
export async function assertNotLocked(offerId: string): Promise<string | null> {
  const [offer] = await db
    .select({ approvedVersionId: commercialOffers.approvedVersionId })
    .from(commercialOffers)
    .where(eq(commercialOffers.id, offerId))
    .limit(1)
  if (!offer) return 'Offre introuvable'
  if (offer.approvedVersionId) {
    return 'Ce bordereau est approuvé et verrouillé. Rouvrez-le en nouvelle version pour le modifier.'
  }
  return null
}

/**
 * Replaces the offer's whole bordereau in one transaction.
 *
 * Delete-and-reinsert, like `replaceSupplyItems` for FOR-AC-10: the document
 * is edited and imported as a whole, and a partial diff would leave the
 * positions of untouched rows ambiguous. `position` is a single running
 * counter in document order, so the print order is total and stable.
 *
 * Every field written is named explicitly — the input type IS the allowlist,
 * so a key nobody reads here can never reach a column.
 */
export async function replaceOfferBordereau(
  offerId: string,
  input: { lines: BordereauInputLine[]; milestones?: BordereauInputMilestone[] },
  userId: string,
  actor: AuditActor,
) {
  return db.transaction(async (tx) => {
    const previous = await tx
      .select({ id: offerLineItems.id })
      .from(offerLineItems)
      .where(eq(offerLineItems.offerId, offerId))

    // Children first: the self-FK cascades, but deleting bottom-up keeps the
    // statement independent of the cascade being present.
    await tx.delete(offerLineItems).where(eq(offerLineItems.offerId, offerId))

    let position = 0
    let lineCount = 0

    /**
     * The tree is flattened first and written in bulk.
     *
     * Ids are generated here rather than by the database, so a child's
     * `parentId` is known before either row exists and the whole document
     * goes in as a handful of statements. Inserting node by node meant one
     * network round trip per row — 285 of them for the reference form, inside
     * a single transaction — which made a routine import take minutes.
     */
    const rows: (typeof offerLineItems.$inferInsert)[] = []

    const flatten = (node: BordereauInputLine, parentId: string | null) => {
      const priceable = node.lineType === 'item' || node.lineType === 'spec'
      const quantity = priceable ? node.quantity ?? null : null
      const unitPrice = priceable ? node.unitPrice ?? null : null
      const total = lineTotal(quantity, unitPrice)
      if (priceable) lineCount++

      const id = randomUUID()
      rows.push({
        id,
        offerId,
        parentId,
        lineType: node.lineType,
        sourceCode: node.sourceCode ?? null,
        displayCode: node.displayCode ?? null,
        position: position++,
        designation: node.designation,
        description: node.description ?? null,
        // A category banner never carries a norme: its cell is a merged label
        // holding a leftover formula, which the import discards.
        norme: node.lineType === 'category' ? null : node.norme ?? null,
        unit: priceable ? node.unit ?? null : null,
        quantity: quantity === null ? null : String(quantity),
        unitPrice: unitPrice === null ? null : String(unitPrice),
        total: total === null ? null : total.toFixed(3),
        plantSpeciesId: node.plantSpeciesId ?? null,
        decorativeMaterialId: node.decorativeMaterialId ?? null,
        sourceRow: node.sourceRow ?? null,
        createdBy: userId,
      })

      for (const child of node.children ?? []) flatten(child, id)
    }

    for (const node of input.lines) flatten(node, null)

    // Parents precede their children in document order, so the self-FK is
    // satisfied within each chunk without deferring the constraint.
    for (const chunk of chunked(rows)) await tx.insert(offerLineItems).values(chunk)

    if (input.milestones) {
      await tx.delete(offerPaymentMilestones).where(eq(offerPaymentMilestones.offerId, offerId))
      if (input.milestones.length) {
        await tx.insert(offerPaymentMilestones).values(
          input.milestones.map((m, i) => ({
            offerId,
            position: i,
            label: m.label,
            percentage: String(m.percentage),
            basis: m.basis ?? 'ttc',
            triggerEvent: m.triggerEvent ?? 'other',
            dueDate: m.dueDate ?? null,
            notes: m.notes ?? null,
            createdBy: userId,
          })),
        )
      }
    }

    const totals = await syncOfferTotals(tx, offerId)

    await recordAudit(tx, {
      entityType: 'commercial_offer',
      entityId: offerId,
      action: 'updated',
      actor,
      previousState: { lineCount: previous.length },
      newState: {
        lineCount,
        rowCount: position,
        totalHtva: totals.totalHtva,
        totalTtc: totals.totalTtc,
        milestoneCount: input.milestones?.length ?? null,
      },
      metadata: { form: BORDEREAU_FORM_CODE },
    })

    return { rowCount: position, lineCount, totals }
  })
}

// ─── Template ────────────────────────────────────────────────────────────────

export type TemplateLineRow = {
  id: string
  parentId: string | null
  lineType: BordereauLineType
  sourceCode: string | null
  displayCode: string | null
  designation: string
  description: string | null
  norme: string | null
  unit: string | null
  defaultQuantity: number | null
  position: number
  sourceRow: number | null
  children: TemplateLineRow[]
}

export type BordereauTemplateRow = {
  id: string
  code: string
  revision: number
  title: string
  sourceFileName: string | null
  sourceFileHash: string
  isActive: boolean
  createdAt: Date
  lines: TemplateLineRow[]
  stats: { sectionCount: number; categoryCount: number; lineCount: number }
}

function buildTemplateTree(rows: {
  id: string
  parentId: string | null
  lineType: BordereauLineType
  sourceCode: string | null
  displayCode: string | null
  designation: string
  description: string | null
  norme: string | null
  unit: string | null
  defaultQuantity: string | null
  position: number
  sourceRow: number | null
}[]): TemplateLineRow[] {
  const byId = new Map<string, TemplateLineRow>()
  for (const r of rows) {
    byId.set(r.id, { ...r, defaultQuantity: numOrNull(r.defaultQuantity), children: [] })
  }
  const roots: TemplateLineRow[] = []
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  const sortRec = (list: TemplateLineRow[]) => {
    list.sort((a, b) => a.position - b.position)
    list.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}

export async function getActiveBordereauTemplate(
  code = BORDEREAU_FORM_CODE,
): Promise<BordereauTemplateRow | null> {
  const [tpl] = await db
    .select()
    .from(bordereauTemplates)
    .where(and(eq(bordereauTemplates.code, code), eq(bordereauTemplates.isActive, true)))
    .limit(1)
  if (!tpl) return null
  return hydrateTemplate(tpl)
}

export async function getBordereauTemplateById(id: string): Promise<BordereauTemplateRow | null> {
  const [tpl] = await db.select().from(bordereauTemplates).where(eq(bordereauTemplates.id, id)).limit(1)
  if (!tpl) return null
  return hydrateTemplate(tpl)
}

async function hydrateTemplate(
  tpl: typeof bordereauTemplates.$inferSelect,
): Promise<BordereauTemplateRow> {
  const rows = await db
    .select({
      id: bordereauTemplateLines.id,
      parentId: bordereauTemplateLines.parentId,
      lineType: bordereauTemplateLines.lineType,
      sourceCode: bordereauTemplateLines.sourceCode,
      displayCode: bordereauTemplateLines.displayCode,
      designation: bordereauTemplateLines.designation,
      description: bordereauTemplateLines.description,
      norme: bordereauTemplateLines.norme,
      unit: bordereauTemplateLines.unit,
      defaultQuantity: bordereauTemplateLines.defaultQuantity,
      position: bordereauTemplateLines.position,
      sourceRow: bordereauTemplateLines.sourceRow,
    })
    .from(bordereauTemplateLines)
    .where(eq(bordereauTemplateLines.templateId, tpl.id))
    .orderBy(asc(bordereauTemplateLines.position))

  const lines = buildTemplateTree(rows)
  let sectionCount = 0
  let categoryCount = 0
  let lineCount = 0
  const walk = (n: TemplateLineRow) => {
    if (n.lineType === 'section') sectionCount++
    if (n.lineType === 'category') categoryCount++
    if (n.lineType === 'item' || n.lineType === 'spec') lineCount++
    n.children.forEach(walk)
  }
  lines.forEach(walk)

  return {
    id: tpl.id,
    code: tpl.code,
    revision: tpl.revision,
    title: tpl.title,
    sourceFileName: tpl.sourceFileName,
    sourceFileHash: tpl.sourceFileHash,
    isActive: tpl.isActive,
    createdAt: tpl.createdAt,
    lines,
    stats: { sectionCount, categoryCount, lineCount },
  }
}

/**
 * Seeds a new template revision from a parsed workbook.
 *
 * Prices are structurally absent — `bordereau_template_lines` has no price
 * column at all — so a catalogue can never carry money. The placeholder
 * quantities the blank form prints are kept as `default_quantity` for
 * fidelity, and are NOT copied when the template is cloned into an offer.
 */
export async function createTemplateFromPreview(
  preview: BordereauImportPreview,
  file: { name: string; hash: string; byteSize: number },
  userId: string,
  actor: AuditActor,
) {
  return db.transaction(async (tx) => {
    const [{ maxRevision }] = await tx
      .select({ maxRevision: sql<number>`coalesce(max(${bordereauTemplates.revision}), 0)` })
      .from(bordereauTemplates)
      .where(eq(bordereauTemplates.code, BORDEREAU_FORM_CODE))

    await tx
      .update(bordereauTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(bordereauTemplates.code, BORDEREAU_FORM_CODE), eq(bordereauTemplates.isActive, true)))

    const [tpl] = await tx
      .insert(bordereauTemplates)
      .values({
        code: BORDEREAU_FORM_CODE,
        revision: Number(maxRevision) + 1,
        title: 'Bordereau des prix',
        sourceFileName: file.name,
        sourceFileHash: file.hash,
        isActive: true,
        createdBy: userId,
      })
      .returning({ id: bordereauTemplates.id, revision: bordereauTemplates.revision })

    let position = 0
    const rows: (typeof bordereauTemplateLines.$inferInsert)[] = []

    const flatten = (node: BordereauPreviewLine, parentId: string | null) => {
      const priceable = node.lineType === 'item' || node.lineType === 'spec'
      const id = randomUUID()
      rows.push({
        id,
        templateId: tpl.id,
        parentId,
        lineType: node.lineType,
        sourceCode: node.sourceCode,
        displayCode: node.displayCode,
        designation: node.designation,
        description: node.description,
        norme: node.lineType === 'category' ? null : node.norme,
        unit: priceable ? node.unit : null,
        defaultQuantity: priceable && node.quantity !== null ? String(node.quantity) : null,
        position: position++,
        sourceRow: node.sourceRow,
      })
      for (const child of node.children) flatten(child, id)
    }
    for (const section of preview.sections) flatten(section, null)

    for (const chunk of chunked(rows)) await tx.insert(bordereauTemplateLines).values(chunk)

    await tx.insert(offerImports).values({
      templateId: tpl.id,
      fileName: file.name,
      fileHash: file.hash,
      byteSize: file.byteSize,
      lineCount: preview.stats.lineCount,
      stats: preview.stats,
      importedBy: userId,
    })

    await recordAudit(tx, {
      entityType: 'bordereau_template',
      entityId: tpl.id,
      action: 'imported',
      actor,
      newState: {
        revision: tpl.revision,
        sectionCount: preview.stats.sectionCount,
        categoryCount: preview.stats.categoryCount,
        lineCount: preview.stats.lineCount,
      },
      metadata: { form: BORDEREAU_FORM_CODE, fileName: file.name, fileHash: file.hash },
    })

    return { templateId: tpl.id, revision: tpl.revision, rowCount: position }
  })
}

/**
 * Clones the catalogue into an offer as an empty priced document.
 *
 * Quantities are deliberately NOT carried over. The template's are the blank
 * form's own placeholders; copying them would hand an offer a quantity nobody
 * entered, which is exactly the kind of manufactured figure this module
 * refuses to produce.
 */
export async function cloneTemplateIntoOffer(
  offerId: string,
  templateId: string,
  userId: string,
  actor: AuditActor,
) {
  const template = await getBordereauTemplateById(templateId)
  if (!template) return { success: false as const, error: 'Modèle introuvable' }

  const toInput = (n: TemplateLineRow): BordereauInputLine => ({
    lineType: n.lineType,
    sourceCode: n.sourceCode,
    displayCode: n.displayCode,
    designation: n.designation,
    description: n.description,
    norme: n.norme,
    unit: n.unit,
    quantity: null,
    unitPrice: null,
    sourceRow: n.sourceRow,
    children: n.children.map(toInput),
  })

  const result = await replaceOfferBordereau(
    offerId,
    { lines: template.lines.map(toInput) },
    userId,
    actor,
  )
  return { success: true as const, ...result, templateRevision: template.revision }
}

// ─── Import ledger ───────────────────────────────────────────────────────────

/**
 * The idempotency check. Returns the earlier import of the same bytes, if any,
 * so the caller can refuse instead of duplicating a commercial document.
 */
export async function findOfferImport(offerId: string, fileHash: string) {
  const [row] = await db
    .select({
      id: offerImports.id,
      fileName: offerImports.fileName,
      importedAt: offerImports.importedAt,
      importedByName: users.name,
      lineCount: offerImports.lineCount,
    })
    .from(offerImports)
    .leftJoin(users, eq(offerImports.importedBy, users.id))
    .where(and(eq(offerImports.offerId, offerId), eq(offerImports.fileHash, fileHash)))
    .limit(1)
  return row ?? null
}

export async function findTemplateImport(fileHash: string) {
  const [row] = await db
    .select({
      id: offerImports.id,
      templateId: offerImports.templateId,
      fileName: offerImports.fileName,
      importedAt: offerImports.importedAt,
      importedByName: users.name,
    })
    .from(offerImports)
    .leftJoin(users, eq(offerImports.importedBy, users.id))
    .where(and(eq(offerImports.fileHash, fileHash), sql`${offerImports.templateId} IS NOT NULL`))
    .limit(1)
  return row ?? null
}

export async function recordOfferImport(input: {
  offerId: string
  fileName: string
  fileHash: string
  byteSize: number
  lineCount: number
  stats: unknown
  userId: string
}) {
  await db.insert(offerImports).values({
    offerId: input.offerId,
    fileName: input.fileName,
    fileHash: input.fileHash,
    byteSize: input.byteSize,
    lineCount: input.lineCount,
    stats: input.stats as Record<string, unknown>,
    importedBy: input.userId,
  })
}

/**
 * Writes a parsed workbook into an offer: the tree, the milestones and the
 * header fields the sheet actually carried.
 *
 * The header is applied field by field and only where the workbook HAS a
 * value, so importing the blank template into an offer cannot blank out a
 * client name someone already entered. `clientId` and `projectId` are never
 * touched: the sheet's own references use a different scheme and binding on
 * them would guess.
 */
export async function applyImportToOffer(
  offerId: string,
  preview: BordereauImportPreview,
  file: { name: string; hash: string; byteSize: number },
  userId: string,
  actor: AuditActor,
) {
  const toInput = (n: BordereauPreviewLine): BordereauInputLine => ({
    lineType: n.lineType,
    sourceCode: n.sourceCode,
    displayCode: n.displayCode,
    designation: n.designation,
    description: n.description,
    norme: n.norme,
    unit: n.unit,
    quantity: n.quantity,
    unitPrice: n.unitPrice,
    plantSpeciesId: n.plantSpeciesId,
    decorativeMaterialId: n.decorativeMaterialId,
    sourceRow: n.sourceRow,
    children: n.children.map(toInput),
  })

  const toMilestone = (m: BordereauPreviewMilestone): BordereauInputMilestone => ({
    label: m.label,
    percentage: m.percentage,
    basis: m.basis,
    triggerEvent: m.triggerEvent,
  })

  const header = preview.header
  const patch: Record<string, unknown> = {}
  if (header.documentCode) patch.documentCode = header.documentCode
  if (header.formRevision !== null) patch.formRevision = header.formRevision
  if (header.offerDate) patch.offerDate = header.offerDate
  if (header.projectReferenceText) patch.projectReferenceText = header.projectReferenceText
  if (header.siteLocation) patch.siteLocation = header.siteLocation
  if (header.maitreDouvrage) patch.maitreDouvrage = header.maitreDouvrage
  if (header.validityDays !== null) patch.validityDays = header.validityDays

  if (Object.keys(patch).length) {
    await db.update(commercialOffers).set({ ...patch, updatedAt: new Date() })
      .where(eq(commercialOffers.id, offerId))
  }

  const result = await replaceOfferBordereau(
    offerId,
    {
      lines: preview.sections.map(toInput),
      milestones: preview.milestones.map(toMilestone),
    },
    userId,
    actor,
  )

  await recordOfferImport({
    offerId,
    fileName: file.name,
    fileHash: file.hash,
    byteSize: file.byteSize,
    lineCount: preview.stats.lineCount,
    stats: preview.stats,
    userId,
  })

  return result
}

// ─── Versions ────────────────────────────────────────────────────────────────

/**
 * Cuts a version: a full snapshot of the document as it stands.
 *
 * The snapshot is the evidence, not a pointer to live rows — an approved
 * FOR-CO-02 must still read exactly as it was signed after the draft it came
 * from has been edited a dozen times.
 */
export async function createOfferVersion(
  offerId: string,
  input: { label?: string | null; changeSummary: string },
  userId: string,
  actor: AuditActor,
) {
  const document = await getOfferBordereau(offerId)
  if (!document) return { success: false as const, error: 'Offre introuvable' }

  return db.transaction(async (tx) => {
    const [{ maxNo }] = await tx
      .select({ maxNo: sql<number>`coalesce(max(${offerVersions.versionNo}), 0)` })
      .from(offerVersions)
      .where(eq(offerVersions.offerId, offerId))

    const versionNo = Number(maxNo) + 1

    const [created] = await tx
      .insert(offerVersions)
      .values({
        offerId,
        versionNo,
        label: input.label ?? null,
        status: 'draft',
        snapshot: {
          offer: document.offer,
          sections: document.sections,
          milestones: document.milestones,
          totals: document.totals,
        } as unknown as Record<string, unknown>,
        totalHtva: document.totals.totalHtva.toFixed(3),
        totalVat: document.totals.totalVat.toFixed(3),
        totalTtc: document.totals.totalTtc.toFixed(3),
        vatRate: document.offer.vatRate.toFixed(4),
        lineCount: document.totals.lineCount,
        changeSummary: input.changeSummary,
        createdBy: userId,
      })
      .returning({ id: offerVersions.id, versionNo: offerVersions.versionNo })

    await tx
      .update(commercialOffers)
      .set({ currentVersionNo: versionNo, updatedAt: new Date() })
      .where(eq(commercialOffers.id, offerId))

    await recordAudit(tx, {
      entityType: 'commercial_offer',
      entityId: offerId,
      action: 'created',
      actor,
      newState: {
        versionNo,
        totalHtva: document.totals.totalHtva,
        totalTtc: document.totals.totalTtc,
        lineCount: document.totals.lineCount,
      },
      metadata: { form: BORDEREAU_FORM_CODE, versionId: created.id, changeSummary: input.changeSummary },
    })

    return { success: true as const, versionId: created.id, versionNo }
  })
}

/**
 * Approves a version and locks the document.
 *
 * The previously approved version is marked `superseded` rather than altered
 * or removed: history that was used is never unmade. The database trigger
 * `offer_versions_guard` enforces that independently of this code path.
 */
export async function approveOfferVersion(
  offerId: string,
  versionId: string,
  userId: string,
  actor: AuditActor,
) {
  return db.transaction(async (tx) => {
    const [version] = await tx
      .select()
      .from(offerVersions)
      .where(and(eq(offerVersions.id, versionId), eq(offerVersions.offerId, offerId)))
      .limit(1)
    if (!version) return { success: false as const, error: 'Version introuvable' }
    if (version.status === 'superseded') {
      return { success: false as const, error: 'Cette version a été remplacée ; elle ne peut plus être approuvée.' }
    }

    const [offer] = await tx
      .select({ approvedVersionId: commercialOffers.approvedVersionId, projectId: commercialOffers.projectId })
      .from(commercialOffers)
      .where(eq(commercialOffers.id, offerId))
      .limit(1)
    if (!offer) return { success: false as const, error: 'Offre introuvable' }

    if (offer.approvedVersionId && offer.approvedVersionId !== versionId) {
      await tx
        .update(offerVersions)
        .set({ status: 'superseded' })
        .where(eq(offerVersions.id, offer.approvedVersionId))
    }

    const now = new Date()
    if (version.status !== 'approved') {
      await tx
        .update(offerVersions)
        .set({ status: 'approved', approvedBy: userId, approvedAt: now })
        .where(eq(offerVersions.id, versionId))
    }

    await tx
      .update(commercialOffers)
      .set({ approvedVersionId: versionId, lockedAt: now, updatedAt: now })
      .where(eq(commercialOffers.id, offerId))

    await recordAudit(tx, {
      entityType: 'commercial_offer',
      entityId: offerId,
      action: 'approved',
      actor,
      previousState: { approvedVersionId: offer.approvedVersionId },
      newState: {
        approvedVersionId: versionId,
        versionNo: version.versionNo,
        totalTtc: num(version.totalTtc),
      },
      metadata: { form: BORDEREAU_FORM_CODE },
    })

    return { success: true as const, versionNo: version.versionNo }
  })
}

/**
 * Unlocks an approved document for revision.
 *
 * The approved version is marked `superseded` and kept in full. Nothing is
 * overwritten, so the figure the client was given remains readable.
 */
export async function reopenOfferBordereau(
  offerId: string,
  reason: string,
  userId: string,
  actor: AuditActor,
) {
  return db.transaction(async (tx) => {
    const [offer] = await tx
      .select({ approvedVersionId: commercialOffers.approvedVersionId })
      .from(commercialOffers)
      .where(eq(commercialOffers.id, offerId))
      .limit(1)
    if (!offer) return { success: false as const, error: 'Offre introuvable' }
    if (!offer.approvedVersionId) return { success: false as const, error: "Ce bordereau n'est pas verrouillé." }

    await tx
      .update(offerVersions)
      .set({ status: 'superseded' })
      .where(eq(offerVersions.id, offer.approvedVersionId))

    await tx
      .update(commercialOffers)
      .set({ approvedVersionId: null, lockedAt: null, updatedAt: new Date() })
      .where(eq(commercialOffers.id, offerId))

    await recordAudit(tx, {
      entityType: 'commercial_offer',
      entityId: offerId,
      action: 'reopened',
      actor,
      previousState: { approvedVersionId: offer.approvedVersionId },
      newState: { approvedVersionId: null },
      metadata: { form: BORDEREAU_FORM_CODE, reason },
    })

    return { success: true as const, supersededVersionId: offer.approvedVersionId }
  })
}

// ─── Contract amount ─────────────────────────────────────────────────────────

export type ContractAmountProposal = {
  projectId: string
  projectReference: string
  offerId: string
  offerReference: string
  /** The approved FOR-CO-02 total, TTC. */
  suggestedAmount: number
  currentContractAmount: number | null
  /** The internal cost ceiling — shown so nobody confuses the two figures. */
  approvedBudget: number | null
}

/**
 * The contract-amount SUGGESTION a won FOR-CO-02 produces.
 *
 * Read-only, deliberately. Nothing is written until a human confirms, and even
 * then `approved_budget` and `actual_revenue` are left untouched: the first is
 * the internal cost ceiling every consumption percentage is measured against,
 * the second is realised revenue.
 */
export async function getContractAmountProposal(offerId: string): Promise<ContractAmountProposal | null> {
  const [row] = await db
    .select({
      offerId: commercialOffers.id,
      offerReference: commercialOffers.reference,
      status: commercialOffers.status,
      approvedVersionId: commercialOffers.approvedVersionId,
      totalTtc: commercialOffers.totalTtc,
      totalHtva: commercialOffers.totalHtva,
      projectId: commercialOffers.projectId,
      projectReference: projects.reference,
      contractAmount: projects.contractAmount,
      approvedBudget: projects.approvedBudget,
    })
    .from(commercialOffers)
    .leftJoin(projects, eq(commercialOffers.projectId, projects.id))
    .where(and(eq(commercialOffers.id, offerId), isNull(commercialOffers.deletedAt)))
    .limit(1)

  if (!row || !row.projectId || row.status !== 'gagnee' || !row.approvedVersionId) return null

  return {
    projectId: row.projectId,
    projectReference: row.projectReference ?? '',
    offerId: row.offerId,
    offerReference: row.offerReference,
    suggestedAmount: num(row.totalTtc ?? row.totalHtva),
    currentContractAmount: numOrNull(row.contractAmount),
    approvedBudget: numOrNull(row.approvedBudget),
  }
}

/**
 * Writes the contract amount a human confirmed.
 *
 * Both figures are kept — what the offer suggested and what was actually
 * approved — together with the user and the timestamp, so a confirmation that
 * departed from the offer is visible rather than merely absent.
 *
 * `approved_budget` is NOT written. That is the whole point of this column.
 */
export async function confirmContractAmount(
  projectId: string,
  input: { offerId: string; suggestedAmount: number; approvedAmount: number },
  userId: string,
  actor: AuditActor,
) {
  return db.transaction(async (tx) => {
    const [project] = await tx
      .select({
        id: projects.id,
        contractAmount: projects.contractAmount,
        approvedBudget: projects.approvedBudget,
      })
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1)
    if (!project) return { success: false as const, error: 'Projet introuvable' }

    const now = new Date()
    await tx
      .update(projects)
      .set({
        contractAmount: round3(input.approvedAmount).toFixed(3),
        contractAmountSuggested: round3(input.suggestedAmount).toFixed(3),
        contractAmountSourceOfferId: input.offerId,
        contractAmountConfirmedBy: userId,
        contractAmountConfirmedAt: now,
        updatedAt: now,
      })
      .where(eq(projects.id, projectId))

    await recordAudit(tx, {
      entityType: 'project_contract_amount',
      entityId: projectId,
      action: 'approved',
      actor,
      previousState: { contractAmount: numOrNull(project.contractAmount) },
      newState: {
        suggestedAmount: round3(input.suggestedAmount),
        approvedAmount: round3(input.approvedAmount),
        offerId: input.offerId,
      },
      metadata: {
        form: BORDEREAU_FORM_CODE,
        // Recorded so an auditor can see the two figures were never conflated.
        approvedBudgetUnchanged: numOrNull(project.approvedBudget),
      },
    })

    return { success: true as const }
  })
}

export { syncStoredLineTotals }
