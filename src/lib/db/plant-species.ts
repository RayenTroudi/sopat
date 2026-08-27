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
    // Champs explicites : `...data` écrirait toute colonne fournie par l'appelant,
    // qui n'est pas validé à l'exécution (server action).
    .set({
      ...(data.botanicalName !== undefined && { botanicalName: data.botanicalName }),
      ...(data.commonNameFr !== undefined && { commonNameFr: data.commonNameFr }),
      ...(data.lisCode !== undefined && { lisCode: data.lisCode }),
      ...(data.isCaducous !== undefined && { isCaducous: data.isCaducous }),
      ...(data.isToxic !== undefined && { isToxic: data.isToxic }),
      ...(data.hasSpines !== undefined && { hasSpines: data.hasSpines }),
      ...(data.hasFlowers !== undefined && { hasFlowers: data.hasFlowers }),
      ...(data.flowerColor !== undefined && { flowerColor: data.flowerColor }),
      ...(data.floweringPeriod !== undefined && { floweringPeriod: data.floweringPeriod }),
      ...(data.hasFruit !== undefined && { hasFruit: data.hasFruit }),
      ...(data.fruitingPeriod !== undefined && { fruitingPeriod: data.fruitingPeriod }),
      ...(data.adaptedEnvironment !== undefined && { adaptedEnvironment: data.adaptedEnvironment }),
      ...(data.diseases !== undefined && { diseases: data.diseases }),
      ...(data.heightAdultMin !== undefined && { heightAdultMin: data.heightAdultMin }),
      ...(data.heightAdultMax !== undefined && { heightAdultMax: data.heightAdultMax }),
      ...(data.diameterAdultMin !== undefined && { diameterAdultMin: data.diameterAdultMin }),
      ...(data.diameterAdultMax !== undefined && { diameterAdultMax: data.diameterAdultMax }),
      ...(data.storageExposure !== undefined && { storageExposure: data.storageExposure }),
      ...(data.storagePlace !== undefined && { storagePlace: data.storagePlace }),
      ...(data.plantingPeriod !== undefined && { plantingPeriod: data.plantingPeriod }),
      ...(data.soilType !== undefined && { soilType: data.soilType }),
      ...(data.plantingExposure !== undefined && { plantingExposure: data.plantingExposure }),
      ...(data.wateringCold !== undefined && { wateringCold: data.wateringCold }),
      ...(data.wateringHot !== undefined && { wateringHot: data.wateringHot }),
      ...(data.pruning !== undefined && { pruning: data.pruning }),
      ...(data.phytosanitaryTreatment !== undefined && { phytosanitaryTreatment: data.phytosanitaryTreatment }),
      ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.category    !== undefined && { category: data.category as any }),
      ...(data.defaultUnit !== undefined && { defaultUnit: data.defaultUnit as any }),
    })
    .where(eq(plantSpecies.id, id))
    .returning()
  return row
}
