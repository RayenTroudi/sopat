import { db } from '../../../db/index'
import {
  plantListItems,
  plantSpecies,
  cloudinaryAssets,
  suppliers,
  projects,
} from '../../../db/schema'
import { eq, and, isNull, ilike, asc } from 'drizzle-orm'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlantCategory = 'tree' | 'shrub' | 'ground_cover' | 'climber' | 'palm' | 'grass' | 'aquatic' | 'other'
export type PlantUnit = 'unit' | 'm2' | 'm3' | 'kg' | 'liter' | 'ml'
export type AssetType = 'render_3d' | 'plan_autocad' | 'specification' | 'reception_document' | 'site_photo' | 'invoice' | 'contract' | 'other'

export type PlantListItemInput = {
  id?: string // present when updating an existing row
  botanicalName: string
  commonName?: string
  category: PlantCategory
  quantity: string
  unit: PlantUnit
  unitPriceEstimate?: string
  supplierId?: string
  notes?: string
  plantSpeciesId?: string
}

// ─── Plant species typeahead ──────────────────────────────────────────────────

export async function searchPlantSpecies(query: string, limit = 20) {
  return db
    .select({
      id: plantSpecies.id,
      botanicalName: plantSpecies.botanicalName,
      commonNameFr: plantSpecies.commonNameFr,
      category: plantSpecies.category,
      defaultUnit: plantSpecies.defaultUnit,
    })
    .from(plantSpecies)
    .where(
      query.length >= 2
        ? ilike(plantSpecies.botanicalName, `%${query}%`)
        : undefined
    )
    .orderBy(asc(plantSpecies.botanicalName))
    .limit(limit)
}

export async function getAllPlantSpecies() {
  return db
    .select({
      id: plantSpecies.id,
      botanicalName: plantSpecies.botanicalName,
      commonNameFr: plantSpecies.commonNameFr,
      category: plantSpecies.category,
      defaultUnit: plantSpecies.defaultUnit,
    })
    .from(plantSpecies)
    .orderBy(asc(plantSpecies.botanicalName))
}

// ─── Suppliers dropdown ───────────────────────────────────────────────────────

export async function getActiveSuppliers() {
  return db
    .select({ id: suppliers.id, name: suppliers.name })
    .from(suppliers)
    .where(eq(suppliers.isActive, true))
    .orderBy(asc(suppliers.name))
}

// ─── Plant list CRUD ──────────────────────────────────────────────────────────

export async function getPlantList(projectId: string) {
  return db
    .select({
      id: plantListItems.id,
      botanicalName: plantListItems.botanicalName,
      commonName: plantListItems.commonName,
      category: plantListItems.category,
      quantity: plantListItems.quantity,
      unit: plantListItems.unit,
      unitPriceEstimate: plantListItems.unitPriceEstimate,
      supplierId: plantListItems.supplierId,
      notes: plantListItems.notes,
      plantSpeciesId: plantListItems.plantSpeciesId,
    })
    .from(plantListItems)
    .where(eq(plantListItems.projectId, projectId))
    .orderBy(asc(plantListItems.createdAt))
}

export async function savePlantList(
  projectId: string,
  items: PlantListItemInput[],
  createdBy: string
) {
  // Full replace: delete existing rows then insert all current rows.
  // This keeps the API simple — the client always sends the full list.
  await db.delete(plantListItems).where(eq(plantListItems.projectId, projectId))

  if (items.length === 0) return []

  const inserted = await db
    .insert(plantListItems)
    .values(
      items.map((item) => ({
        projectId,
        botanicalName: item.botanicalName,
        commonName: item.commonName,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        unitPriceEstimate: item.unitPriceEstimate,
        supplierId: item.supplierId || null,
        notes: item.notes,
        plantSpeciesId: item.plantSpeciesId || null,
        createdBy,
      }))
    )
    .returning()

  return inserted
}

// ─── Cloudinary assets ────────────────────────────────────────────────────────

export async function getProjectAssets(projectId: string) {
  return db
    .select({
      id: cloudinaryAssets.id,
      publicId: cloudinaryAssets.publicId,
      url: cloudinaryAssets.url,
      secureUrl: cloudinaryAssets.secureUrl,
      assetType: cloudinaryAssets.assetType,
      format: cloudinaryAssets.format,
      bytes: cloudinaryAssets.bytes,
      width: cloudinaryAssets.width,
      height: cloudinaryAssets.height,
    })
    .from(cloudinaryAssets)
    .where(eq(cloudinaryAssets.projectId, projectId))
    .orderBy(asc(cloudinaryAssets.createdAt))
}

export async function saveAssetRecord(data: {
  publicId: string
  url: string
  secureUrl: string
  assetType: AssetType
  format?: string
  bytes?: number
  width?: number
  height?: number
  projectId: string
  uploadedBy: string
}) {
  const [asset] = await db
    .insert(cloudinaryAssets)
    .values({
      ...data,
      linkedEntity: 'project',
      linkedEntityId: data.projectId,
      createdBy: data.uploadedBy,
    })
    .returning()
  return asset
}

export async function getAssetById(assetId: string) {
  const [row] = await db
    .select({
      id: cloudinaryAssets.id,
      publicId: cloudinaryAssets.publicId,
      projectId: cloudinaryAssets.projectId,
      assetType: cloudinaryAssets.assetType,
    })
    .from(cloudinaryAssets)
    .where(eq(cloudinaryAssets.id, assetId))
    .limit(1)
  return row ?? null
}

export async function deleteAssetRecord(assetId: string) {
  await db.delete(cloudinaryAssets).where(eq(cloudinaryAssets.id, assetId))
}

// ─── Sign-off prerequisite check ─────────────────────────────────────────────

export type SignoffCheck = {
  hasPlantList: boolean
  hasBudgetApproved: boolean
  hasRender3d: boolean
  hasClientValidation: boolean
  allPassed: boolean
}

export async function checkEtudesSignoffPrerequisites(projectId: string): Promise<SignoffCheck> {
  const [plantList, assets, project] = await Promise.all([
    getPlantList(projectId),
    getProjectAssets(projectId),
    db.select({ approvedBudget: projects.approvedBudget }).from(projects).where(eq(projects.id, projectId)).limit(1),
  ])

  const hasPlantList = plantList.length > 0
  const hasBudgetApproved = !!project[0]?.approvedBudget && Number(project[0].approvedBudget) > 0
  const hasRender3d = assets.some((a) => a.assetType === 'render_3d')
  const hasClientValidation = assets.some((a) => a.assetType === 'reception_document')

  return {
    hasPlantList,
    hasBudgetApproved,
    hasRender3d,
    hasClientValidation,
    allPassed: hasPlantList && hasBudgetApproved && hasRender3d && hasClientValidation,
  }
}
