import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/db/projects'
import { savePrediction } from '@/lib/db/predictions'
import type { PredictionResult } from '@/lib/ml'
import { z } from 'zod'

// ─── Input schema ─────────────────────────────────────────────────────────────

const plantItemSchema = z.object({
  species:              z.string(),
  category:             z.string(),
  quantity:             z.number().min(0),
  unit_price_estimate:  z.number().min(0),
})

const bodySchema = z.object({
  project_id:  z.string().uuid(),
  project_type: z.enum(['residential', 'commercial', 'public']),
  site_area_m2: z.number().min(0),
  region:      z.enum(['tunis', 'sfax', 'sousse', 'bizerte', 'gabes']).default('tunis'),
  season:      z.enum(['spring', 'summer', 'autumn', 'winter']).default('spring'),
  plant_list:  z.array(plantItemSchema).default([]),
})

type Body = z.infer<typeof bodySchema>

// ─── Rule-based fallback (TypeScript mirror of ml.ts for server-side use) ─────

const BASE_COST_PER_M2: Record<string, number> = {
  residential: 180,
  commercial:  220,
  public:      160,
}

function ruleBased(body: Body): PredictionResult {
  const base      = (BASE_COST_PER_M2[body.project_type] ?? 180) * body.site_area_m2
  const plantCost = body.plant_list.reduce((s, p) => s + p.quantity * p.unit_price_estimate, 0)
  const total     = Math.max(base, plantCost * 1.6)
  return {
    predicted_total:       Math.round(total),
    confidence_low:        Math.round(total * 0.85),
    confidence_high:       Math.round(total * 1.15),
    confidence_score:      42,
    breakdown: {
      plants:          Math.round(total * 0.42),
      soil_substrates: Math.round(total * 0.20),
      labor:           Math.round(total * 0.25),
      equipment:       Math.round(total * 0.08),
      logistics:       Math.round(total * 0.05),
    },
    top_cost_drivers:      ['Estimation manuelle', `Surface: ${body.site_area_m2} m²`, body.project_type],
    model_version:         'fallback-rule-based',
    similar_projects_used: 0,
    is_fallback:           true,
  }
}

// ─── Python subprocess ────────────────────────────────────────────────────────
//
// child_process.spawn() is not available on Vercel's serverless runtime.
// When VERCEL=1 is set (injected automatically by Vercel on all deployments)
// we skip Python entirely and go straight to the rule-based fallback below.
// For self-hosted / local dev, the Python model runs as normal.
//
// REPO_ROOT / PREDICT_PY are evaluated lazily (inside the function) so Turbopack
// does not statically trace process.cwd() and include the whole project in the NFT.

const IS_VERCEL  = Boolean(process.env.VERCEL)
const TIMEOUT_MS = 30_000

async function runPython(input: object): Promise<PredictionResult> {
  const [{ spawn }, { join }] = await Promise.all([
    import('child_process'),
    import('path'),
  ])
  const repoRoot  = process.cwd()
  const predictPy = join(repoRoot, 'scripts', 'predict.py')
  const python    = process.env.PYTHON_PATH ?? 'python'

  return new Promise((resolve, reject) => {
    const child = spawn(python, [predictPy], {
      cwd: repoRoot,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (d: Buffer) => { stdout += d.toString('utf8') })
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString('utf8') })

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`Python timeout after ${TIMEOUT_MS}ms`))
    }, TIMEOUT_MS)

    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        reject(new Error(`Python exited ${code}: ${stderr.trim()}`))
        return
      }
      try {
        resolve(JSON.parse(stdout.trim()) as PredictionResult)
      } catch {
        reject(new Error(`Invalid JSON from Python: ${stdout.slice(0, 200)}`))
      }
    })

    child.stdin.write(JSON.stringify(input))
    child.stdin.end()
  })
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data

  // Verify the caller can access this project
  const access = await assertProjectAccess(data.project_id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  // Build Python input payload
  const pythonInput = {
    project_type: data.project_type,
    site_area_m2: data.site_area_m2,
    region:       data.region,
    season:       data.season,
    plant_list:   data.plant_list,
  }

  let result: PredictionResult
  let isFallback = false

  if (IS_VERCEL) {
    // Python subprocess not available on Vercel — use rule-based estimation.
    // Deploy a FastAPI microservice and set PYTHON_ML_URL to enable the full model.
    result     = ruleBased(data)
    isFallback = true
  } else {
    try {
      result = await runPython(pythonInput)
    } catch (err) {
      console.warn('[ML predict] Python failed, using rule-based fallback:', err instanceof Error ? err.message : err)
      result     = ruleBased(data)
      isFallback = true
    }
  }

  // Persist to budget_predictions table
  try {
    await savePrediction({
      projectId:  data.project_id,
      output:     result,
      rawInput:   pythonInput as Record<string, unknown>,
      isFallback,
      createdBy:  session.user.userId,
    })
  } catch (dbErr) {
    // DB save failure must not block the response — log and continue
    console.error('[ML predict] Failed to save prediction to DB:', dbErr)
  }

  return NextResponse.json({ ...result, is_fallback: isFallback })
}
