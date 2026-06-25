import { unstable_cache } from 'next/cache'
import { db } from '../../../db/index'
import {
  suppliers,
  supplierEvaluations,
  cloudinaryAssets,
  users,
} from '../../../db/schema'
import { eq, and, asc, desc, ilike, or, isNull, sql } from 'drizzle-orm'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SupplierCategory =
  | 'pepiniere'
  | 'materiaux'
  | 'equipements'
  | 'produits_phytosanitaires'
  | 'logistique'
  | 'location_engins'
  | 'autre'

export type SupplierStatus = 'approuve' | 'en_evaluation' | 'suspendu'

export type SupplierRow = {
  id:              string
  name:            string
  category:        SupplierCategory
  contactName:     string | null
  email:           string | null
  phone:           string | null
  city:            string | null
  address:         string | null
  isoStatus:       SupplierStatus
  evaluationScore: number | null
  lastAuditDate:   Date | null
  contractAssetId: string | null
  contractAssetUrl: string | null
  isActive:        boolean
  notes:           string | null
  createdAt:       Date
}

export type SupplierEvaluationRow = {
  id:            string
  supplierId:    string
  evaluatedBy:   string
  evaluatorName: string
  score:         number
  notes:         string | null
  evaluatedAt:   Date
}

// ─── List ─────────────────────────────────────────────────────────────────────

async function _listSuppliers(opts?: { search?: string; category?: string; status?: string }): Promise<SupplierRow[]> {
  const rows = await db
    .select({
      id:              suppliers.id,
      name:            suppliers.name,
      category:        suppliers.category,
      contactName:     suppliers.contactName,
      email:           suppliers.email,
      phone:           suppliers.phone,
      city:            suppliers.city,
      address:         suppliers.address,
      isoStatus:       suppliers.isoStatus,
      evaluationScore: suppliers.evaluationScore,
      lastAuditDate:   suppliers.lastAuditDate,
      contractAssetId: suppliers.contractAssetId,
      contractAssetUrl: cloudinaryAssets.secureUrl,
      isActive:        suppliers.isActive,
      notes:           suppliers.notes,
      createdAt:       suppliers.createdAt,
    })
    .from(suppliers)
    .leftJoin(cloudinaryAssets, eq(suppliers.contractAssetId, cloudinaryAssets.id))
    .where(
      and(
        opts?.search ? or(
          ilike(suppliers.name, `%${opts.search}%`),
          ilike(suppliers.contactName, `%${opts.search}%`),
          ilike(suppliers.city, `%${opts.search}%`),
        ) : undefined,
        opts?.category ? eq(suppliers.category, opts.category as SupplierCategory) : undefined,
        opts?.status   ? eq(suppliers.isoStatus, opts.status as SupplierStatus)    : undefined,
      )
    )
    .orderBy(asc(suppliers.name))

  return rows as SupplierRow[]
}

export const listSuppliers = unstable_cache(_listSuppliers, ['suppliers-list'], { revalidate: 60, tags: ['suppliers-list'] })

export async function getSupplierById(id: string): Promise<SupplierRow | null> {
  const [row] = await db
    .select({
      id:              suppliers.id,
      name:            suppliers.name,
      category:        suppliers.category,
      contactName:     suppliers.contactName,
      email:           suppliers.email,
      phone:           suppliers.phone,
      city:            suppliers.city,
      address:         suppliers.address,
      isoStatus:       suppliers.isoStatus,
      evaluationScore: suppliers.evaluationScore,
      lastAuditDate:   suppliers.lastAuditDate,
      contractAssetId: suppliers.contractAssetId,
      contractAssetUrl: cloudinaryAssets.secureUrl,
      isActive:        suppliers.isActive,
      notes:           suppliers.notes,
      createdAt:       suppliers.createdAt,
    })
    .from(suppliers)
    .leftJoin(cloudinaryAssets, eq(suppliers.contractAssetId, cloudinaryAssets.id))
    .where(eq(suppliers.id, id))
    .limit(1)

  return (row as SupplierRow | undefined) ?? null
}

// ─── Create / Update ──────────────────────────────────────────────────────────

export async function createSupplier(input: {
  name:            string
  category:        SupplierCategory
  contactName?:    string
  email?:          string
  phone?:          string
  city?:           string
  address?:        string
  isoStatus:       SupplierStatus
  evaluationScore?: number
  lastAuditDate?:  Date
  contractAssetId?: string
  notes?:          string
  createdBy:       string
}) {
  const [row] = await db
    .insert(suppliers)
    .values({
      ...input,
      isoApproved: input.isoStatus === 'approuve',
    })
    .returning()
  return row
}

export async function updateSupplier(id: string, input: {
  name?:            string
  category?:        SupplierCategory
  contactName?:     string | null
  email?:           string | null
  phone?:           string | null
  city?:            string | null
  address?:         string | null
  isoStatus?:       SupplierStatus
  evaluationScore?: number | null
  lastAuditDate?:   Date | null
  contractAssetId?: string | null
  notes?:           string | null
  isActive?:        boolean
}) {
  const [row] = await db
    .update(suppliers)
    .set({
      ...input,
      ...(input.isoStatus !== undefined ? { isoApproved: input.isoStatus === 'approuve' } : {}),
      updatedAt: new Date(),
    })
    .where(eq(suppliers.id, id))
    .returning()
  return row
}

// ─── Evaluations ──────────────────────────────────────────────────────────────

export async function getEvaluationHistory(supplierId: string): Promise<SupplierEvaluationRow[]> {
  return db
    .select({
      id:            supplierEvaluations.id,
      supplierId:    supplierEvaluations.supplierId,
      evaluatedBy:   supplierEvaluations.evaluatedBy,
      evaluatorName: supplierEvaluations.evaluatorName,
      score:         supplierEvaluations.score,
      notes:         supplierEvaluations.notes,
      evaluatedAt:   supplierEvaluations.evaluatedAt,
    })
    .from(supplierEvaluations)
    .where(eq(supplierEvaluations.supplierId, supplierId))
    .orderBy(desc(supplierEvaluations.evaluatedAt)) as Promise<SupplierEvaluationRow[]>
}

export async function addEvaluation(input: {
  supplierId:    string
  evaluatedBy:   string
  evaluatorName: string
  score:         number
  notes?:        string
  createdBy:     string
}) {
  const [row] = await db
    .insert(supplierEvaluations)
    .values({ ...input, evaluatedAt: new Date() })
    .returning()

  // Update the supplier's current score and last audit date
  await db
    .update(suppliers)
    .set({ evaluationScore: input.score, lastAuditDate: new Date(), updatedAt: new Date() })
    .where(eq(suppliers.id, input.supplierId))

  return row
}

// ─── Approved suppliers for dropdowns (excludes suspended) ───────────────────

export async function getApprovedSupplierOptions() {
  return db
    .select({ id: suppliers.id, name: suppliers.name, category: suppliers.category })
    .from(suppliers)
    .where(and(eq(suppliers.isActive, true), sql`${suppliers.isoStatus} != 'suspendu'`))
    .orderBy(asc(suppliers.name))
}
