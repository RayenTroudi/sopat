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
