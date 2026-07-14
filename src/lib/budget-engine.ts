// Moteur d'estimation budgétaire v2 — déterministe et traçable.
// Couche 1 : calcul bottom-up par poste à partir de la liste végétale réelle.
// Couche 2 : calibration par ratio médian réel/estimé des projets terminés similaires.
// Aucun accès DB ici : fonctions pures, testables via scripts/test-budget-engine.ts.

import type { PredictionResult, PredictionBreakdown } from './ml'

export const ENGINE_VERSION = 'engine-v2.0'

export type ProjectType = 'residential' | 'commercial' | 'public'
export type Region = 'tunis' | 'sfax' | 'sousse' | 'bizerte' | 'gabes'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type PlantCategory =
  | 'tree' | 'palm' | 'shrub' | 'ground_cover'
  | 'climber' | 'grass' | 'aquatic' | 'other'

export type EnginePlantItem = {
  name: string
  category: PlantCategory
  quantity: number
  unit: string               // 'unit' | 'm2' | 'm3' | 'kg' | 'liter' | 'ml'
  unitPrice: number | null   // null = prix manquant → défaut par catégorie
}

export type EngineInput = {
  projectType: ProjectType
  siteAreaM2: number
  region: Region
  season: Season
  plantList: EnginePlantItem[]
}

export type BudgetEngineConfig = {
  version: string
  defaultUnitPrice: Record<PlantCategory, number>   // TND
  pitVolumeM3: { tree: number; palm: number }       // fosse de plantation par sujet
  prepDepthM: { grass: number; ground_cover: number; aquatic: number }
  soilPricePerM3: number
  amendmentPerM2: number                            // amendements ∝ surface du site
  laborDaysPerUnit: Record<PlantCategory, number>   // jours-homme par unité plantée
  laborDailyRate: number                            // TND / jour
  projectTypeLaborFactor: Record<ProjectType, number>
  seasonLaborFactor: Record<Season, number>
  miniPelleThresholdSubjects: number                // arbres+palmiers déclenchant la mini-pelle
  miniPelleSubjectsPerDay: number
  miniPelleDailyRate: number
  areaMachineryThresholdM2: number
  areaMachineryCost: number                         // forfait préparation grande surface
  logisticsPctOfPlants: number
  logisticsFloor: number
  regionMultiplier: Record<Region, number>
}

export const DEFAULT_ENGINE_CONFIG: BudgetEngineConfig = {
  version: 'cfg-default',
  defaultUnitPrice: { tree: 200, palm: 350, shrub: 25, ground_cover: 12, climber: 40, grass: 6, aquatic: 30, other: 15 },
  pitVolumeM3: { tree: 0.6, palm: 1.0 },
  prepDepthM: { grass: 0.15, ground_cover: 0.10, aquatic: 0 },
  soilPricePerM3: 45,
  amendmentPerM2: 1.2,
  laborDaysPerUnit: { tree: 0.5, palm: 1.0, shrub: 0.05, ground_cover: 0.02, climber: 0.08, grass: 0.01, aquatic: 0.06, other: 0.03 },
  laborDailyRate: 60,
  projectTypeLaborFactor: { residential: 1.0, commercial: 1.1, public: 1.2 },
  seasonLaborFactor: { spring: 1.0, summer: 1.1, autumn: 1.0, winter: 1.05 },
  miniPelleThresholdSubjects: 10,
  miniPelleSubjectsPerDay: 8,
  miniPelleDailyRate: 450,
  areaMachineryThresholdM2: 1000,
  areaMachineryCost: 1500,
  logisticsPctOfPlants: 0.08,
  logisticsFloor: 300,
  regionMultiplier: { tunis: 1.0, sfax: 0.95, sousse: 1.0, bizerte: 0.97, gabes: 0.92 },
}

// ─── Couche 1 : bottom-up ─────────────────────────────────────────────────────

export type BottomUpResult = {
  breakdown: PredictionBreakdown
  total: number
  missingPriceCount: number
  largestPlantLine: { name: string; cost: number } | null
}

export function computeBottomUp(input: EngineInput, config: BudgetEngineConfig): BottomUpResult {
  let plants = 0
  let soil = 0
  let laborDays = 0
  let subjects = 0            // arbres + palmiers (mini-pelle)
  let missingPriceCount = 0
  let largest: { name: string; cost: number } | null = null

  for (const item of input.plantList) {
    const qty = item.quantity > 0 ? item.quantity : 0
    if (qty === 0) continue

    if (item.unitPrice === null) missingPriceCount++
    const price = item.unitPrice ?? config.defaultUnitPrice[item.category] ?? config.defaultUnitPrice.other
    const lineCost = qty * price
    plants += lineCost
    if (!largest || lineCost > largest.cost) largest = { name: item.name, cost: lineCost }

    if (item.category === 'tree' || item.category === 'palm') {
      soil += qty * config.pitVolumeM3[item.category] * config.soilPricePerM3
      subjects += qty
    } else if (
      (item.category === 'grass' || item.category === 'ground_cover' || item.category === 'aquatic') &&
      item.unit === 'm2'
    ) {
      soil += qty * config.prepDepthM[item.category] * config.soilPricePerM3
    }
    laborDays += qty * (config.laborDaysPerUnit[item.category] ?? config.laborDaysPerUnit.other)
  }

  soil += Math.max(0, input.siteAreaM2) * config.amendmentPerM2

  const labor =
    laborDays *
    config.laborDailyRate *
    config.projectTypeLaborFactor[input.projectType] *
    config.seasonLaborFactor[input.season]

  let equipment = 0
  if (subjects >= config.miniPelleThresholdSubjects) {
    equipment += Math.ceil(subjects / config.miniPelleSubjectsPerDay) * config.miniPelleDailyRate
  }
  if (input.siteAreaM2 >= config.areaMachineryThresholdM2) {
    equipment += config.areaMachineryCost
  }

  const logistics =
    Math.max(config.logisticsFloor, plants * config.logisticsPctOfPlants) *
    config.regionMultiplier[input.region]

  const breakdown: PredictionBreakdown = {
    plants: Math.round(plants),
    soil_substrates: Math.round(soil),
    labor: Math.round(labor),
    equipment: Math.round(equipment),
    logistics: Math.round(logistics),
  }
  const total =
    breakdown.plants + breakdown.soil_substrates + breakdown.labor +
    breakdown.equipment + breakdown.logistics

  return { breakdown, total, missingPriceCount, largestPlantLine: largest }
}

// ─── Couche 2 : calibration ───────────────────────────────────────────────────

export type Calibration = {
  factor: number   // médiane des ratios réel/estimé, clampée [0.7, 1.4]
  spread: number   // demi-largeur de l'intervalle de confiance
  count: number    // nombre de projets similaires retenus
}

export function computeCalibration(ratios: number[]): Calibration {
  const valid = ratios.filter((r) => Number.isFinite(r) && r > 0)
  if (valid.length === 0) return { factor: 1, spread: 0.18, count: 0 }

  const sorted = [...valid].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  const factor = Math.min(1.4, Math.max(0.7, median))

  let spread = 0.18
  if (valid.length >= 2) {
    const mean = valid.reduce((s, r) => s + r, 0) / valid.length
    const variance = valid.reduce((s, r) => s + (r - mean) ** 2, 0) / valid.length
    spread = Math.max(0.10, Math.sqrt(variance))
  }
  return { factor, spread, count: valid.length }
}

export function computeConfidence(p: {
  similarCount: number
  missingPrices: boolean
  missingArea: boolean
}): number {
  let score = Math.min(90, 55 + p.similarCount * 8)
  if (p.missingPrices) score -= 10
  if (p.missingArea) score -= 10
  return Math.max(25, score)
}

// ─── Prédiction complète ──────────────────────────────────────────────────────

export function predictBudget(
  input: EngineInput,
  config: BudgetEngineConfig,
  calibration: Calibration,
  similarRefs: string[] = []
): PredictionResult {
  const base = computeBottomUp(input, config)
  const f = calibration.factor

  const breakdown: PredictionBreakdown = {
    plants: Math.round(base.breakdown.plants * f),
    soil_substrates: Math.round(base.breakdown.soil_substrates * f),
    labor: Math.round(base.breakdown.labor * f),
    equipment: Math.round(base.breakdown.equipment * f),
    logistics: Math.round(base.breakdown.logistics * f),
  }
  const total =
    breakdown.plants + breakdown.soil_substrates + breakdown.labor +
    breakdown.equipment + breakdown.logistics

  const drivers: string[] = []
  if (base.largestPlantLine && base.breakdown.plants > 0) {
    const pct = Math.round((base.largestPlantLine.cost / base.breakdown.plants) * 100)
    drivers.push(`${base.largestPlantLine.name} — ${pct}% du poste plantes`)
  }
  const postes: [keyof PredictionBreakdown, string][] = [
    ['plants', 'Plantes'],
    ['soil_substrates', 'Sols & substrats'],
    ['labor', "Main d'œuvre"],
    ['equipment', 'Matériel'],
    ['logistics', 'Logistique'],
  ]
  const [topKey, topLabel] = postes.reduce((best, cur) => (breakdown[cur[0]] > breakdown[best[0]] ? cur : best))
  drivers.push(`${topLabel} : ${total > 0 ? Math.round((breakdown[topKey] / total) * 100) : 0}% du total`)
  drivers.push(
    calibration.count > 0
      ? `Calibré sur ${calibration.count} projet(s) terminé(s)${similarRefs.length > 0 ? ` : ${similarRefs.slice(0, 3).join(', ')}` : ''}`
      : 'Aucun projet similaire terminé — coefficients standards'
  )

  return {
    predicted_total: total,
    confidence_low: Math.round(total * (1 - calibration.spread)),
    confidence_high: Math.round(total * (1 + calibration.spread)),
    confidence_score: computeConfidence({
      similarCount: calibration.count,
      missingPrices: base.missingPriceCount > 0,
      missingArea: !(input.siteAreaM2 > 0),
    }),
    breakdown,
    top_cost_drivers: drivers.slice(0, 3),
    model_version: `${ENGINE_VERSION}/${config.version}`,
    similar_projects_used: calibration.count,
    is_fallback: false,
  }
}
