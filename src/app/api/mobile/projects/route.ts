import { NextRequest } from 'next/server'
import { and, isNull, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { projects } from '@/db/schema'
import { getProjectSpendMap, spendPercent, ZERO_SPEND } from '@/lib/db/project-spend'
import { requireMobileAuth, corsJson, corsPreflight } from '@/lib/mobile-auth'

export function OPTIONS() {
  return corsPreflight()
}

// Liste allégée des projets pour l'app mobile (sélecteur de projet du scan
// de dépenses) : référence, nom, budget approuvé et consommation actuelle.
//
// La consommation vient de `getProjectSpendMap`, seule définition de la règle
// (BC + dépenses approuvées + achats FOR-AC-10 non rattachés à un BC). Cette
// route en refaisait sa propre version, qui ignorait le troisième terme : un
// chef pouvait donc voir un pourcentage plus bas sur mobile que sur la fiche
// projet du même chantier.
export async function GET(req: NextRequest) {
  const guard = await requireMobileAuth(req, ['admin', 'realisation_chef', 'realisation_team'])
  if ('response' in guard) return guard.response

  const rows = await db
    .select({
      id: projects.id,
      reference: projects.reference,
      name: projects.name,
      currency: projects.currency,
      status: projects.status,
      approvedBudget: projects.approvedBudget,
    })
    .from(projects)
    .where(
      and(
        isNull(projects.deletedAt),
        inArray(projects.status, ['etudes', 'realisation', 'entretien']),
      ),
    )
    .orderBy(projects.reference)

  // Un seul lot pour toute la liste : pas de N+1. `pendingTotal` sort du même
  // helper — les dépenses en attente n'entrent pas dans la consommation (la
  // direction peut encore les rejeter) mais restent affichées dans l'app.
  const spendMap = await getProjectSpendMap(rows.map((r) => r.id))

  return corsJson({
    projects: rows.map((p) => {
      const spend = spendMap.get(p.id) ?? ZERO_SPEND
      const approved = p.approvedBudget ? parseFloat(p.approvedBudget) : null
      return {
        id: p.id,
        reference: p.reference,
        name: p.name,
        currency: p.currency,
        status: p.status,
        approvedBudget: approved,
        spent: spend.spent,
        pendingTotal: spend.pendingTotal,
        percentSpent: spendPercent(spend.spent, approved),
      }
    }),
  })
}
