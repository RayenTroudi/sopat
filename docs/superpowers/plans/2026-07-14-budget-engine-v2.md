# Budget Engine v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the synthetic-data XGBoost + Python subprocess predictor (which never runs on Vercel) with a deterministic TypeScript engine calibrated against SOPAT's own completed projects.

**Architecture:** A pure-function engine (`src/lib/budget-engine.ts`) computes a bottom-up cost breakdown from the real plant list; a DB module fetches similar completed projects and their actual spend; the `/api/ml/predict` route combines both and persists via the existing `savePrediction`. UI contract (`PredictionResult`) unchanged.

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle ORM on Neon Postgres, tsx for test scripts.

**Spec:** `docs/superpowers/specs/2026-07-14-budget-engine-v2-design.md`

## Global Constraints

- Work on branch `feat/budget-engine-v2` off `main`.
- No DB migration — reuse `budget_predictions`, `budget_validations`, `system_settings` as-is.
- `src/lib/budget-engine.ts` must import nothing from `db/` (pure functions only; types from `src/lib/ml.ts` are fine).
- All user-facing strings in French.
- Commit trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Tests run via `npx tsx scripts/test-budget-engine.ts` (repo has no jest/vitest; follow the existing tsx-script convention).
- Windows environment: use the Bash tool for git; file paths in code are POSIX-style module paths.

---

### Task 1: Pure estimation engine + test script

**Files:**
- Create: `src/lib/budget-engine.ts`
- Test: `scripts/test-budget-engine.ts`

**Interfaces:**
- Consumes: `PredictionResult`, `PredictionBreakdown` types from `src/lib/ml.ts` (already exist).
- Produces (used by Tasks 2–4):
  - `ENGINE_VERSION: string` (`'engine-v2.0'`)
  - `DEFAULT_ENGINE_CONFIG: BudgetEngineConfig`
  - `type BudgetEngineConfig`, `type EngineInput`, `type EnginePlantItem`, `type PlantCategory`, `type ProjectType`, `type Region`, `type Season`, `type Calibration`
  - `computeBottomUp(input: EngineInput, config: BudgetEngineConfig): BottomUpResult`
  - `computeCalibration(ratios: number[]): Calibration`
  - `computeConfidence(p: { similarCount: number; missingPrices: boolean; missingArea: boolean }): number`
  - `predictBudget(input: EngineInput, config: BudgetEngineConfig, calibration: Calibration, similarRefs?: string[]): PredictionResult`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-budget-engine.ts`:

```ts
/**
 * Tests du moteur d'estimation budgétaire v2.
 * Run: npx tsx scripts/test-budget-engine.ts
 */
import {
  DEFAULT_ENGINE_CONFIG,
  computeBottomUp,
  computeCalibration,
  computeConfidence,
  predictBudget,
  type EngineInput,
} from '../src/lib/budget-engine'

let failures = 0
function assertEq(actual: unknown, expected: unknown, label: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) {
    failures++
    console.error(`✗ ${label}\n    attendu: ${JSON.stringify(expected)}\n    obtenu:  ${JSON.stringify(actual)}`)
  } else {
    console.log(`✓ ${label}`)
  }
}

// ── Cas 1 : bottom-up, valeurs calculées à la main ────────────────────────────
// residential, 100 m², tunis, autumn
// 10 arbres à 100 TND + 50 m² gazon à 5 TND
const input1: EngineInput = {
  projectType: 'residential',
  siteAreaM2: 100,
  region: 'tunis',
  season: 'autumn',
  plantList: [
    { name: 'Olea europaea', category: 'tree', quantity: 10, unit: 'unit', unitPrice: 100 },
    { name: 'Gazon', category: 'grass', quantity: 50, unit: 'm2', unitPrice: 5 },
  ],
}
const b1 = computeBottomUp(input1, DEFAULT_ENGINE_CONFIG)
// plantes  : 10×100 + 50×5                        = 1250
// sols     : 10×0.6×45 + 50×0.15×45 + 100×1.2     = 270 + 337.5 + 120 = 727.5 → 728
// main d'œ : (10×0.5 + 50×0.01)×60×1.0×1.0        = 5.5×60 = 330
// matériel : 10 sujets ≥ seuil 10 → ceil(10/8)=2 j × 450 = 900 ; surface 100 < 1000
// logistique: max(300, 1250×0.08=100) × 1.0        = 300
assertEq(b1.breakdown.plants, 1250, 'plants')
assertEq(b1.breakdown.soil_substrates, 728, 'soil_substrates')
assertEq(b1.breakdown.labor, 330, 'labor')
assertEq(b1.breakdown.equipment, 900, 'equipment')
assertEq(b1.breakdown.logistics, 300, 'logistics')
assertEq(b1.total, 3508, 'total bottom-up')
assertEq(b1.missingPriceCount, 0, 'aucun prix manquant')
assertEq(b1.largestPlantLine?.name, 'Olea europaea', 'plus grosse ligne')

// ── Prix manquant → défaut catégorie + compteur ───────────────────────────────
const b2 = computeBottomUp(
  { ...input1, plantList: [{ name: 'X', category: 'shrub', quantity: 4, unit: 'unit', unitPrice: null }] },
  DEFAULT_ENGINE_CONFIG
)
assertEq(b2.breakdown.plants, 100, 'prix par défaut arbuste 4×25')
assertEq(b2.missingPriceCount, 1, 'compteur prix manquant')

// ── Calibration ───────────────────────────────────────────────────────────────
assertEq(computeCalibration([]), { factor: 1, spread: 0.18, count: 0 }, 'calibration vide')
assertEq(computeCalibration([1.2]).factor, 1.2, 'médiane à 1 ratio')
assertEq(computeCalibration([1.2]).spread, 0.18, 'spread par défaut à 1 ratio')
assertEq(computeCalibration([2.0, 1.9, 2.1]).factor, 1.4, 'clamp haut à 1.4')
assertEq(computeCalibration([0.2, 0.3]).factor, 0.7, 'clamp bas à 0.7')
assertEq(computeCalibration([0.9, 1.0, 1.1]).spread, 0.1, 'spread plancher 0.10')
assertEq(computeCalibration([1.0, 2.0]).factor, 1.4, 'médiane paire (1.5) clampée à 1.4')

// ── Confiance ─────────────────────────────────────────────────────────────────
assertEq(computeConfidence({ similarCount: 0, missingPrices: false, missingArea: false }), 55, 'base 55')
assertEq(computeConfidence({ similarCount: 3, missingPrices: false, missingArea: false }), 79, '3 similaires → 79')
assertEq(computeConfidence({ similarCount: 5, missingPrices: false, missingArea: false }), 90, 'plafond 90')
assertEq(computeConfidence({ similarCount: 0, missingPrices: true, missingArea: true }), 35, 'pénalités −10−10')
assertEq(computeConfidence({ similarCount: 0, missingPrices: true, missingArea: true }) >= 25, true, 'plancher 25 respecté')

// ── predictBudget bout en bout (sans calibration) ─────────────────────────────
const r1 = predictBudget(input1, DEFAULT_ENGINE_CONFIG, computeCalibration([]))
assertEq(r1.predicted_total, 3508, 'total prédit')
assertEq(r1.confidence_low, 2877, 'borne basse ±18%')
assertEq(r1.confidence_high, 4139, 'borne haute ±18%')
assertEq(r1.confidence_score, 55, 'confiance sans similaire')
assertEq(r1.similar_projects_used, 0, '0 projet similaire')
assertEq(r1.model_version, 'engine-v2.0/cfg-default', 'version moteur')
assertEq(r1.is_fallback, false, 'jamais fallback')
assertEq(r1.top_cost_drivers.length, 3, '3 cost drivers')

// ── predictBudget avec calibration ×1.2 ──────────────────────────────────────
const r2 = predictBudget(input1, DEFAULT_ENGINE_CONFIG, computeCalibration([1.2]), ['RES-2024-001'])
assertEq(r2.breakdown.plants, 1500, 'plantes ×1.2')
assertEq(r2.similar_projects_used, 1, '1 projet similaire')
assertEq(r2.top_cost_drivers[2].includes('RES-2024-001'), true, 'référence citée')

if (failures > 0) { console.error(`\n${failures} échec(s)`); process.exit(1) }
console.log('\nTous les tests passent.')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx scripts/test-budget-engine.ts`
Expected: FAIL — `Cannot find module '../src/lib/budget-engine'`

- [ ] **Step 3: Write the engine**

Create `src/lib/budget-engine.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx scripts/test-budget-engine.ts`
Expected: all `✓` lines, ends with `Tous les tests passent.`, exit 0.

- [ ] **Step 5: Commit**

```bash
git checkout -b feat/budget-engine-v2
git add src/lib/budget-engine.ts scripts/test-budget-engine.ts
git commit -m "feat: deterministic budget estimation engine v2 (pure TS)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Calibration DB module + engine config getter

**Files:**
- Create: `src/lib/db/budget-calibration.ts`
- Modify: `src/lib/db/settings.ts` (append at end of file)

**Interfaces:**
- Consumes: `EnginePlantItem`, `PlantCategory`, `BudgetEngineConfig`, `DEFAULT_ENGINE_CONFIG` from Task 1.
- Produces (used by Task 3):
  - `getSimilarCompletedProjects(params: { excludeProjectId: string; projectType: string; siteAreaM2: number }): Promise<SimilarProjectData[]>` where `SimilarProjectData = { projectId: string; reference: string; siteAreaM2: number; actualCost: number; plantList: EnginePlantItem[] }`
  - `getBudgetEngineConfig(): Promise<BudgetEngineConfig>` (from settings.ts)

- [ ] **Step 1: Verify the extra-expenses status enum value**

Run: `grep -n "extraExpenseStatusEnum = pgEnum" db/schema.ts`
Expected: enum values include `'approved'`. If the approved value has a different literal, use that literal in Step 2's `eq(extraExpenses.status, ...)` filter.

- [ ] **Step 2: Create `src/lib/db/budget-calibration.ts`**

```ts
import { db } from '../../../db/index'
import { projects, plantListItems, purchaseOrders, extraExpenses } from '../../../db/schema'
import { and, eq, ne, isNull, desc, sql } from 'drizzle-orm'
import type { EnginePlantItem, PlantCategory } from '../budget-engine'

// Projets terminés comparables au projet cible, avec leur coût réel :
// Σ bons d'achat + Σ dépenses supplémentaires approuvées, à défaut le budget approuvé.
// Sert à calibrer le moteur d'estimation (ratio réel / estimé).

export type SimilarProjectData = {
  projectId: string
  reference: string
  siteAreaM2: number
  actualCost: number
  plantList: EnginePlantItem[]
}

export async function getSimilarCompletedProjects(params: {
  excludeProjectId: string
  projectType: string
  siteAreaM2: number
}): Promise<SimilarProjectData[]> {
  const conds = [
    eq(projects.status, 'completed' as const),
    sql`${projects.projectType} = ${params.projectType}`,
    ne(projects.id, params.excludeProjectId),
    isNull(projects.deletedAt),
  ]
  if (params.siteAreaM2 > 0) {
    conds.push(
      sql`${projects.siteAreaM2}::numeric BETWEEN ${params.siteAreaM2 * 0.4} AND ${params.siteAreaM2 * 1.6}`
    )
  }

  const candidates = await db
    .select({
      id: projects.id,
      reference: projects.reference,
      siteAreaM2: projects.siteAreaM2,
      approvedBudget: projects.approvedBudget,
    })
    .from(projects)
    .where(and(...conds))
    .orderBy(desc(projects.updatedAt))
    .limit(10)

  const out: SimilarProjectData[] = []
  for (const p of candidates) {
    const [po] = await db
      .select({ total: sql<string>`coalesce(sum(${purchaseOrders.totalCost}::numeric), 0)::text` })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.projectId, p.id))
    const [ex] = await db
      .select({ total: sql<string>`coalesce(sum(${extraExpenses.amount}::numeric), 0)::text` })
      .from(extraExpenses)
      .where(and(
        eq(extraExpenses.projectId, p.id),
        eq(extraExpenses.status, 'approved'),
        isNull(extraExpenses.deletedAt),
      ))

    let actual = parseFloat(po?.total ?? '0') + parseFloat(ex?.total ?? '0')
    if (actual <= 0) actual = parseFloat(p.approvedBudget ?? '0')
    if (actual <= 0) continue

    const items = await db.select().from(plantListItems).where(eq(plantListItems.projectId, p.id))
    if (items.length === 0) continue

    out.push({
      projectId: p.id,
      reference: p.reference,
      siteAreaM2: parseFloat(p.siteAreaM2 ?? '0') || 0,
      actualCost: actual,
      plantList: items.map((i) => ({
        name: i.botanicalName,
        category: i.category as PlantCategory,
        quantity: parseFloat(i.quantity) || 0,
        unit: i.unit,
        unitPrice: i.unitPriceEstimate !== null ? parseFloat(i.unitPriceEstimate) : null,
      })),
    })
  }
  return out
}
```

Note: if `eq(projects.status, 'completed' as const)` fails type-check against the status enum, use `sql`${projects.status} = 'completed'`` instead.

- [ ] **Step 3: Append the config getter to `src/lib/db/settings.ts`**

Add at the top with the other imports:

```ts
import { DEFAULT_ENGINE_CONFIG, type BudgetEngineConfig } from '../budget-engine'
```

Append at end of file:

```ts
// ─── Configuration du moteur d'estimation budgétaire ─────────────────────────
// Coefficients éditables (clé 'budget_engine_config'). Fusion superficielle avec
// les défauts pour que l'ajout de nouveaux coefficients ne casse pas une config
// enregistrée avec une version antérieure.

export async function getBudgetEngineConfig(): Promise<BudgetEngineConfig> {
  const [row] = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, 'budget_engine_config'))
    .limit(1)
  const stored = (row?.value ?? {}) as Partial<BudgetEngineConfig>
  return { ...DEFAULT_ENGINE_CONFIG, ...stored }
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/budget-calibration.ts src/lib/db/settings.ts
git commit -m "feat: calibration queries + engine config getter

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Rewrite /api/ml/predict + client cleanup

**Files:**
- Modify: `src/app/api/ml/predict/route.ts` (full rewrite)
- Modify: `src/lib/ml.ts` (delete `ruleBased` + `BASE_COST_PER_M2`, lines ~108–138)
- Modify: `src/components/projects/EtudesTab.tsx` (`runPrediction`, ~line 244: send `unit`)
- Modify: `src/components/budget/BudgetPredictionPanel.tsx` (~line 318–327: remove fallback badge)

**Interfaces:**
- Consumes: everything produced by Tasks 1–2.
- Produces: `POST /api/ml/predict` — same request/response JSON contract as before, plus each `plant_list` item may carry `unit: string` (defaults to `'unit'`).

- [ ] **Step 1: Rewrite `src/app/api/ml/predict/route.ts`** (replace entire file)

```ts
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
  project_type: z.enum(['residential', 'commercial', 'public']),
  site_area_m2: z.number().min(0),
  region: z.enum(['tunis', 'sfax', 'sousse', 'bizerte', 'gabes']).default('tunis'),
  season: z.enum(['spring', 'summer', 'autumn', 'winter']).default('spring'),
  plant_list: z.array(plantItemSchema).default([]),
})

const VALID_CATEGORIES = new Set<string>([
  'tree', 'palm', 'shrub', 'ground_cover', 'climber', 'grass', 'aquatic', 'other',
])

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

  const input: EngineInput = {
    projectType: data.project_type,
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
  const similar = await getSimilarCompletedProjects({
    excludeProjectId: data.project_id,
    projectType: data.project_type,
    siteAreaM2: data.site_area_m2,
  })
  const ratios: number[] = []
  const refs: string[] = []
  for (const s of similar) {
    const est = computeBottomUp(
      { projectType: data.project_type, siteAreaM2: s.siteAreaM2, region: 'tunis', season: 'spring', plantList: s.plantList },
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
```

- [ ] **Step 2: Delete the fallback from `src/lib/ml.ts`**

Remove the entire block from the comment `// ─── Rule-based fallback (mirrors Python fallback in the API route) ───────────` to the end of the `ruleBased` function (currently lines 108–138). Keep everything above it (types, `runPrediction`, formatters, status colors) unchanged. `is_fallback?: boolean` stays in `PredictionResult` (old DB rows have it).

- [ ] **Step 3: Send `unit` from EtudesTab**

In `src/components/projects/EtudesTab.tsx`, `runPrediction()`, change the plant list mapping:

```ts
      .map((r) => ({
        species:             r.botanicalName,
        category:            r.category,
        quantity:            parseFloat(r.quantity) || 0,
        unit:                r.unit,
        unit_price_estimate: parseFloat(r.unitPriceEstimate) || 0,
      }))
```

(The only addition is the `unit: r.unit,` line.)

- [ ] **Step 4: Remove the fallback badge in `src/components/budget/BudgetPredictionPanel.tsx`**

Replace:

```tsx
        <div className="flex flex-col items-end gap-2">
          <ConfidenceBadge score={result.confidence_score} />
          {result.is_fallback && (
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{ background: 'var(--admin-amber-dim)', color: 'var(--admin-amber)' }}
            >
              Estimation manuelle (modèle indisponible)
            </span>
          )}
        </div>
```

with:

```tsx
        <div className="flex flex-col items-end gap-2">
          <ConfidenceBadge score={result.confidence_score} />
        </div>
```

- [ ] **Step 5: Type-check and re-run engine tests**

Run: `npx tsc --noEmit && npx tsx scripts/test-budget-engine.ts`
Expected: no type errors; all engine tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/ml/predict/route.ts src/lib/ml.ts src/components/projects/EtudesTab.tsx src/components/budget/BudgetPredictionPanel.tsx
git commit -m "feat: /api/ml/predict runs engine v2 natively, drop rule-based fallback

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: ML status route + settings page rework

**Files:**
- Modify: `src/app/api/ml/status/route.ts` (full rewrite)
- Modify: `src/app/admin/(dashboard)/settings/ml/MLSettingsClient.tsx`
- Delete: `src/app/api/ml/retrain/route.ts`, `src/app/api/ml/training-data/route.ts`

**Interfaces:**
- Consumes: `ENGINE_VERSION` from Task 1.
- Produces: `GET /api/ml/status` → `{ engine: { version: string; completedProjects: number }, predictions: PredictionRow[] }` (PredictionRow unchanged from today).

- [ ] **Step 1: Rewrite `src/app/api/ml/status/route.ts`** (replace entire file)

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '../../../../../db/index'
import { budgetPredictions, projects, purchaseOrders } from '../../../../../db/schema'
import { eq, and, desc, isNull, sql } from 'drizzle-orm'
import { ENGINE_VERSION } from '@/lib/budget-engine'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

  // Projets terminés = base de calibration du moteur
  const [completed] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(projects)
    .where(and(eq(projects.status, 'completed'), isNull(projects.deletedAt)))

  // Dernières prédictions (50)
  const preds = await db
    .select({
      id:              budgetPredictions.id,
      projectId:       budgetPredictions.projectId,
      projectName:     projects.name,
      projectRef:      projects.reference,
      projectStatus:   projects.status,
      predictedTotal:  budgetPredictions.predictedTotal,
      confidenceScore: budgetPredictions.confidenceScore,
      isFallback:      budgetPredictions.isFallback,
      modelVersion:    budgetPredictions.modelVersion,
      status:          budgetPredictions.status,
      createdAt:       budgetPredictions.createdAt,
    })
    .from(budgetPredictions)
    .leftJoin(projects, eq(budgetPredictions.projectId, projects.id))
    .orderBy(desc(budgetPredictions.createdAt))
    .limit(50)

  // Dépense réelle des projets terminés (pour la variance prédite/réelle)
  const completedIds = preds.filter((p) => p.projectStatus === 'completed').map((p) => p.projectId)
  const spendMap: Record<string, number> = {}
  for (const pid of completedIds) {
    const [row] = await db
      .select({ total: sql<string>`coalesce(sum(total_cost::numeric), 0)::text` })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.projectId, pid))
    spendMap[pid] = parseFloat(row?.total ?? '0')
  }

  const rows = preds.map((p) => ({
    ...p,
    actualSpend: spendMap[p.projectId] ?? null,
    variancePct: spendMap[p.projectId] && parseFloat(p.predictedTotal)
      ? Math.round(((parseFloat(p.predictedTotal) - spendMap[p.projectId]) / spendMap[p.projectId]) * 1000) / 10
      : null,
  }))

  return NextResponse.json({
    engine: { version: ENGINE_VERSION, completedProjects: completed?.n ?? 0 },
    predictions: rows,
  })
}
```

- [ ] **Step 2: Rework `MLSettingsClient.tsx`**

Changes (keep `PredictionRow`, `fmtTnd`, `fmtPct`, `varianceColor`, `Section`, the scatter chart, and the history table exactly as they are):

1. Delete the `ModelMetadata` type and the whole `RetrainPanel` function (lines ~12–18 and ~70–159).
2. Replace `StatusData` with:

```ts
type EngineInfo = { version: string; completedProjects: number }

type StatusData = {
  engine:      EngineInfo | null
  predictions: PredictionRow[]
}
```

3. Remove the now-unused `useRef` import (keep `useState`, `useEffect`).
4. In the main component, delete `const meta = data?.metadata` and the three sections «Informations du modèle actuel», «Données d'entraînement», «Réentraîner le modèle». Replace them with a single section placed where the first one was:

```tsx
      {/* Engine info card */}
      <Section
        title="Moteur d'estimation v2"
        subtitle="Estimation déterministe par poste, calibrée sur les coûts réels des projets terminés"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Version',                        value: data?.engine?.version ?? '—' },
            { label: 'Projets terminés (calibration)', value: String(data?.engine?.completedProjects ?? 0) },
            { label: 'Méthode',                        value: 'Bottom-up + calibration' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--admin-text)' }}>{value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs mt-4" style={{ color: 'var(--admin-text-muted)' }}>
          Chaque poste (plantes, sols &amp; substrats, main d&apos;œuvre, matériel, logistique) est calculé
          à partir de la liste végétale réelle du projet, puis calibré sur le ratio coût réel / estimation
          des projets terminés comparables. Plus de projets terminés = estimations plus précises.
          La validation humaine du chef reste requise pour chaque budget.
        </p>
      </Section>
```

5. Update the page header: title `Prédiction budgétaire` and subtitle `Moteur déterministe v2 · calibration automatique` (replacing `Modèle de prédiction ML` / `XGBoost · Gestion et réentraînement`).

- [ ] **Step 3: Delete the obsolete routes**

```bash
git rm -r "src/app/api/ml/retrain" "src/app/api/ml/training-data"
```

Then verify nothing else references them:
Run: `grep -rn "ml/retrain\|ml/training-data" src/`
Expected: no matches.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: ML settings page reports engine v2, drop retrain/training-data

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Delete Python artifacts, build, PR

**Files:**
- Delete: `scripts/train_model.py`, `scripts/predict.py`, `scripts/retrain_model.py`
- Delete if present: `models/`, `data/training/`, `requirements.txt` (only if its contents are the ML deps — xgboost/scikit-learn/joblib/pandas)

- [ ] **Step 1: Remove the files**

```bash
git rm scripts/train_model.py scripts/predict.py scripts/retrain_model.py
git rm -r --ignore-unmatch models data/training
```

Check `requirements.txt`: `cat requirements.txt` — if it exists and only lists ML packages (xgboost, scikit-learn, pandas, numpy, joblib), `git rm requirements.txt`; otherwise leave it.

- [ ] **Step 2: Verify no dangling references**

Run: `grep -rn "predict.py\|train_model\|retrain_model\|PYTHON_PATH\|model_metadata" src/ db/ --include="*.ts" --include="*.tsx"`
Expected: no matches (comments mentioning the old system in docs/ are fine).

- [ ] **Step 3: Full test + build**

Run: `npx tsx scripts/test-budget-engine.ts && npx tsc --noEmit && npm run build`
Expected: engine tests pass, no type errors, production build succeeds.

- [ ] **Step 4: Commit, push, PR**

```bash
git add -A
git commit -m "chore: remove Python ML pipeline (superseded by engine v2)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push -u origin feat/budget-engine-v2
```

Create the PR with `gh pr create` (title: `Budget prediction engine v2 — deterministic, self-calibrating, Vercel-native`), body written to a temp file and passed via `--body-file` (repo convention — avoids PowerShell `&` parsing issues). Body should cover: why (fallback always ran in prod), the two layers, confidence semantics, what was deleted, and the test evidence from Step 3.

- [ ] **Step 5: Manual smoke test (after merge or on the branch)**

Start the dev server, open project `admin/projects/02051266-d237-417e-8ef9-4c1e2ef0e761`, Études tab, run «Lancer la Prediction Budgetaire». Expected: result card renders with breakdown, confidence badge, drivers mentioning either similar projects or «coefficients standards»; a new row appears in `budget_predictions` with `model_version = 'engine-v2.0/cfg-default'` and `is_fallback = false`.
