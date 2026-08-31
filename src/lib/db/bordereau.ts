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
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'superseded'
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
  /**
   * Pourquoi cette version a été remplacée. Non nul uniquement sur une version
   * `superseded`, et jamais réécrit — c'est l'information documentée exigée par
   * ISO 9001:2015 §8.2.3.2 sur les modifications d'exigences.
   */
  reopenReason: string | null
  reopenedByName: string | null
  reopenedAt: Date | null
  /** Qui a soumis la version pour revue, et quand (ISO 9001:2015 §7.5.2 b). */
  submittedByName: string | null
  submittedAt: Date | null
  /** Qui a tranché la revue — approbation comme refus — et quand. */
  reviewedByName: string | null
  reviewedAt: Date | null
  /** Non nul si et seulement si la version a été refusée. */
  rejectionReason: string | null
  /** Soumission et revue par la même personne : signalé, pas interdit. */
  selfReviewed: boolean
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
  /**
   * Ce qui a été importé dans ce bordereau, et où le classeur d'origine est
   * archivé. Sans cela l'ERP affichait des totaux dont il ne pouvait plus
   * montrer la source — la moitié « provenance » de la maîtrise documentaire
   * existait en base mais nulle part à l'écran.
   */
  imports: BordereauImportRow[]
  /** True while the document is approved: edits and imports are refused. */
  locked: boolean
}

export type BordereauImportRow = {
  id: string
  fileName: string
  /** SHA-256 : l'archive est prouvée être l'octet-pour-octet importé. */
  fileHash: string
  byteSize: number
  lineCount: number
  importedAt: Date
  importedByName: string | null
  /** Null quand l'archivage était désactivé, ou pour un import antérieur à 0037. */
  sourceFileUrl: string | null
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

  const [lineRows, milestoneRows, versionRows, importRows] = await Promise.all([
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
      reopenReason: offerVersions.reopenReason,
      reopenedAt: offerVersions.reopenedAt,
      reopenedById: offerVersions.reopenedBy,
      submittedAt: offerVersions.submittedAt,
      submittedById: offerVersions.submittedBy,
      reviewedAt: offerVersions.reviewedAt,
      reviewedById: offerVersions.reviewedBy,
      rejectionReason: offerVersions.rejectionReason,
    })
      .from(offerVersions)
      .leftJoin(users, eq(offerVersions.createdBy, users.id))
      .where(eq(offerVersions.offerId, offerId))
      .orderBy(desc(offerVersions.versionNo)),
    // La provenance : quel classeur a produit ce document, et où il est archivé.
    getOfferImportHistory(offerId),
  ])

  // Approbateurs et personnes ayant rouvert : mêmes utilisateurs, un seul aller-retour.
  const stampIds = [
    ...versionRows.map((v) => v.approvedById),
    ...versionRows.map((v) => v.reopenedById),
    ...versionRows.map((v) => v.submittedById),
    ...versionRows.map((v) => v.reviewedById),
  ].filter((v): v is string => !!v)
  const stampUsers = stampIds.length
    ? await db.select({ id: users.id, name: users.name }).from(users)
        .where(inArray(users.id, [...new Set(stampIds)]))
    : []
  const userName = new Map(stampUsers.map((a) => [a.id, a.name]))

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
    imports: importRows.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      fileHash: r.fileHash,
      byteSize: r.byteSize,
      lineCount: r.lineCount,
      importedAt: r.importedAt,
      importedByName: r.importedByName,
      sourceFileUrl: r.sourceFileUrl,
    })),
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
      approvedByName: v.approvedById ? userName.get(v.approvedById) ?? null : null,
      approvedAt: v.approvedAt,
      reopenReason: v.reopenReason,
      reopenedByName: v.reopenedById ? userName.get(v.reopenedById) ?? null : null,
      reopenedAt: v.reopenedAt,
      submittedByName: v.submittedById ? userName.get(v.submittedById) ?? null : null,
      submittedAt: v.submittedAt,
      reviewedByName: v.reviewedById ? userName.get(v.reviewedById) ?? null : null,
      reviewedAt: v.reviewedAt,
      rejectionReason: v.rejectionReason,
      // Auteur et relecteur confondus : ce n'est pas interdit dans une PME,
      // mais un auditeur doit pouvoir le voir sans recouper deux colonnes.
      selfReviewed:
        v.reviewedById !== null && v.submittedById !== null && v.reviewedById === v.submittedById,
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

/**
 * Guard used by every write path. Returns the refusal message, or null.
 *
 * Two distinct locks, and conflating them would hide one of the two:
 *
 * - **Approuvé** — le document est la preuve d'un engagement commercial. Il se
 *   rouvre par un acte tracé, jamais par une modification silencieuse.
 * - **En revue** — une version est soumise et attend une décision. Laisser le
 *   document modifiable pendant ce temps ferait changer l'objet revu sous les
 *   yeux du relecteur, ce qui vide la revue de son sens (ISO 9001 §7.5.2 b).
 *   Le refus se lève en approuvant ou en refusant la soumission.
 */
export async function assertEditable(offerId: string): Promise<string | null> {
  const [offer] = await db
    .select({ approvedVersionId: commercialOffers.approvedVersionId })
    .from(commercialOffers)
    .where(eq(commercialOffers.id, offerId))
    .limit(1)
  if (!offer) return 'Offre introuvable'
  if (offer.approvedVersionId) {
    return 'Ce bordereau est approuvé et verrouillé. Rouvrez-le en nouvelle version pour le modifier.'
  }

  const [submitted] = await db
    .select({ versionNo: offerVersions.versionNo })
    .from(offerVersions)
    .where(and(eq(offerVersions.offerId, offerId), eq(offerVersions.status, 'submitted')))
    .limit(1)
  if (submitted) {
    return `La version ${submitted.versionNo} est en cours de revue. ` +
      'Approuvez-la ou refusez-la avant de reprendre les modifications.'
  }

  return null
}

/**
 * @deprecated Nom conservé le temps que les appelants migrent ; `assertEditable`
 * dit ce que la fonction vérifie réellement depuis qu'une revue peut aussi
 * bloquer l'édition.
 */
export const assertNotLocked = assertEditable

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

// ─── Édition ligne à ligne, dans l'ERP ───────────────────────────────────────
//
// `replaceOfferBordereau` réécrit le document entier : c'est ce qu'il faut pour
// un import, et exactement ce qu'il ne faut pas pour corriger un prix. Le
// remplacement régénère TOUS les identifiants de ligne, donc toute référence
// posée sur une ligne — un rattachement d'espèce, demain un poste d'estimation
// de chantier — serait rompue par une simple correction de libellé. Les quatre
// opérations ci-dessous modifient la ligne visée et rien d'autre, conservent
// son identifiant, et journalisent l'ancienne et la nouvelle valeur.
//
// Toutes sont portées par l'offre : `offerId` fait partie de la clause WHERE de
// chaque écriture, jamais seulement de la signature. Une ligne d'une autre
// offre n'est donc pas atteignable, même en forgeant la requête.

/** Champs qu'un utilisateur peut corriger sur une ligne existante. */
export type BordereauLinePatch = {
  designation?: string
  description?: string | null
  norme?: string | null
  unit?: string | null
  sourceCode?: string | null
  displayCode?: string | null
  quantity?: number | null
  unitPrice?: number | null
}

type LineIdentity = {
  id: string
  parentId: string | null
  lineType: BordereauLineType
  designation: string
  description: string | null
  norme: string | null
  unit: string | null
  sourceCode: string | null
  displayCode: string | null
  quantity: string | null
  unitPrice: string | null
  position: number
}

const LINE_IDENTITY = {
  id: offerLineItems.id,
  parentId: offerLineItems.parentId,
  lineType: offerLineItems.lineType,
  designation: offerLineItems.designation,
  description: offerLineItems.description,
  norme: offerLineItems.norme,
  unit: offerLineItems.unit,
  sourceCode: offerLineItems.sourceCode,
  displayCode: offerLineItems.displayCode,
  quantity: offerLineItems.quantity,
  unitPrice: offerLineItems.unitPrice,
  position: offerLineItems.position,
}

/** La ligne, si et seulement si elle appartient bien à cette offre. */
async function loadLine(
  tx: Executor,
  offerId: string,
  lineId: string,
): Promise<LineIdentity | null> {
  const [row] = await tx
    .select(LINE_IDENTITY)
    .from(offerLineItems)
    .where(and(eq(offerLineItems.id, lineId), eq(offerLineItems.offerId, offerId)))
    .limit(1)
  return (row as LineIdentity | undefined) ?? null
}

/**
 * Renumérote `position` en parcours préfixe de l'arbre.
 *
 * `position` est un compteur unique en ordre de document — c'est ce qui rend
 * l'ordre d'impression total et stable, et l'export en dépend. Après un ajout
 * ou un déplacement il faut donc le reconstruire entièrement, sinon deux lignes
 * finissent par partager un rang et leur ordre relatif devient celui que la
 * base veut bien rendre.
 *
 * `order` permet à l'appelant d'imposer l'ordre des enfants d'un parent donné ;
 * partout ailleurs l'ordre courant est conservé.
 */
async function renumberOfferLines(
  tx: Executor,
  offerId: string,
  order?: { parentId: string | null; childIds: string[] },
) {
  const rows = await tx
    .select({
      id: offerLineItems.id,
      parentId: offerLineItems.parentId,
      position: offerLineItems.position,
    })
    .from(offerLineItems)
    .where(eq(offerLineItems.offerId, offerId))

  const children = new Map<string | null, { id: string; position: number }[]>()
  for (const r of rows) {
    const key = r.parentId
    if (!children.has(key)) children.set(key, [])
    children.get(key)!.push({ id: r.id, position: r.position })
  }
  for (const list of children.values()) list.sort((a, b) => a.position - b.position)

  if (order) {
    const rank = new Map(order.childIds.map((id, i) => [id, i]))
    const list = children.get(order.parentId)
    if (list) {
      list.sort((a, b) => {
        const ra = rank.get(a.id)
        const rb = rank.get(b.id)
        // Une ligne absente de l'ordre demandé garde son rang relatif, derrière
        // celles qui y figurent : l'appelant n'a pas à énumérer toute la fratrie.
        if (ra === undefined && rb === undefined) return a.position - b.position
        if (ra === undefined) return 1
        if (rb === undefined) return -1
        return ra - rb
      })
    }
  }

  const assigned: { id: string; position: number }[] = []
  let next = 0
  const walk = (parentId: string | null) => {
    for (const child of children.get(parentId) ?? []) {
      assigned.push({ id: child.id, position: next++ })
      walk(child.id)
    }
  }
  walk(null)

  for (const chunk of chunked(assigned, 500)) {
    const values = sql.join(
      chunk.map((a) => sql`(${a.id}::uuid, ${a.position}::integer)`),
      sql`, `,
    )
    await tx.execute(sql`
      UPDATE offer_line_items AS l
         SET position = v.pos
        FROM (VALUES ${values}) AS v(id, pos)
       WHERE l.id = v.id AND l.offer_id = ${offerId}
    `)
  }
}

/** Le parent demandé existe-t-il dans CETTE offre, et peut-il porter un enfant ? */
async function validateParent(
  tx: Executor,
  offerId: string,
  parentId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!parentId) return { ok: true }
  const parent = await loadLine(tx, offerId, parentId)
  if (!parent) return { ok: false, error: "Le parent n'appartient pas à ce bordereau" }
  if (parent.lineType !== 'section' && parent.lineType !== 'category') {
    return { ok: false, error: 'Une ligne ne peut être rattachée qu\'à une section ou une catégorie' }
  }
  return { ok: true }
}

/** Ajoute une ligne — section, catégorie, poste chiffrable ou spécification. */
export async function createBordereauLine(
  offerId: string,
  input: {
    parentId?: string | null
    lineType: BordereauLineType
    designation: string
    description?: string | null
    norme?: string | null
    unit?: string | null
    sourceCode?: string | null
    displayCode?: string | null
    quantity?: number | null
    unitPrice?: number | null
  },
  userId: string,
  actor: AuditActor,
) {
  return db.transaction(async (tx) => {
    const parentId = input.parentId ?? null
    const parentCheck = await validateParent(tx, offerId, parentId)
    if (!parentCheck.ok) return { success: false as const, error: parentCheck.error }

    const priceable = input.lineType === 'item' || input.lineType === 'spec'
    const quantity = priceable ? input.quantity ?? null : null
    const unitPrice = priceable ? input.unitPrice ?? null : null
    const total = lineTotal(quantity, unitPrice)

    const [{ nextPosition }] = await tx
      .select({ nextPosition: sql<number>`coalesce(max(${offerLineItems.position}), -1) + 1` })
      .from(offerLineItems)
      .where(eq(offerLineItems.offerId, offerId))

    const [created] = await tx
      .insert(offerLineItems)
      .values({
        offerId,
        parentId,
        lineType: input.lineType,
        // Rang provisoire : la renumérotation qui suit le replace au bon endroit
        // de l'arbre, en queue de sa fratrie.
        position: Number(nextPosition),
        designation: input.designation,
        description: input.description ?? null,
        norme: input.lineType === 'category' ? null : input.norme ?? null,
        unit: priceable ? input.unit ?? null : null,
        sourceCode: input.sourceCode ?? null,
        displayCode: input.displayCode ?? null,
        quantity: quantity === null ? null : String(quantity),
        unitPrice: unitPrice === null ? null : String(unitPrice),
        total: total === null ? null : total.toFixed(3),
        createdBy: userId,
      })
      .returning({ id: offerLineItems.id })

    await renumberOfferLines(tx, offerId)
    const totals = await syncOfferTotals(tx, offerId)

    await recordAudit(tx, {
      entityType: 'bordereau_line',
      entityId: created.id,
      action: 'created',
      actor,
      newState: {
        lineType: input.lineType,
        designation: input.designation,
        unit: priceable ? input.unit ?? null : null,
        quantity,
        unitPrice,
        total,
      },
      metadata: { form: BORDEREAU_FORM_CODE, offerId, parentId },
    })

    return { success: true as const, lineId: created.id, totals }
  })
}

/**
 * Corrige une ligne existante.
 *
 * `lineType` n'est délibérément pas modifiable : transformer une catégorie en
 * poste chiffrable laisserait ses enfants rattachés à une ligne qui ne peut pas
 * en porter, et transformer un poste en catégorie effacerait ses chiffres sans
 * le dire. Le changement de nature se fait en supprimant et en recréant, ce qui
 * laisse deux traces lisibles au lieu d'une mutation silencieuse.
 *
 * Seules les clés RÉELLEMENT présentes sont écrites : `undefined` veut dire
 * « ne touche pas », `null` veut dire « vide ce champ ». Confondre les deux
 * effacerait la spécification d'une ligne dont on corrige le prix.
 */
export async function updateBordereauLine(
  offerId: string,
  lineId: string,
  patch: BordereauLinePatch,
  actor: AuditActor,
) {
  return db.transaction(async (tx) => {
    const before = await loadLine(tx, offerId, lineId)
    if (!before) return { success: false as const, error: 'Ligne introuvable dans ce bordereau' }

    const priceable = before.lineType === 'item' || before.lineType === 'spec'
    if (!priceable && (patch.quantity !== undefined || patch.unitPrice !== undefined)) {
      return {
        success: false as const,
        error: 'Une section ou une catégorie ne porte ni quantité ni prix : son montant est la somme de ses lignes',
      }
    }

    const set: Record<string, unknown> = { updatedAt: new Date() }
    if (patch.designation !== undefined) set.designation = patch.designation
    if (patch.description !== undefined) set.description = patch.description
    if (patch.norme !== undefined) set.norme = before.lineType === 'category' ? null : patch.norme
    if (patch.sourceCode !== undefined) set.sourceCode = patch.sourceCode
    if (patch.displayCode !== undefined) set.displayCode = patch.displayCode
    if (priceable && patch.unit !== undefined) set.unit = patch.unit
    if (priceable && patch.quantity !== undefined) {
      set.quantity = patch.quantity === null ? null : String(patch.quantity)
    }
    if (priceable && patch.unitPrice !== undefined) {
      set.unitPrice = patch.unitPrice === null ? null : String(patch.unitPrice)
    }

    const nextQuantity = patch.quantity !== undefined ? patch.quantity : numOrNull(before.quantity)
    const nextUnitPrice = patch.unitPrice !== undefined ? patch.unitPrice : numOrNull(before.unitPrice)
    if (priceable) {
      const total = lineTotal(nextQuantity, nextUnitPrice)
      set.total = total === null ? null : total.toFixed(3)
    }

    await tx
      .update(offerLineItems)
      .set(set)
      .where(and(eq(offerLineItems.id, lineId), eq(offerLineItems.offerId, offerId)))

    const totals = await syncOfferTotals(tx, offerId)

    // Ne journaliser que ce qui a effectivement changé : une ligne de journal
    // « prix : 450 → 450 » noie celles qui disent quelque chose.
    const changed: Record<string, { from: unknown; to: unknown }> = {}
    const note = (key: string, from: unknown, to: unknown) => {
      if (from !== to) changed[key] = { from, to }
    }
    if (patch.designation !== undefined) note('designation', before.designation, patch.designation)
    if (patch.description !== undefined) note('description', before.description, patch.description)
    if (patch.norme !== undefined) note('norme', before.norme, set.norme)
    if (patch.sourceCode !== undefined) note('sourceCode', before.sourceCode, patch.sourceCode)
    if (patch.displayCode !== undefined) note('displayCode', before.displayCode, patch.displayCode)
    if (priceable && patch.unit !== undefined) note('unit', before.unit, patch.unit)
    if (priceable && patch.quantity !== undefined) note('quantity', numOrNull(before.quantity), patch.quantity)
    if (priceable && patch.unitPrice !== undefined) note('unitPrice', numOrNull(before.unitPrice), patch.unitPrice)

    if (Object.keys(changed).length > 0) {
      await recordAudit(tx, {
        entityType: 'bordereau_line',
        entityId: lineId,
        action: 'updated',
        actor,
        previousState: Object.fromEntries(
          Object.entries(changed).map(([k, v]) => [k, v.from]),
        ),
        newState: Object.fromEntries(
          Object.entries(changed).map(([k, v]) => [k, v.to]),
        ),
        metadata: { form: BORDEREAU_FORM_CODE, offerId, designation: before.designation },
      })
    }

    return { success: true as const, changed, totals }
  })
}

/**
 * Supprime une ligne et, par cascade, tout ce qu'elle porte.
 *
 * Une suppression physique, à dessein : une ligne de bordereau en brouillon
 * n'est pas encore un enregistrement qualité, et un « supprimé logiquement »
 * dans l'arbre imprimé imposerait un filtre à chaque calcul, chaque export et
 * chaque récapitulatif. Ce qui est conservé, c'est la trace : le journal garde
 * la ligne supprimée avec ses chiffres, et une version figée avant la
 * suppression la garde en entier dans son instantané.
 */
export async function deleteBordereauLine(offerId: string, lineId: string, actor: AuditActor) {
  return db.transaction(async (tx) => {
    const before = await loadLine(tx, offerId, lineId)
    if (!before) return { success: false as const, error: 'Ligne introuvable dans ce bordereau' }

    const [{ descendants }] = await tx
      .select({ descendants: sql<number>`count(*)::int` })
      .from(offerLineItems)
      .where(and(eq(offerLineItems.offerId, offerId), eq(offerLineItems.parentId, lineId)))

    await tx
      .delete(offerLineItems)
      .where(and(eq(offerLineItems.id, lineId), eq(offerLineItems.offerId, offerId)))

    await renumberOfferLines(tx, offerId)
    const totals = await syncOfferTotals(tx, offerId)

    await recordAudit(tx, {
      entityType: 'bordereau_line',
      entityId: lineId,
      action: 'deleted',
      actor,
      previousState: {
        lineType: before.lineType,
        designation: before.designation,
        unit: before.unit,
        quantity: numOrNull(before.quantity),
        unitPrice: numOrNull(before.unitPrice),
      },
      metadata: {
        form: BORDEREAU_FORM_CODE,
        offerId,
        // Supprimer une catégorie emporte ses lignes : le nombre est dit.
        directChildrenRemoved: Number(descendants),
      },
    })

    return { success: true as const, directChildrenRemoved: Number(descendants), totals }
  })
}

/**
 * Déplace une ligne : changement de catégorie, ou simple réordonnancement.
 *
 * `beforeLineId` désigne la position visée dans la fratrie du nouveau parent :
 * la ligne se place JUSTE AVANT elle, ou en queue si l'argument est nul.
 */
export async function moveBordereauLine(
  offerId: string,
  lineId: string,
  target: { parentId: string | null; beforeLineId?: string | null },
  actor: AuditActor,
) {
  return db.transaction(async (tx) => {
    const before = await loadLine(tx, offerId, lineId)
    if (!before) return { success: false as const, error: 'Ligne introuvable dans ce bordereau' }

    const parentId = target.parentId ?? null
    if (parentId === lineId) {
      return { success: false as const, error: 'Une ligne ne peut pas être son propre parent' }
    }

    const parentCheck = await validateParent(tx, offerId, parentId)
    if (!parentCheck.ok) return { success: false as const, error: parentCheck.error }

    // Un cycle rendrait l'arbre irreconstructible : les nœuds concernés
    // disparaîtraient de l'affichage et de tous les totaux sans erreur visible.
    if (parentId) {
      const all = await tx
        .select({ id: offerLineItems.id, parentId: offerLineItems.parentId })
        .from(offerLineItems)
        .where(eq(offerLineItems.offerId, offerId))
      const byId = new Map(all.map((r) => [r.id, r.parentId]))
      let cursor: string | null = parentId
      const seen = new Set<string>()
      while (cursor) {
        if (cursor === lineId) {
          return { success: false as const, error: 'Déplacement impossible : la cible est une descendante de cette ligne' }
        }
        if (seen.has(cursor)) break
        seen.add(cursor)
        cursor = byId.get(cursor) ?? null
      }
    }

    await tx
      .update(offerLineItems)
      .set({ parentId, updatedAt: new Date() })
      .where(and(eq(offerLineItems.id, lineId), eq(offerLineItems.offerId, offerId)))

    // Ordre demandé dans la fratrie cible, la ligne insérée avant `beforeLineId`.
    const siblings = await tx
      .select({ id: offerLineItems.id, position: offerLineItems.position })
      .from(offerLineItems)
      .where(
        and(
          eq(offerLineItems.offerId, offerId),
          parentId === null ? isNull(offerLineItems.parentId) : eq(offerLineItems.parentId, parentId),
        ),
      )
      .orderBy(asc(offerLineItems.position))

    const rest = siblings.map((s) => s.id).filter((id) => id !== lineId)
    const at = target.beforeLineId ? rest.indexOf(target.beforeLineId) : -1
    const childIds = at >= 0
      ? [...rest.slice(0, at), lineId, ...rest.slice(at)]
      : [...rest, lineId]

    await renumberOfferLines(tx, offerId, { parentId, childIds })
    const totals = await syncOfferTotals(tx, offerId)

    await recordAudit(tx, {
      entityType: 'bordereau_line',
      entityId: lineId,
      action: 'moved',
      actor,
      previousState: { parentId: before.parentId },
      newState: { parentId },
      metadata: { form: BORDEREAU_FORM_CODE, offerId, designation: before.designation },
    })

    return { success: true as const, totals }
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

/**
 * Le modèle actif, SANS ses 266 lignes.
 *
 * `getActiveBordereauTemplate` hydrate tout l'arbre : c'est ce qu'il faut pour
 * le cloner, et bien trop pour afficher « rév. 2, 266 lignes » en tête d'un
 * écran. Cette lecture-ci compte côté base et ne rapatrie rien d'autre.
 */
export type BordereauTemplateSummary = {
  id: string
  code: string
  revision: number
  title: string
  sourceFileName: string | null
  sourceFileHash: string
  createdAt: Date
  createdByName: string | null
  sectionCount: number
  categoryCount: number
  lineCount: number
}

export async function getBordereauTemplateSummary(
  code = BORDEREAU_FORM_CODE,
): Promise<BordereauTemplateSummary | null> {
  const [tpl] = await db
    .select({
      id: bordereauTemplates.id,
      code: bordereauTemplates.code,
      revision: bordereauTemplates.revision,
      title: bordereauTemplates.title,
      sourceFileName: bordereauTemplates.sourceFileName,
      sourceFileHash: bordereauTemplates.sourceFileHash,
      createdAt: bordereauTemplates.createdAt,
      createdByName: users.name,
    })
    .from(bordereauTemplates)
    .leftJoin(users, eq(bordereauTemplates.createdBy, users.id))
    .where(and(eq(bordereauTemplates.code, code), eq(bordereauTemplates.isActive, true)))
    .limit(1)
  if (!tpl) return null

  const [counts] = await db
    .select({
      sectionCount: sql<number>`count(*) filter (where ${bordereauTemplateLines.lineType} = 'section')::int`,
      categoryCount: sql<number>`count(*) filter (where ${bordereauTemplateLines.lineType} = 'category')::int`,
      lineCount: sql<number>`count(*) filter (where ${bordereauTemplateLines.lineType} in ('item', 'spec'))::int`,
    })
    .from(bordereauTemplateLines)
    .where(eq(bordereauTemplateLines.templateId, tpl.id))

  return {
    ...tpl,
    sectionCount: Number(counts?.sectionCount ?? 0),
    categoryCount: Number(counts?.categoryCount ?? 0),
    lineCount: Number(counts?.lineCount ?? 0),
  }
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
  file: {
    name: string
    hash: string
    byteSize: number
    /**
     * Le formulaire vierge officiel, archivé tel quel.
     *
     * Il ne porte aucun prix, mais il EST un document maîtrisé : c'est le
     * formulaire FOR-CO-02 du registre LIS-MI-01, dans sa révision en vigueur,
     * et c'est la forme que chaque devis futur reprend. Le conserver relève de
     * la maîtrise de l'information documentée (§7.5.3.2) au même titre qu'un
     * bordereau chiffré — pour une raison différente : l'un prouve un montant,
     * l'autre prouve la version du formulaire employée.
     */
    sourceFile?: { url: string; publicId: string } | null
    archiveNote?: 'stored' | 'disabled'
  },
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
      stats: {
        ...(preview.stats as unknown as Record<string, unknown>),
        sourceArchive: file.archiveNote ?? (file.sourceFile ? 'stored' : 'disabled'),
      },
      importedBy: userId,
      sourceFileUrl: file.sourceFile?.url ?? null,
      sourceFilePublicId: file.sourceFile?.publicId ?? null,
      sourceFileStoredAt: file.sourceFile ? new Date() : null,
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
  /**
   * Le classeur d'origine archivé (ISO 9001:2015 §7.5.3.2). Absent si
   * l'archivage a échoué ou n'est pas configuré : perdre la copie ne doit pas
   * faire perdre l'import, dont le hash reste la garantie d'idempotence.
   */
  sourceFile?: { url: string; publicId: string } | null
  /**
   * Pourquoi il y a — ou non — une archive. `disabled` veut dire que
   * l'exigence a été levée par configuration : la lacune est alors DÉCLARÉE
   * dans le registre, au lieu d'être un NULL qu'un auditeur devra interpréter
   * des années plus tard sans pouvoir distinguer « pas archivé » de « import
   * antérieur à la fonctionnalité ».
   */
  archiveNote?: 'stored' | 'disabled'
}) {
  const stats = {
    ...((input.stats as Record<string, unknown> | null) ?? {}),
    sourceArchive: input.archiveNote ?? (input.sourceFile ? 'stored' : 'disabled'),
  }
  await db.insert(offerImports).values({
    offerId: input.offerId,
    fileName: input.fileName,
    fileHash: input.fileHash,
    byteSize: input.byteSize,
    lineCount: input.lineCount,
    stats,
    importedBy: input.userId,
    sourceFileUrl: input.sourceFile?.url ?? null,
    sourceFilePublicId: input.sourceFile?.publicId ?? null,
    sourceFileStoredAt: input.sourceFile ? new Date() : null,
  })
}

/**
 * L'historique d'import d'une offre : ce qui a été chargé, par qui, quand, et
 * où le classeur d'origine est archivé.
 *
 * C'est la moitié « provenance » de la maîtrise documentaire : un total dans
 * l'ERP dont on ne peut plus produire la source n'est pas une preuve.
 */
export async function getOfferImportHistory(offerId: string) {
  const rows = await db
    .select({
      id: offerImports.id,
      fileName: offerImports.fileName,
      fileHash: offerImports.fileHash,
      byteSize: offerImports.byteSize,
      lineCount: offerImports.lineCount,
      importedAt: offerImports.importedAt,
      importedByName: users.name,
      sourceFileUrl: offerImports.sourceFileUrl,
    })
    .from(offerImports)
    .leftJoin(users, eq(offerImports.importedBy, users.id))
    .where(eq(offerImports.offerId, offerId))
    .orderBy(desc(offerImports.importedAt))
  return rows
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
  file: {
    name: string
    hash: string
    byteSize: number
    /** Le classeur archivé tel quel, quand l'archivage a réussi. */
    sourceFile?: { url: string; publicId: string } | null
    /** `stored` ou `disabled` — pourquoi il y a, ou non, une archive. */
    archiveNote?: 'stored' | 'disabled'
  },
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
    sourceFile: file.sourceFile ?? null,
    archiveNote: file.archiveNote,
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
 * Soumet une version pour revue.
 *
 * À partir de là le document est gelé : `assertEditable` refuse toute écriture
 * tant que la revue n'est pas tranchée, sans quoi l'objet revu changerait sous
 * les yeux du relecteur. L'index partiel `offer_versions_one_submitted_uidx`
 * garantit qu'une seule soumission est ouverte à la fois par offre.
 */
export async function submitOfferVersion(
  offerId: string,
  versionId: string,
  userId: string,
  actor: AuditActor,
) {
  return db.transaction(async (tx) => {
    const [version] = await tx
      .select({
        id: offerVersions.id,
        versionNo: offerVersions.versionNo,
        status: offerVersions.status,
        totalTtc: offerVersions.totalTtc,
        lineCount: offerVersions.lineCount,
      })
      .from(offerVersions)
      .where(and(eq(offerVersions.id, versionId), eq(offerVersions.offerId, offerId)))
      .limit(1)
    if (!version) return { success: false as const, error: 'Version introuvable' }
    if (version.status !== 'draft') {
      return {
        success: false as const,
        error: `Seul un brouillon peut être soumis à la revue (version ${version.versionNo} : ${version.status}).`,
      }
    }

    const [pending] = await tx
      .select({ versionNo: offerVersions.versionNo })
      .from(offerVersions)
      .where(and(eq(offerVersions.offerId, offerId), eq(offerVersions.status, 'submitted')))
      .limit(1)
    if (pending) {
      return {
        success: false as const,
        error: `La version ${pending.versionNo} est déjà en revue. Tranchez-la avant d'en soumettre une autre.`,
      }
    }

    const now = new Date()
    await tx
      .update(offerVersions)
      .set({ status: 'submitted', submittedBy: userId, submittedAt: now })
      .where(eq(offerVersions.id, versionId))

    await recordAudit(tx, {
      entityType: 'commercial_offer',
      entityId: offerId,
      action: 'submitted',
      actor,
      previousState: { versionStatus: 'draft' },
      newState: {
        versionStatus: 'submitted',
        versionNo: version.versionNo,
        totalTtc: num(version.totalTtc),
        lineCount: version.lineCount,
      },
      metadata: { form: BORDEREAU_FORM_CODE, versionId },
    })

    return { success: true as const, versionNo: version.versionNo }
  })
}

/**
 * Refuse une version en revue et rend le document à l'édition.
 *
 * La version refusée n'est ni supprimée ni ramenée à l'état de brouillon : elle
 * reste, avec son instantané et le motif du refus, la trace de ce qui a été
 * proposé et écarté. La correction se poursuit sur le document et produira une
 * version suivante, ce qui rend le cycle refus → correction → resoumission
 * lisible dans l'historique au lieu de l'effacer (ISO 9001:2015 §8.2.3).
 */
export async function rejectOfferVersion(
  offerId: string,
  versionId: string,
  reason: string,
  userId: string,
  actor: AuditActor,
) {
  return db.transaction(async (tx) => {
    const [version] = await tx
      .select({
        versionNo: offerVersions.versionNo,
        status: offerVersions.status,
        submittedBy: offerVersions.submittedBy,
      })
      .from(offerVersions)
      .where(and(eq(offerVersions.id, versionId), eq(offerVersions.offerId, offerId)))
      .limit(1)
    if (!version) return { success: false as const, error: 'Version introuvable' }
    if (version.status !== 'submitted') {
      return {
        success: false as const,
        error: `Seule une version en revue peut être refusée (version ${version.versionNo} : ${version.status}).`,
      }
    }

    const now = new Date()
    await tx
      .update(offerVersions)
      .set({
        status: 'rejected',
        reviewedBy: userId,
        reviewedAt: now,
        rejectionReason: reason,
      })
      .where(eq(offerVersions.id, versionId))

    await recordAudit(tx, {
      entityType: 'commercial_offer',
      entityId: offerId,
      action: 'rejected',
      actor,
      previousState: { versionStatus: 'submitted' },
      newState: { versionStatus: 'rejected', versionNo: version.versionNo },
      metadata: {
        form: BORDEREAU_FORM_CODE,
        versionId,
        reason,
        selfReviewed: version.submittedBy === userId,
      },
    })

    return { success: true as const, versionNo: version.versionNo }
  })
}

/**
 * Approves a version and locks the document.
 *
 * Une version doit avoir été SOUMISE : la revue et l'approbation sont deux
 * actes distincts (ISO 9001:2015 §7.5.2 b), et les fusionner effacerait celui
 * des deux qui atteste que quelqu'un a regardé le document avant de l'engager.
 * Le trigger `offer_versions_guard` refuse `draft → approved` indépendamment de
 * ce chemin de code.
 *
 * The previously approved version is marked `superseded` rather than altered
 * or removed: history that was used is never unmade.
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
    if (version.status === 'rejected') {
      return {
        success: false as const,
        error: 'Cette version a été refusée en revue ; figez une nouvelle version corrigée.',
      }
    }
    if (version.status === 'draft') {
      return {
        success: false as const,
        error: `La version ${version.versionNo} doit d'abord être soumise à la revue avant d'être approuvée.`,
      }
    }

    const [offer] = await tx
      .select({ approvedVersionId: commercialOffers.approvedVersionId, projectId: commercialOffers.projectId })
      .from(commercialOffers)
      .where(eq(commercialOffers.id, offerId))
      .limit(1)
    if (!offer) return { success: false as const, error: 'Offre introuvable' }

    /*
     * Une seule offre approuvée par chantier — la règle que porte l'index
     * `commercial_offers_one_approved_per_project_uidx` depuis la migration
     * 0035. Elle était bien appliquée, mais uniquement par la base : la route
     * ne la testait pas, l'INSERT partait quand même et l'utilisateur recevait
     * une 500 avec le nom de la contrainte et la requête SQL.
     *
     * On la vérifie donc ici, où l'on peut NOMMER l'offre concurrente. Le
     * garde n'affaiblit rien : l'index reste l'autorité, et une course entre
     * deux approbations simultanées serait toujours arrêtée par lui.
     */
    if (offer.projectId) {
      const [rival] = await tx
        .select({ id: commercialOffers.id, reference: commercialOffers.reference })
        .from(commercialOffers)
        .where(
          and(
            eq(commercialOffers.projectId, offer.projectId),
            sql`${commercialOffers.id} <> ${offerId}`,
            sql`${commercialOffers.approvedVersionId} IS NOT NULL`,
            isNull(commercialOffers.deletedAt),
          ),
        )
        .limit(1)
      if (rival) {
        return {
          success: false as const,
          error:
            `Le chantier a déjà un bordereau approuvé : l'offre ${rival.reference}. ` +
            'Rouvrez-la ou détachez-la du projet avant d\'approuver celui-ci.',
        }
      }
    }

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
        .set({
          status: 'approved',
          approvedBy: userId,
          approvedAt: now,
          // La décision de revue et l'approbation sont le même acte ici : c'est
          // l'approbateur qui tranche la soumission. Les deux horodatages sont
          // écrits pour que la chronologie soumission → décision soit lisible.
          reviewedBy: userId,
          reviewedAt: now,
        })
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
      metadata: {
        form: BORDEREAU_FORM_CODE,
        // Signalé, pas interdit : dans une PME la même personne peut soumettre
        // et approuver, mais un auditeur doit le voir sans recouper deux traces.
        selfReviewed: version.submittedBy === userId,
      },
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

    // Le motif est porté par la version qu'il remplace, pas seulement par le
    // journal : c'est là qu'on le cherchera dans trois ans, en lisant l'offre.
    const reopenedAt = new Date()
    await tx
      .update(offerVersions)
      .set({
        status:       'superseded',
        reopenReason: reason,
        reopenedBy:   userId,
        reopenedAt,
      })
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
  /** La version immuable dont le chiffre est tiré — la réponse d'auditeur. */
  sourceVersionId: string
  sourceVersionNo: number
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

  // Le chiffre est lu sur la VERSION approuvée, pas sur les totaux vivants de
  // l'offre. Les deux coïncident tant que le document est verrouillé, mais
  // seule la version est immuable : c'est elle qui reste la base du contrat
  // après une réouverture, et c'est elle que l'auditeur doit pouvoir citer.
  const [version] = await db
    .select({
      id: offerVersions.id,
      versionNo: offerVersions.versionNo,
      totalTtc: offerVersions.totalTtc,
      totalHtva: offerVersions.totalHtva,
    })
    .from(offerVersions)
    .where(eq(offerVersions.id, row.approvedVersionId))
    .limit(1)
  if (!version) return null

  return {
    projectId: row.projectId,
    projectReference: row.projectReference ?? '',
    offerId: row.offerId,
    offerReference: row.offerReference,
    sourceVersionId: version.id,
    sourceVersionNo: version.versionNo,
    suggestedAmount: num(version.totalTtc ?? version.totalHtva),
    currentContractAmount: numOrNull(row.contractAmount),
    approvedBudget: numOrNull(row.approvedBudget),
  }
}

export type ProjectContractAmount = {
  contractAmount: number | null
  contractAmountSuggested: number | null
  contractAmountSourceOfferId: string | null
  contractAmountSourceVersionId: string | null
  contractAmountSourceVersionNo: number | null
  contractAmountConfirmedAt: Date | null
  contractAmountConfirmedByName: string | null
  /** Lecture seule ici, et à dessein : un prix de vente ne l'écrit jamais. */
  approvedBudget: number | null
  currency: string
  /** La suggestion d'un FOR-CO-02 gagné et approuvé, s'il y en a un. */
  proposal: ContractAmountProposal | null
}

/**
 * Le montant contractuel d'un projet, sa provenance et la suggestion en attente.
 *
 * Une seule fonction pour la route API et pour la page : deux lectures
 * séparées finiraient par diverger, et c'est exactement ce genre d'écart qui a
 * rendu nécessaire `project-spend.ts`.
 */
export async function getProjectContractAmount(
  projectId: string,
): Promise<ProjectContractAmount | null> {
  const [project] = await db
    .select({
      contractAmount: projects.contractAmount,
      contractAmountSuggested: projects.contractAmountSuggested,
      contractAmountSourceOfferId: projects.contractAmountSourceOfferId,
      contractAmountSourceVersionId: projects.contractAmountSourceVersionId,
      contractAmountConfirmedAt: projects.contractAmountConfirmedAt,
      contractAmountConfirmedBy: projects.contractAmountConfirmedBy,
      approvedBudget: projects.approvedBudget,
      currency: projects.currency,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1)
  if (!project) return null

  // L'offre gagnée la plus récemment décidée pour ce projet. Une seule peut
  // être approuvée à la fois, donc la lecture est sans ambiguïté.
  const [won] = await db
    .select({ id: commercialOffers.id })
    .from(commercialOffers)
    .where(
      and(
        eq(commercialOffers.projectId, projectId),
        eq(commercialOffers.status, 'gagnee'),
        isNull(commercialOffers.deletedAt),
      ),
    )
    .orderBy(desc(commercialOffers.updatedAt))
    .limit(1)

  const proposal = won ? await getContractAmountProposal(won.id) : null

  const [sourceVersion] = project.contractAmountSourceVersionId
    ? await db
        .select({ versionNo: offerVersions.versionNo })
        .from(offerVersions)
        .where(eq(offerVersions.id, project.contractAmountSourceVersionId))
        .limit(1)
    : []

  const [confirmedBy] = project.contractAmountConfirmedBy
    ? await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, project.contractAmountConfirmedBy))
        .limit(1)
    : []

  return {
    contractAmount: numOrNull(project.contractAmount),
    contractAmountSuggested: numOrNull(project.contractAmountSuggested),
    contractAmountSourceOfferId: project.contractAmountSourceOfferId,
    contractAmountSourceVersionId: project.contractAmountSourceVersionId,
    contractAmountSourceVersionNo: sourceVersion?.versionNo ?? null,
    contractAmountConfirmedAt: project.contractAmountConfirmedAt,
    contractAmountConfirmedByName: confirmedBy?.name ?? null,
    approvedBudget: numOrNull(project.approvedBudget),
    currency: project.currency ?? 'TND',
    proposal,
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
 *
 * Deux vérifications que la signature ne peut pas faire à la place de l'appelant :
 * l'offre citée doit bien être celle de CE projet, et la version enregistrée est
 * relue depuis la base plutôt que reçue du client — un montant contractuel
 * rattaché à une version que l'appelant a choisie lui-même ne prouverait rien.
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

    const [offer] = await tx
      .select({
        projectId: commercialOffers.projectId,
        approvedVersionId: commercialOffers.approvedVersionId,
      })
      .from(commercialOffers)
      .where(and(eq(commercialOffers.id, input.offerId), isNull(commercialOffers.deletedAt)))
      .limit(1)
    if (!offer) return { success: false as const, error: 'Offre introuvable' }
    if (offer.projectId !== projectId) {
      return { success: false as const, error: "Cette offre n'est pas rattachée à ce projet" }
    }
    if (!offer.approvedVersionId) {
      return {
        success: false as const,
        error: "Le bordereau de cette offre n'est pas approuvé : aucun montant contractuel ne peut en découler.",
      }
    }

    const now = new Date()
    await tx
      .update(projects)
      .set({
        contractAmount: round3(input.approvedAmount).toFixed(3),
        contractAmountSuggested: round3(input.suggestedAmount).toFixed(3),
        contractAmountSourceOfferId: input.offerId,
        contractAmountSourceVersionId: offer.approvedVersionId,
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
        sourceVersionId: offer.approvedVersionId,
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
