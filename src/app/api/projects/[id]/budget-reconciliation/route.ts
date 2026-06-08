import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess, logActivity } from '@/lib/db/projects'
import {
  getBudgetReconciliation,
  saveBudgetReconciliation,
  getTotalSpent,
} from '@/lib/db/realisation'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const schema = z.object({
  notes: z.string().min(1, 'Les notes de rapprochement sont obligatoires'),
})

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const [reconciliation, totalSpent] = await Promise.all([
    getBudgetReconciliation(id),
    getTotalSpent(id),
  ])

  return NextResponse.json({ reconciliation, totalSpent })
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const { project } = access
  const totalSpent = await getTotalSpent(id)

  const recon = await saveBudgetReconciliation({
    projectId:      id,
    approvedBudget: project.approvedBudget ?? '0',
    totalSpent,
    notes:          parsed.data.notes,
    userId:         session.user.userId,
  })

  await logActivity({
    projectId: id,
    actorId:   session.user.userId,
    actorName: session.user.name ?? session.user.email ?? 'Inconnu',
    action:    'realisation.budget_reconciliation_submitted',
    newState:  { totalSpent, approvedBudget: project.approvedBudget },
  })

  return NextResponse.json(recon, { status: 201 })
}
