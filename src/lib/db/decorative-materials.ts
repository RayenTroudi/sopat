import { db } from '../../../db/index'
import { decorativeMaterials } from '../../../db/schema'
import { eq, ilike, asc, and } from 'drizzle-orm'

export type DecorativeMaterialInput = {
  name: string
  code?: string
  photoUrl?: string
  mainMaterial?: string
  aspect?: string
  color?: string
  caliber?: string
  waterAbsorption?: string
  packaging?: string
  usedInterior?: boolean
  usedExterior?: boolean
  handling?: string
  packagingDetails?: string
  storageConditions?: string
  maintenance?: string
  notes?: string
}

export async function listDecorativeMaterials(query?: string) {
  return db
    .select()
    .from(decorativeMaterials)
    .where(
      and(
        eq(decorativeMaterials.isActive, true),
        query && query.length >= 2
          ? ilike(decorativeMaterials.name, `%${query}%`)
          : undefined
      )
    )
    .orderBy(asc(decorativeMaterials.name))
}

export async function getDecorativeMaterialById(id: string) {
  const [row] = await db
    .select()
    .from(decorativeMaterials)
    .where(eq(decorativeMaterials.id, id))
    .limit(1)
  return row ?? null
}

export async function createDecorativeMaterial(data: DecorativeMaterialInput, createdBy: string) {
  const [row] = await db
    .insert(decorativeMaterials)
    .values({ ...data, createdBy })
    .returning()
  return row
}

export async function updateDecorativeMaterial(id: string, data: Partial<DecorativeMaterialInput>) {
  const [row] = await db
    .update(decorativeMaterials)
    .set(data)
    .where(eq(decorativeMaterials.id, id))
    .returning()
  return row
}
