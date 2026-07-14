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
