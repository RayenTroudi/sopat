import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '../../../../../db/index'
import { budgetPredictions, projects } from '../../../../../db/schema'
import { eq, and, desc, isNull, sql } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'

const IS_VERCEL     = Boolean(process.env.VERCEL)
const METADATA_PATH = path.join(process.cwd(), 'models', 'model_metadata.json')
const CSV_PATH      = path.join(process.cwd(), 'data', 'training', 'sopat_projects_2021_2026.csv')

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

  // Model files are not bundled into Vercel deployments — skip filesystem reads
  let metadata: Record<string, unknown> | null = IS_VERCEL
    ? { note: 'Modèle Python non disponible sur Vercel. Utilisez un microservice FastAPI externe.' }
    : null
  if (!IS_VERCEL) {
    try {
      metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8')) as Record<string, unknown>
    } catch { /* model not yet trained */ }
  }

  let trainingRows = 0
  if (!IS_VERCEL) {
    try {
      const csv = fs.readFileSync(CSV_PATH, 'utf8')
      trainingRows = csv.split('\n').filter((l) => l.trim()).length - 1
    } catch { /* no CSV yet */ }
  }

  // Recent predictions (last 50)
  const preds = await db
    .select({
      id:             budgetPredictions.id,
      projectId:      budgetPredictions.projectId,
      projectName:    projects.name,
      projectRef:     projects.reference,
      projectStatus:  projects.status,
      predictedTotal: budgetPredictions.predictedTotal,
      confidenceScore: budgetPredictions.confidenceScore,
      isFallback:     budgetPredictions.isFallback,
      modelVersion:   budgetPredictions.modelVersion,
      status:         budgetPredictions.status,
      createdAt:      budgetPredictions.createdAt,
    })
    .from(budgetPredictions)
    .leftJoin(projects, eq(budgetPredictions.projectId, projects.id))
    .orderBy(desc(budgetPredictions.createdAt))
    .limit(50)

  // Actual spend per project (for completed ones)
  const completedIds = preds
    .filter((p) => p.projectStatus === 'completed')
    .map((p) => p.projectId)

  const spendMap: Record<string, number> = {}
  if (completedIds.length > 0) {
    const { purchaseOrders } = await import('../../../../../db/schema')
    for (const pid of completedIds) {
      const [row] = await db
        .select({ total: sql<string>`coalesce(sum(total_cost::numeric), 0)::text` })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.projectId, pid))
      spendMap[pid] = parseFloat(row?.total ?? '0')
    }
  }

  const rows = preds.map((p) => ({
    ...p,
    actualSpend:   spendMap[p.projectId] ?? null,
    variancePct:   spendMap[p.projectId] && parseFloat(p.predictedTotal)
      ? Math.round(((parseFloat(p.predictedTotal) - spendMap[p.projectId]) / spendMap[p.projectId]) * 1000) / 10
      : null,
  }))

  return NextResponse.json({ metadata, trainingRows, predictions: rows })
}
