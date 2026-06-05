import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'
import { assertProjectAccess, logActivity } from '@/lib/db/projects'
import { getContract, upsertContract } from '@/lib/db/entretien'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const schema = z.object({
  contractStartDate:  z.string().datetime().optional(),
  contractEndDate:    z.string().datetime().optional(),
  visitFrequency:     z.string().optional(),
  visitFrequencyDays: z.number().int().positive().optional(),
  monthlyCost:        z.string().optional(),
  contractAssetId:    z.string().uuid().optional(),
  notes:              z.string().optional(),
})

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const contract = await getContract(id)
  return NextResponse.json(contract)
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
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

  const d = parsed.data
  const result = await upsertContract({
    projectId:          id,
    contractStartDate:  d.contractStartDate ? new Date(d.contractStartDate) : undefined,
    contractEndDate:    d.contractEndDate   ? new Date(d.contractEndDate)   : undefined,
    visitFrequency:     d.visitFrequency,
    visitFrequencyDays: d.visitFrequencyDays,
    monthlyCost:        d.monthlyCost,
    contractAssetId:    d.contractAssetId,
    notes:              d.notes,
    createdBy:          session.user.userId,
  })

  await logActivity({
    projectId: id,
    actorId:   session.user.userId,
    actorName: session.user.name ?? session.user.email ?? 'Inconnu',
    action:    'entretien.contract_updated',
    newState:  { visitFrequency: d.visitFrequency, monthlyCost: d.monthlyCost },
  })

  return NextResponse.json(result)
}
