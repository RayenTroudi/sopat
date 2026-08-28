import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '../../../../../db/index'
import { budgetPredictions, projects } from '../../../../../db/schema'
import { eq, and, desc, isNull, sql } from 'drizzle-orm'
import { ENGINE_VERSION } from '@/lib/budget-engine'
import { getProjectSpendMap } from '@/lib/db/project-spend'

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

  // « Réel » des projets terminés, pour la variance prédite/réelle.
  //
  // C'est la consommation budgétaire canonique (BC + dépenses approuvées +
  // achats FOR-AC-10 non rattachés + locations d'engins), la même que la fiche
  // projet, la liste, le tableau de bord et les alertes. Cette route ne sommait
  // que les bons de commande, si bien qu'un montant affiché « Réel » y valait
  // moins qu'ailleurs dans l'application pour le même chantier.
  const completedIds = preds.filter((p) => p.projectStatus === 'completed').map((p) => p.projectId)
  const spendMap = await getProjectSpendMap(completedIds)

  const rows = preds.map((p) => {
    const spent = spendMap.get(p.projectId)?.spent ?? null
    return {
      ...p,
      actualSpend: spent,
      variancePct: spent && parseFloat(p.predictedTotal)
        ? Math.round(((parseFloat(p.predictedTotal) - spent) / spent) * 1000) / 10
        : null,
    }
  })

  return NextResponse.json({
    engine: { version: ENGINE_VERSION, completedProjects: completed?.n ?? 0 },
    predictions: rows,
  })
}
