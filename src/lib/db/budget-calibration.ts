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
    sql`${projects.status} = 'completed'`,
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
