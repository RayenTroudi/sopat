import { db } from '../../../db/index'
import {
  equipmentTypes,
  equipmentRentals,
  cloudinaryAssets,
  plantListItems,
  purchaseOrders,
  projects,
  users,
} from '../../../db/schema'
import { eq, and, isNull, desc, sql, asc } from 'drizzle-orm'

// ─── Types ────────────────────────────────────────────────────────────────────

export type EquipmentTypeRow = {
  id:            string
  name:          string
  displayNameFr: string
  iconName:      string | null
  notes:         string | null
}

export type EquipmentRentalRow = {
  id:                   string
  projectId:            string
  equipmentTypeId:      string
  equipmentTypeName:    string
  equipmentTypeIcon:    string | null
  equipmentDescription: string | null
  rentalCompany:        string | null
  rentalCompanyContact: string | null
  startDate:            string
  endDate:              string
  rentalDays:           number
  dailyRate:            string
  totalCost:            string
  currency:             string
  invoiceNumber:        string | null
  invoiceUrl:           string | null
  operatorName:         string | null
  purposeDescription:   string | null
  linkedPlantItemIds:   string[]
  createdByName:        string | null
  createdAt:            Date
}

export type EquipmentRentalInput = {
  projectId:            string
  equipmentTypeId:      string
  equipmentDescription?: string
  rentalCompany?:       string
  rentalCompanyContact?: string
  startDate:            string
  endDate:              string
  rentalDays:           number
  dailyRate:            string
  totalCost:            string
  currency:             string
  invoiceNumber?:       string
  invoiceAssetId?:      string
  operatorName?:        string
  purposeDescription?:  string
  linkedPlantItemIds?:  string[]
  createdBy:            string
}

// ─── Equipment Types ──────────────────────────────────────────────────────────

export async function getAllEquipmentTypes(): Promise<EquipmentTypeRow[]> {
  return db
    .select({
      id:            equipmentTypes.id,
      name:          equipmentTypes.name,
      displayNameFr: equipmentTypes.displayNameFr,
      iconName:      equipmentTypes.iconName,
      notes:         equipmentTypes.notes,
    })
    .from(equipmentTypes)
    .orderBy(equipmentTypes.displayNameFr)
}

// ─── Equipment Rentals ────────────────────────────────────────────────────────

export async function getEquipmentRentals(projectId: string): Promise<EquipmentRentalRow[]> {
  const rows = await db
    .select({
      id:                   equipmentRentals.id,
      projectId:            equipmentRentals.projectId,
      equipmentTypeId:      equipmentRentals.equipmentTypeId,
      equipmentTypeName:    equipmentTypes.displayNameFr,
      equipmentTypeIcon:    equipmentTypes.iconName,
      equipmentDescription: equipmentRentals.equipmentDescription,
      rentalCompany:        equipmentRentals.rentalCompany,
      rentalCompanyContact: equipmentRentals.rentalCompanyContact,
      startDate:            equipmentRentals.startDate,
      endDate:              equipmentRentals.endDate,
      rentalDays:           equipmentRentals.rentalDays,
      dailyRate:            equipmentRentals.dailyRate,
      totalCost:            equipmentRentals.totalCost,
      currency:             equipmentRentals.currency,
      invoiceNumber:        equipmentRentals.invoiceNumber,
      invoiceUrl:           cloudinaryAssets.secureUrl,
      operatorName:         equipmentRentals.operatorName,
      purposeDescription:   equipmentRentals.purposeDescription,
      linkedPlantItemIds:   equipmentRentals.linkedPlantItemIds,
      createdByName:        users.name,
      createdAt:            equipmentRentals.createdAt,
    })
    .from(equipmentRentals)
    .innerJoin(equipmentTypes, eq(equipmentRentals.equipmentTypeId, equipmentTypes.id))
    .leftJoin(cloudinaryAssets, eq(equipmentRentals.invoiceAssetId, cloudinaryAssets.id))
    .leftJoin(users, eq(equipmentRentals.createdBy, users.id))
    .where(
      and(
        eq(equipmentRentals.projectId, projectId),
        isNull(equipmentRentals.deletedAt),
      )
    )
    .orderBy(desc(equipmentRentals.createdAt))

  return rows.map((r) => ({
    ...r,
    linkedPlantItemIds: (r.linkedPlantItemIds ?? []) as string[],
  }))
}

export async function createEquipmentRental(input: EquipmentRentalInput): Promise<string> {
  const [row] = await db
    .insert(equipmentRentals)
    .values({
      projectId:            input.projectId,
      equipmentTypeId:      input.equipmentTypeId,
      equipmentDescription: input.equipmentDescription ?? null,
      rentalCompany:        input.rentalCompany ?? null,
      rentalCompanyContact: input.rentalCompanyContact ?? null,
      startDate:            input.startDate,
      endDate:              input.endDate,
      rentalDays:           input.rentalDays,
      dailyRate:            input.dailyRate,
      totalCost:            input.totalCost,
      currency:             input.currency as 'TND' | 'EUR' | 'OMR' | 'XOF' | 'QAR' | 'LYD' | 'USD',
      invoiceNumber:        input.invoiceNumber ?? null,
      invoiceAssetId:       input.invoiceAssetId ?? null,
      operatorName:         input.operatorName ?? null,
      purposeDescription:   input.purposeDescription ?? null,
      linkedPlantItemIds:   input.linkedPlantItemIds ?? [],
      createdBy:            input.createdBy,
    })
    .returning({ id: equipmentRentals.id })

  return row.id
}

export async function softDeleteEquipmentRental(id: string, projectId: string): Promise<boolean> {
  const result = await db
    .update(equipmentRentals)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(equipmentRentals.id, id),
        eq(equipmentRentals.projectId, projectId),
        isNull(equipmentRentals.deletedAt),
      )
    )
    .returning({ id: equipmentRentals.id })

  return result.length > 0
}

export async function getEquipmentTotalCost(projectId: string): Promise<number> {
  const row = await db
    .select({ total: sql<string>`coalesce(sum(total_cost::numeric), 0)::text` })
    .from(equipmentRentals)
    .where(and(eq(equipmentRentals.projectId, projectId), isNull(equipmentRentals.deletedAt)))

  return parseFloat(row[0]?.total ?? '0')
}

// ─── Plant list items for a project (used by drawer multi-select) ─────────────

export type PlantItemOption = {
  id:           string
  botanicalName: string
  commonName:   string | null
  category:     string
}

export async function getPlantItemOptions(projectId: string): Promise<PlantItemOption[]> {
  return db
    .select({
      id:           plantListItems.id,
      botanicalName: plantListItems.botanicalName,
      commonName:   plantListItems.commonName,
      category:     plantListItems.category,
    })
    .from(plantListItems)
    .where(eq(plantListItems.projectId, projectId))
    .orderBy(plantListItems.botanicalName)
}

// ─── Equipment Report ─────────────────────────────────────────────────────────

export type EquipmentByTypeRow = {
  typeName:    string
  displayName: string
  totalCost:   number
  rentalCount: number
}

export type EquipmentByProjectTypeRow = {
  projectType: string
  totalCost:   number
  rentalCount: number
}

export type EquipmentMonthlyRow = {
  month:     string  // "2026-01"
  totalCost: number
}

export type EquipmentProjectRow = {
  projectId:        string
  reference:        string
  projectName:      string
  projectType:      string
  equipmentCost:    number
  totalProjectSpend: number
  equipmentRatio:   number | null
}

export type EquipmentReportData = {
  byType:        EquipmentByTypeRow[]
  byProjectType: EquipmentByProjectTypeRow[]
  monthly:       EquipmentMonthlyRow[]
  byProject:     EquipmentProjectRow[]
  totalEquipmentSpend: number
  avgEquipmentRatio:   number | null
}

export async function getEquipmentReport(): Promise<EquipmentReportData> {
  // Equipment spend by type
  const byTypeRows = await db
    .select({
      typeName:    equipmentTypes.name,
      displayName: equipmentTypes.displayNameFr,
      totalCost:   sql<string>`coalesce(sum(${equipmentRentals.totalCost}::numeric), 0)::text`,
      rentalCount: sql<number>`count(${equipmentRentals.id})`,
    })
    .from(equipmentTypes)
    .leftJoin(
      equipmentRentals,
      and(
        eq(equipmentRentals.equipmentTypeId, equipmentTypes.id),
        isNull(equipmentRentals.deletedAt),
      )
    )
    .groupBy(equipmentTypes.id, equipmentTypes.name, equipmentTypes.displayNameFr)
    .orderBy(desc(sql`coalesce(sum(${equipmentRentals.totalCost}::numeric), 0)`))

  // Equipment spend by project type
  const byProjectTypeRows = await db
    .select({
      projectType: projects.projectType,
      totalCost:   sql<string>`coalesce(sum(${equipmentRentals.totalCost}::numeric), 0)::text`,
      rentalCount: sql<number>`count(${equipmentRentals.id})`,
    })
    .from(equipmentRentals)
    .innerJoin(projects, eq(equipmentRentals.projectId, projects.id))
    .where(isNull(equipmentRentals.deletedAt))
    .groupBy(projects.projectType)
    .orderBy(desc(sql`sum(${equipmentRentals.totalCost}::numeric)`))

  // Monthly equipment spend trend
  const monthlyRows = await db
    .select({
      month:     sql<string>`to_char(${equipmentRentals.startDate}::date, 'YYYY-MM')`,
      totalCost: sql<string>`coalesce(sum(${equipmentRentals.totalCost}::numeric), 0)::text`,
    })
    .from(equipmentRentals)
    .where(isNull(equipmentRentals.deletedAt))
    .groupBy(sql`to_char(${equipmentRentals.startDate}::date, 'YYYY-MM')`)
    .orderBy(asc(sql`to_char(${equipmentRentals.startDate}::date, 'YYYY-MM')`))

  // Equipment spend per project (with total spend for ratio)
  const allProjects = await db
    .select({ id: projects.id, reference: projects.reference, name: projects.name, projectType: projects.projectType })
    .from(projects)
    .where(isNull(projects.deletedAt))

  const byProject: EquipmentProjectRow[] = []
  for (const p of allProjects) {
    const [eqRow, poRow] = await Promise.all([
      db.select({ total: sql<string>`coalesce(sum(total_cost::numeric), 0)::text` })
        .from(equipmentRentals)
        .where(and(eq(equipmentRentals.projectId, p.id), isNull(equipmentRentals.deletedAt))),
      db.select({ total: sql<string>`coalesce(sum(total_cost::numeric), 0)::text` })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.projectId, p.id)),
    ])
    const equipmentCost = parseFloat(eqRow[0]?.total ?? '0')
    const purchaseCost  = parseFloat(poRow[0]?.total ?? '0')
    const totalProjectSpend = equipmentCost + purchaseCost
    if (totalProjectSpend === 0) continue

    byProject.push({
      projectId:        p.id,
      reference:        p.reference,
      projectName:      p.name,
      projectType:      p.projectType,
      equipmentCost,
      totalProjectSpend,
      equipmentRatio:   totalProjectSpend > 0 ? Math.round((equipmentCost / totalProjectSpend) * 1000) / 10 : null,
    })
  }

  byProject.sort((a, b) => b.equipmentCost - a.equipmentCost)

  const totalEquipmentSpend = byTypeRows.reduce((s, r) => s + parseFloat(r.totalCost as string), 0)
  const projectsWithEquipment = byProject.filter((p) => p.equipmentCost > 0 && p.equipmentRatio !== null)
  const avgEquipmentRatio = projectsWithEquipment.length > 0
    ? Math.round(projectsWithEquipment.reduce((s, p) => s + (p.equipmentRatio ?? 0), 0) / projectsWithEquipment.length * 10) / 10
    : null

  return {
    byType:        byTypeRows.map((r) => ({ ...r, totalCost: parseFloat(r.totalCost as string), rentalCount: Number(r.rentalCount) })),
    byProjectType: byProjectTypeRows.map((r) => ({ ...r, totalCost: parseFloat(r.totalCost as string), rentalCount: Number(r.rentalCount) })),
    monthly:       monthlyRows.map((r) => ({ month: r.month, totalCost: parseFloat(r.totalCost) })),
    byProject,
    totalEquipmentSpend,
    avgEquipmentRatio,
  }
}
