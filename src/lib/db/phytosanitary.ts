import { db } from '../../../db/index'
import { phytosanitaryProducts } from '../../../db/schema'
import { eq, ilike, asc, and } from 'drizzle-orm'

export type PhytosanitaryInput = {
  productType: string
  commercialName: string
  code?: string
  approvalNumber?: string
  activeIngredient?: string
  formulation?: string
  concentration?: string
  usageDose?: string
  targetPests?: string
  targetCrop?: string
  reEntryDelay?: string
  technicalDocs?: string
  packaging?: string
  toxicologicalClass?: string
  ppe?: string
  storageConditions?: string
  preUseInstructions?: string
  duringUseInstructions?: string
  wasteDisposal?: string
  photoUrl?: string
  notes?: string
}

export async function listPhytosanitaryProducts(typeFilter?: string) {
  return db
    .select()
    .from(phytosanitaryProducts)
    .where(
      and(
        eq(phytosanitaryProducts.isActive, true),
        typeFilter ? eq(phytosanitaryProducts.productType, typeFilter as any) : undefined
      )
    )
    .orderBy(asc(phytosanitaryProducts.productType), asc(phytosanitaryProducts.commercialName))
}

export async function getPhytosanitaryById(id: string) {
  const [row] = await db
    .select()
    .from(phytosanitaryProducts)
    .where(eq(phytosanitaryProducts.id, id))
    .limit(1)
  return row ?? null
}

export async function createPhytosanitary(data: PhytosanitaryInput, createdBy: string) {
  const [row] = await db
    .insert(phytosanitaryProducts)
    .values({ ...data, productType: data.productType as any, createdBy })
    .returning()
  return row
}

export async function updatePhytosanitary(id: string, data: Partial<PhytosanitaryInput>) {
  const [row] = await db
    .update(phytosanitaryProducts)
    // Voir plant-species : champs explicites, colonnes système protégées.
    .set({
      ...(data.commercialName !== undefined && { commercialName: data.commercialName }),
      ...(data.code !== undefined && { code: data.code }),
      ...(data.approvalNumber !== undefined && { approvalNumber: data.approvalNumber }),
      ...(data.activeIngredient !== undefined && { activeIngredient: data.activeIngredient }),
      ...(data.formulation !== undefined && { formulation: data.formulation }),
      ...(data.concentration !== undefined && { concentration: data.concentration }),
      ...(data.usageDose !== undefined && { usageDose: data.usageDose }),
      ...(data.targetPests !== undefined && { targetPests: data.targetPests }),
      ...(data.targetCrop !== undefined && { targetCrop: data.targetCrop }),
      ...(data.reEntryDelay !== undefined && { reEntryDelay: data.reEntryDelay }),
      ...(data.technicalDocs !== undefined && { technicalDocs: data.technicalDocs }),
      ...(data.packaging !== undefined && { packaging: data.packaging }),
      ...(data.toxicologicalClass !== undefined && { toxicologicalClass: data.toxicologicalClass }),
      ...(data.ppe !== undefined && { ppe: data.ppe }),
      ...(data.storageConditions !== undefined && { storageConditions: data.storageConditions }),
      ...(data.preUseInstructions !== undefined && { preUseInstructions: data.preUseInstructions }),
      ...(data.duringUseInstructions !== undefined && { duringUseInstructions: data.duringUseInstructions }),
      ...(data.wasteDisposal !== undefined && { wasteDisposal: data.wasteDisposal }),
      ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.productType !== undefined && { productType: data.productType as any }),
    })
    .where(eq(phytosanitaryProducts.id, id))
    .returning()
  return row
}
