import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/db/projects'
import { savePrediction } from '@/lib/db/predictions'
import { getSimilarCompletedProjects } from '@/lib/db/budget-calibration'
import { getBudgetEngineConfig } from '@/lib/db/settings'
import {
  computeBottomUp,
  computeCalibration,
  predictBudget,
  type EngineInput,
  type PlantCategory,
  type ProjectType,
} from '@/lib/budget-engine'
import { z } from 'zod'

// Moteur d'estimation v2 : bottom-up déterministe + calibration sur les projets
// terminés similaires. Tourne nativement (TypeScript) — identique en dev et sur Vercel.

const plantItemSchema = z.object({
  species: z.string(),
  category: z.string(),
  quantity: z.number().min(0),
  unit: z.string().default('unit'),
  unit_price_estimate: z.number().min(0),
})

const bodySchema = z.object({
  project_id: z.string().uuid(),
  // Valeur brute de projects.project_type (espace_public, residentiel, …) —
  // l'ancien enum residential/commercial/public rejetait tous les vrais projets.
  project_type: z.string().min(1),
  site_area_m2: z.number().min(0),
  region: z.enum(['tunis', 'sfax', 'sousse', 'bizerte', 'gabes']).default('tunis'),
  season: z.enum(['spring', 'summer', 'autumn', 'winter']).default('spring'),
  plant_list: z.array(plantItemSchema).default([]),
})

const VALID_CATEGORIES = new Set<string>([
  'tree', 'palm', 'shrub', 'ground_cover', 'climber', 'grass', 'aquatic', 'other',
])

// Le type projet en base est mappé vers la taxonomie de coefficients du moteur.
// La similarité (calibration), elle, compare les types en base bruts entre eux.
const DB_TYPE_TO_ENGINE: Record<string, ProjectType> = {
  residentiel: 'residential',
  interieur: 'residential',
  residential: 'residential',
  siege_social: 'commercial',
  hotelier_touristique: 'commercial',
  commercial: 'commercial',
  espace_public: 'public',
  ingenierie_territoriale: 'public',
  public: 'public',
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }
  const data = parsed.data

  const access = await assertProjectAccess(data.project_id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const config = await getBudgetEngineConfig()
  const engineType: ProjectType = DB_TYPE_TO_ENGINE[data.project_type] ?? 'residential'

  const input: EngineInput = {
    projectType: engineType,
    siteAreaM2: data.site_area_m2,
    region: data.region,
    season: data.season,
    plantList: data.plant_list.map((p) => ({
      name: p.species,
      category: (VALID_CATEGORIES.has(p.category) ? p.category : 'other') as PlantCategory,
      quantity: p.quantity,
      unit: p.unit,
      unitPrice: p.unit_price_estimate > 0 ? p.unit_price_estimate : null,
    })),
  }

  // Calibration : ratio réel/estimé des projets terminés comparables
  // (comparaison sur le type en base brut — hôtelier avec hôtelier, etc.)
  const similar = await getSimilarCompletedProjects({
    excludeProjectId: data.project_id,
    projectType: data.project_type,
    siteAreaM2: data.site_area_m2,
  })
  const ratios: number[] = []
  const refs: string[] = []
  for (const s of similar) {
    const est = computeBottomUp(
      { projectType: engineType, siteAreaM2: s.siteAreaM2, region: 'tunis', season: 'spring', plantList: s.plantList },
      config
    ).total
    if (est > 0) {
      ratios.push(s.actualCost / est)
      refs.push(s.reference)
    }
  }

  const result = predictBudget(input, config, computeCalibration(ratios), refs)

  try {
    await savePrediction({
      projectId: data.project_id,
      output: result,
      rawInput: { ...input, calibration_refs: refs } as unknown as Record<string, unknown>,
      isFallback: false,
      createdBy: session.user.userId,
    })
  } catch (dbErr) {
    console.error('[ML predict] Échec de sauvegarde de la prédiction:', dbErr)
  }

  return NextResponse.json(result)
}
