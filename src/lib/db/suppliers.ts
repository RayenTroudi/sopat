import { db } from '../../../db/index'
import {
  suppliers,
  supplierEvaluations,
  cloudinaryAssets,
  users,
} from '../../../db/schema'
import { eq, and, asc, desc, ilike, or, sql } from 'drizzle-orm'
import { attachDmsCode } from '../dms/attach'
import { obsoleteDmsDocument } from '../dms/obsolete'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SupplierCategory =
  | 'pepiniere'
  | 'materiaux'
  | 'equipements'
  | 'produits_phytosanitaires'
  | 'logistique'
  | 'location_engins'
  | 'autre'
  | 'plantes'
  | 'terre_vegetale'
  | 'gazon'
  | 'matiere_decorative'
  | 'bac_fleurs'
  | 'parc_auto'
  | 'equipements_bureautique'
  | 'services'
  | 'sous_traitants'

export type SupplierStatus = 'approuve' | 'en_evaluation' | 'suspendu'

export type SupplierRow = {
  id:               string
  supplierCode:     string | null  // FR-001
  name:             string
  category:         SupplierCategory
  registreCommerce: string | null
  contactName:      string | null
  email:            string | null
  phone:            string | null
  city:             string | null
  address:          string | null
  isoStatus:        SupplierStatus
  selectionScore:   number | null  // avg of selection criteria (1–3)
  selectionClass:   string | null  // A / B / C
  evaluationScore:  number | null  // avg of evaluation criteria (1–3)
  evaluationClass:  string | null  // A / B / C (last eval)
  isoClass:         string | null  // final status A/B/C
  nextEvalPlanned:  string | null
  nextEvalDone:     string | null
  lastAuditDate:    Date | null
  contractAssetId:  string | null
  contractAssetUrl: string | null
  isActive:         boolean
  notes:            string | null
  dmsDocumentCode:  string | null
  createdAt:        Date
}

export type SupplierEvaluationRow = {
  id:             string
  supplierId:     string
  evaluatedBy:    string
  evaluatorName:  string
  evaluationType: string | null
  score:          number
  // Selection criteria (1–3)
  tauxCouverture:      number | null
  niveauQualite:       number | null
  prix:                number | null
  delaiLivraison:      number | null
  modeLivraison:       number | null
  modalitesPaiement:   number | null
  proximiteLivraison:  number | null
  // Evaluation criteria (1–3)
  notorieteReference:  number | null
  respectExigences:    number | null
  respectPrix:         number | null
  respectDelai:        number | null
  reactivite:          number | null
  assistanceTechnique: number | null
  documentationTech:   number | null
  // Results
  computedScore:  number | null
  classification: string | null
  notes:          string | null
  evaluatedAt:    Date
}

const SUPPLIER_SELECT = {
  id:               suppliers.id,
  supplierCode:     suppliers.supplierCode,
  name:             suppliers.name,
  category:         suppliers.category,
  registreCommerce: suppliers.registreCommerce,
  contactName:      suppliers.contactName,
  email:            suppliers.email,
  phone:            suppliers.phone,
  city:             suppliers.city,
  address:          suppliers.address,
  isoStatus:        suppliers.isoStatus,
  selectionScore:   suppliers.selectionScore,
  selectionClass:   suppliers.selectionClass,
  evaluationScore:  suppliers.evaluationScore,
  evaluationClass:  suppliers.evaluationClass,
  isoClass:         suppliers.isoClass,
  nextEvalPlanned:  suppliers.nextEvalPlanned,
  nextEvalDone:     suppliers.nextEvalDone,
  lastAuditDate:    suppliers.lastAuditDate,
  contractAssetId:  suppliers.contractAssetId,
  contractAssetUrl: cloudinaryAssets.secureUrl,
  isActive:         suppliers.isActive,
  notes:            suppliers.notes,
  dmsDocumentCode:  suppliers.dmsDocumentCode,
  createdAt:        suppliers.createdAt,
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listSuppliers(opts?: { search?: string; category?: string; status?: string }): Promise<SupplierRow[]> {
  const rows = await db
    .select(SUPPLIER_SELECT)
    .from(suppliers)
    .leftJoin(cloudinaryAssets, eq(suppliers.contractAssetId, cloudinaryAssets.id))
    .where(
      and(
        opts?.search ? or(
          ilike(suppliers.name, `%${opts.search}%`),
          ilike(suppliers.contactName, `%${opts.search}%`),
          ilike(suppliers.city, `%${opts.search}%`),
          ilike(suppliers.supplierCode, `%${opts.search}%`),
        ) : undefined,
        opts?.category ? eq(suppliers.category, opts.category as SupplierCategory) : undefined,
        opts?.status   ? eq(suppliers.isoStatus, opts.status as SupplierStatus)    : undefined,
      )
    )
    .orderBy(asc(suppliers.supplierCode), asc(suppliers.name))

  return rows.map(r => ({
    ...r,
    selectionScore:  r.selectionScore  !== null ? Number(r.selectionScore)  : null,
    evaluationScore: r.evaluationScore !== null ? Number(r.evaluationScore) : null,
  })) as SupplierRow[]
}

export async function getSupplierById(id: string): Promise<SupplierRow | null> {
  const [row] = await db
    .select(SUPPLIER_SELECT)
    .from(suppliers)
    .leftJoin(cloudinaryAssets, eq(suppliers.contractAssetId, cloudinaryAssets.id))
    .where(eq(suppliers.id, id))
    .limit(1)

  if (!row) return null
  return {
    ...row,
    selectionScore:  row.selectionScore  !== null ? Number(row.selectionScore)  : null,
    evaluationScore: row.evaluationScore !== null ? Number(row.evaluationScore) : null,
  } as SupplierRow
}

export async function softDeleteSupplier(id: string, actorId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const result = await tx
      .update(suppliers)
      .set({ isActive: false })
      .where(eq(suppliers.id, id))
      .returning({ id: suppliers.id, dmsDocumentCode: suppliers.dmsDocumentCode })

    if (result.length === 0) return false

    const code = result[0].dmsDocumentCode
    if (code) await obsoleteDmsDocument(tx, code, actorId)

    return true
  })
}

// ─── Create / Update ──────────────────────────────────────────────────────────

export async function createSupplier(input: {
  name:             string
  category:         SupplierCategory
  supplierCode?:    string
  registreCommerce?: string
  contactName?:     string
  email?:           string
  phone?:           string
  city?:            string
  address?:         string
  isoStatus:        SupplierStatus
  selectionScore?:  number
  selectionClass?:  string
  evaluationScore?: number
  evaluationClass?: string
  isoClass?:        string
  nextEvalPlanned?: string
  nextEvalDone?:    string
  lastAuditDate?:   Date
  contractAssetId?: string
  notes?:           string
  createdBy:        string
}) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(suppliers)
      .values({
        ...input,
        selectionScore:  input.selectionScore  != null ? String(input.selectionScore)  : undefined,
        evaluationScore: input.evaluationScore != null ? String(input.evaluationScore) : undefined,
        isoApproved: input.isoStatus === 'approuve',
      })
      .returning()

    const dmsCode = await attachDmsCode(tx, {
      typeCode:    'FOR',
      processCode: 'AC',
      designation: input.name,
      department:  'finance',
      category:    'formulaire',
      entityType:  'supplier',
      entityId:    row.id,
      authorId:    input.createdBy,
    })

    const [updated] = await tx
      .update(suppliers)
      .set({ dmsDocumentCode: dmsCode })
      .where(eq(suppliers.id, row.id))
      .returning()

    return updated
  })
}

export async function updateSupplier(id: string, input: {
  name?:            string
  category?:        SupplierCategory
  supplierCode?:    string | null
  registreCommerce?: string | null
  contactName?:     string | null
  email?:           string | null
  phone?:           string | null
  city?:            string | null
  address?:         string | null
  isoStatus?:       SupplierStatus
  selectionScore?:  number | null
  selectionClass?:  string | null
  evaluationScore?: number | null
  evaluationClass?: string | null
  isoClass?:        string | null
  nextEvalPlanned?: string | null
  nextEvalDone?:    string | null
  lastAuditDate?:   Date | null
  contractAssetId?: string | null
  notes?:           string | null
  isActive?:        boolean
}) {
  const [row] = await db
    .update(suppliers)
    .set({
      ...input,
      selectionScore:  input.selectionScore  != null ? String(input.selectionScore)  : input.selectionScore,
      evaluationScore: input.evaluationScore != null ? String(input.evaluationScore) : input.evaluationScore,
      ...(input.isoStatus !== undefined ? { isoApproved: input.isoStatus === 'approuve' } : {}),
      updatedAt: new Date(),
    })
    .where(eq(suppliers.id, id))
    .returning()
  return row
}

// ─── Evaluations ──────────────────────────────────────────────────────────────

const EVAL_SELECT = {
  id:             supplierEvaluations.id,
  supplierId:     supplierEvaluations.supplierId,
  evaluatedBy:    supplierEvaluations.evaluatedBy,
  evaluatorName:  supplierEvaluations.evaluatorName,
  evaluationType: supplierEvaluations.evaluationType,
  score:          supplierEvaluations.score,
  tauxCouverture:      supplierEvaluations.tauxCouverture,
  niveauQualite:       supplierEvaluations.niveauQualite,
  prix:                supplierEvaluations.prix,
  delaiLivraison:      supplierEvaluations.delaiLivraison,
  modeLivraison:       supplierEvaluations.modeLivraison,
  modalitesPaiement:   supplierEvaluations.modalitesPaiement,
  proximiteLivraison:  supplierEvaluations.proximiteLivraison,
  notorieteReference:  supplierEvaluations.notorieteReference,
  respectExigences:    supplierEvaluations.respectExigences,
  respectPrix:         supplierEvaluations.respectPrix,
  respectDelai:        supplierEvaluations.respectDelai,
  reactivite:          supplierEvaluations.reactivite,
  assistanceTechnique: supplierEvaluations.assistanceTechnique,
  documentationTech:   supplierEvaluations.documentationTech,
  computedScore:  supplierEvaluations.computedScore,
  classification: supplierEvaluations.classification,
  notes:          supplierEvaluations.notes,
  evaluatedAt:    supplierEvaluations.evaluatedAt,
}

export async function getEvaluationHistory(supplierId: string): Promise<SupplierEvaluationRow[]> {
  const rows = await db
    .select(EVAL_SELECT)
    .from(supplierEvaluations)
    .where(eq(supplierEvaluations.supplierId, supplierId))
    .orderBy(desc(supplierEvaluations.evaluatedAt))

  return rows.map(r => ({
    ...r,
    computedScore: r.computedScore !== null ? Number(r.computedScore) : null,
  })) as SupplierEvaluationRow[]
}

export async function addEvaluation(input: {
  supplierId:     string
  evaluatedBy:    string
  evaluatorName:  string
  evaluationType: 'selection' | 'evaluation'
  // Selection criteria
  tauxCouverture?:     number
  niveauQualite?:      number
  prix?:               number
  delaiLivraison?:     number
  modeLivraison?:      number
  modalitesPaiement?:  number
  proximiteLivraison?: number
  // Evaluation criteria
  notorieteReference?:  number
  respectExigences?:    number
  respectPrix?:         number
  respectDelai?:        number
  reactivite?:          number
  assistanceTechnique?: number
  documentationTech?:   number
  // Computed
  computedScore?:  number
  classification?: string
  notes?:          string
  createdBy:       string
}) {
  // Calculate computed score from criteria
  const selCriteria = [
    input.tauxCouverture, input.niveauQualite, input.prix,
    input.delaiLivraison, input.modeLivraison, input.modalitesPaiement,
    input.proximiteLivraison,
  ].filter((v): v is number => v !== undefined)

  const evalCriteria = [
    input.notorieteReference, input.respectExigences, input.respectPrix,
    input.respectDelai, input.reactivite, input.assistanceTechnique, input.documentationTech,
  ].filter((v): v is number => v !== undefined)

  const activeCriteria = input.evaluationType === 'selection' ? selCriteria : evalCriteria
  const avg = activeCriteria.length > 0
    ? activeCriteria.reduce((a, b) => a + b, 0) / activeCriteria.length
    : null

  const computedScore = input.computedScore ?? (avg !== null ? Math.round(avg * 100) / 100 : null)
  const classification = input.classification ?? (
    computedScore === null ? null :
    computedScore >= 2.5 ? 'A' :
    computedScore >= 1.5 ? 'B' : 'C'
  )

  const [row] = await db
    .insert(supplierEvaluations)
    .values({
      supplierId:     input.supplierId,
      evaluatedBy:    input.evaluatedBy,
      evaluatorName:  input.evaluatorName,
      evaluationType: input.evaluationType,
      score:          Math.round(computedScore ?? 0),
      tauxCouverture:     input.tauxCouverture,
      niveauQualite:      input.niveauQualite,
      prix:               input.prix,
      delaiLivraison:     input.delaiLivraison,
      modeLivraison:      input.modeLivraison,
      modalitesPaiement:  input.modalitesPaiement,
      proximiteLivraison: input.proximiteLivraison,
      notorieteReference:  input.notorieteReference,
      respectExigences:    input.respectExigences,
      respectPrix:         input.respectPrix,
      respectDelai:        input.respectDelai,
      reactivite:          input.reactivite,
      assistanceTechnique: input.assistanceTechnique,
      documentationTech:   input.documentationTech,
      computedScore:  computedScore?.toString(),
      classification,
      notes:          input.notes,
      evaluatedAt:    new Date(),
      createdBy:      input.createdBy,
    })
    .returning()

  // Update supplier's evaluation fields
  const updateFields: Record<string, unknown> = {
    lastAuditDate: new Date(),
    updatedAt: new Date(),
  }
  if (input.evaluationType === 'selection') {
    if (computedScore !== null) updateFields.selectionScore = computedScore.toString()
    if (classification)         updateFields.selectionClass = classification
  } else {
    if (computedScore !== null) updateFields.evaluationScore = computedScore.toString()
    if (classification)         updateFields.evaluationClass = classification
    if (classification)         updateFields.isoClass = classification
    if (classification === 'A') updateFields.isoStatus = 'approuve'
    else if (classification === 'C') updateFields.isoStatus = 'suspendu'
    else updateFields.isoStatus = 'en_evaluation'
  }

  await db.update(suppliers).set(updateFields).where(eq(suppliers.id, input.supplierId))

  return row
}

// ─── Approved suppliers for dropdowns ────────────────────────────────────────

export async function getApprovedSupplierOptions() {
  return db
    .select({ id: suppliers.id, name: suppliers.name, category: suppliers.category, supplierCode: suppliers.supplierCode })
    .from(suppliers)
    .where(and(eq(suppliers.isActive, true), sql`${suppliers.isoStatus} != 'suspendu'`))
    .orderBy(asc(suppliers.supplierCode), asc(suppliers.name))
}
