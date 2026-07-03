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
    .set({ ...data, productType: data.productType as any })
    .where(eq(phytosanitaryProducts.id, id))
    .returning()
  return row
}
