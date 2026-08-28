import { db } from '../../../db/index'
import { projects, plantListItems } from '../../../db/schema'
import { and, eq, ne, isNull, desc, sql } from 'drizzle-orm'
import type { EnginePlantItem, PlantCategory } from '../budget-engine'
import { getProjectSpendMap, ZERO_SPEND } from './project-spend'

// Projets terminés comparables au projet cible, avec leur coût réel.
//
// Le coût réel est la consommation budgétaire canonique (project-spend.ts) :
// BC + dépenses approuvées + achats FOR-AC-10 non rattachés + locations
// d'engins. À défaut — projet sans dépense enregistrée — on retombe sur le
// budget approuvé.
//
// Pourquoi la règle canonique et pas les seuls bons de commande : le
// dénominateur du ratio est `computeBottomUp`, qui estime plants + terre +
// main-d'œuvre + ENGINS + logistique. Calibrer une estimation qui inclut la
// machinerie contre un réel qui l'exclut biaisait le facteur vers le bas, et
// donc sous-estimait précisément les chantiers les plus mécanisés. Les achats
// FOR-AC-10 hors bon de commande relèvent de la même logique côté plants et
// terre végétale.
//
// Sert à calibrer le moteur d'estimation (ratio réel / estimé) : le facteur
// est la médiane de ces ratios. Le calcul du facteur, son clamp, l'écart-type
// et les critères de sélection des projets ne sont PAS modifiés ici.

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

  // Un seul lot pour tous les candidats : deux requêtes par projet auparavant.
  const spendMap = await getProjectSpendMap(candidates.map((c) => c.id))

  const out: SimilarProjectData[] = []
  for (const p of candidates) {
    // Repli inchangé : un projet terminé sans dépense enregistrée est calibré
    // sur son budget approuvé, et écarté si celui-ci est nul lui aussi.
    let actual = (spendMap.get(p.id) ?? ZERO_SPEND).spent
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
