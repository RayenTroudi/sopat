import { db } from '../../../db/index'
import { plantSpecies } from '../../../db/schema'
import { eq, ilike, asc, or } from 'drizzle-orm'

export type PlantSpeciesInput = {
  botanicalName: string
  commonNameFr?: string
  category: string
  defaultUnit?: string
  lisCode?: string
  isCaducous?: boolean
  isToxic?: boolean
  hasSpines?: boolean
  hasFlowers?: boolean
  flowerColor?: string
  floweringPeriod?: string
  hasFruit?: boolean
  fruitingPeriod?: string
  adaptedEnvironment?: string
  diseases?: string
  heightAdultMin?: string
  heightAdultMax?: string
  diameterAdultMin?: string
  diameterAdultMax?: string
  storageExposure?: string
  storagePlace?: string
  plantingPeriod?: string
  soilType?: string
  plantingExposure?: string
  wateringCold?: string
  wateringHot?: string
  pruning?: string
  phytosanitaryTreatment?: string
  photoUrl?: string
  notes?: string
}

export async function listPlantSpecies(query?: string) {
  return db
    .select()
    .from(plantSpecies)
    .where(
      query && query.length >= 2
        ? or(
            ilike(plantSpecies.botanicalName, `%${query}%`),
            ilike(plantSpecies.commonNameFr, `%${query}%`)
          )
        : undefined
    )
    .orderBy(asc(plantSpecies.botanicalName))
}

export async function getPlantSpeciesById(id: string) {
  const [row] = await db
    .select()
    .from(plantSpecies)
    .where(eq(plantSpecies.id, id))
    .limit(1)
  return row ?? null
}

export async function createPlantSpecies(data: PlantSpeciesInput, createdBy: string) {
  const [row] = await db
    .insert(plantSpecies)
    .values({
      ...data,
      category: data.category as any,
      defaultUnit: (data.defaultUnit ?? 'unit') as any,
      createdBy,
    })
    .returning()
  return row
}

export async function updatePlantSpecies(id: string, data: Partial<PlantSpeciesInput>) {
  const [row] = await db
    .update(plantSpecies)
    .set({ ...data, category: data.category as any, defaultUnit: data.defaultUnit as any })
    .where(eq(plantSpecies.id, id))
    .returning()
  return row
}
