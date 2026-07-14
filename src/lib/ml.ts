// ML prediction client utilities consumed by UI components and the API route.

export type PlantListItem = {
  species: string
  category: string
  quantity: number
  unit_price_estimate: number
}

export type ProjectMeta = {
  project_type: 'residential' | 'commercial' | 'public'
  site_area_m2: number
  region: 'tunis' | 'sfax' | 'sousse' | 'bizerte' | 'gabes'
  season: 'spring' | 'summer' | 'autumn' | 'winter'
}

export type PredictionBreakdown = {
  plants: number
  soil_substrates: number
  labor: number
  equipment: number
  logistics: number
}

export type PredictionResult = {
  predicted_total: number
  confidence_low: number
  confidence_high: number
  confidence_score: number        // 0-100
  breakdown: PredictionBreakdown
  top_cost_drivers: string[]
  model_version: string
  similar_projects_used: number
  is_fallback?: boolean
}

// ─── API call ─────────────────────────────────────────────────────────────────

export async function runPrediction(
  plantList: PlantListItem[],
  projectMeta: ProjectMeta,
  projectId: string
): Promise<PredictionResult> {
  const res = await fetch('/api/ml/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plant_list: plantList, ...projectMeta, project_id: projectId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? 'Erreur de prédiction')
  }
  return res.json()
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

const FMT = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatPredictionResult(result: PredictionResult): {
  total: string
  low: string
  high: string
  range: string
  plants: string
  soil: string
  labor: string
  equipment: string
  logistics: string
  confidence: string
  isFallback: boolean
} {
  const fmt = (n: number) => `${FMT.format(Math.round(n))} TND`
  return {
    total:      fmt(result.predicted_total),
    low:        fmt(result.confidence_low),
    high:       fmt(result.confidence_high),
    range:      `${fmt(result.confidence_low)} – ${fmt(result.confidence_high)}`,
    plants:     fmt(result.breakdown.plants),
    soil:       fmt(result.breakdown.soil_substrates),
    labor:      fmt(result.breakdown.labor),
    equipment:  fmt(result.breakdown.equipment),
    logistics:  fmt(result.breakdown.logistics),
    confidence: `${result.confidence_score}%`,
    isFallback: result.is_fallback ?? false,
  }
}

// ─── Status colour helpers ────────────────────────────────────────────────────

/** Returns a CSS variable string for a confidence score. */
export function getPredictionStatusColor(confidenceScore: number): string {
  if (confidenceScore >= 75) return 'var(--admin-emerald)'
  if (confidenceScore >= 55) return 'var(--admin-amber)'
  return 'var(--admin-red)'
}

/** Tailwind-compatible background dim class for confidence badge. */
export function getPredictionStatusBg(confidenceScore: number): string {
  if (confidenceScore >= 75) return 'var(--admin-emerald-dim)'
  if (confidenceScore >= 55) return 'var(--admin-amber-dim)'
  return 'var(--admin-red-dim)'
}
