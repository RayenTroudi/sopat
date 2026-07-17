import { NextResponse } from 'next/server'
import { sql, eq, and, isNull, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { projects, purchaseOrders, extraExpenses } from '@/db/schema'
import { requireApiRole } from '@/lib/auth'

// Liste allégée des projets pour l'app mobile (sélecteur de projet du scan
// de dépenses) : référence, nom, budget approuvé et consommation actuelle
// (bons de commande + dépenses extra approuvées — même règle que les alertes).
export async function GET() {
  const guard = await requireApiRole(['admin', 'direction', 'realisation_chef', 'etudes_chef'])
  if ('response' in guard) return guard.response

  const poSpent = db
    .select({
      projectId: purchaseOrders.projectId,
      total: sql<string>`coalesce(sum(${purchaseOrders.totalCost}::numeric), 0)::text`.as('po_total'),
    })
    .from(purchaseOrders)
    .groupBy(purchaseOrders.projectId)
    .as('po_spent')

  const exSpent = db
    .select({
      projectId: extraExpenses.projectId,
      total: sql<string>`coalesce(sum(${extraExpenses.amount}::numeric), 0)::text`.as('ex_total'),
    })
    .from(extraExpenses)
    .where(and(eq(extraExpenses.status, 'approved'), isNull(extraExpenses.deletedAt)))
    .groupBy(extraExpenses.projectId)
    .as('ex_spent')

  const rows = await db
    .select({
      id: projects.id,
      reference: projects.reference,
      name: projects.name,
      currency: projects.currency,
      status: projects.status,
      approvedBudget: projects.approvedBudget,
      poTotal: poSpent.total,
      exTotal: exSpent.total,
    })
    .from(projects)
    .leftJoin(poSpent, eq(poSpent.projectId, projects.id))
    .leftJoin(exSpent, eq(exSpent.projectId, projects.id))
    .where(
      and(
        isNull(projects.deletedAt),
        inArray(projects.status, ['etudes', 'realisation', 'entretien']),
      ),
    )
    .orderBy(projects.reference)

  return NextResponse.json({
    projects: rows.map((p) => {
      const spent = parseFloat(p.poTotal ?? '0') + parseFloat(p.exTotal ?? '0')
      const approved = p.approvedBudget ? parseFloat(p.approvedBudget) : null
      return {
        id: p.id,
        reference: p.reference,
        name: p.name,
        currency: p.currency,
        status: p.status,
        approvedBudget: approved,
        spent,
        percentSpent: approved && approved > 0 ? Math.round((spent / approved) * 1000) / 10 : null,
      }
    }),
  })
}
