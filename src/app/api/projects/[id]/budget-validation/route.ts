import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess, logActivity } from '@/lib/db/projects'
import { saveBudgetValidation, getLatestBudgetValidation } from '@/lib/db/predictions'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

// GET — fetch current validation state (used by EtudesTab on mount)
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const validation = await getLatestBudgetValidation(id)
  return NextResponse.json(validation)
}

const acceptSchema = z.object({
  action:              z.literal('accept'),
  predictionId:        z.string().uuid(),
  approvedAmount:      z.number().positive(),
})

const modifySchema = z.object({
  action:              z.literal('modify'),
  predictionId:        z.string().uuid(),
  approvedAmount:      z.number().positive(),
  modificationReason:  z.string().min(1, 'La raison de modification est requise'),
  modifiedValues: z.object({
    plants:          z.number().min(0),
    soil_substrates: z.number().min(0),
    labor:           z.number().min(0),
    equipment:       z.number().min(0),
    logistics:       z.number().min(0),
  }),
})

const bodySchema = z.discriminatedUnion('action', [acceptSchema, modifySchema])

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data

  try {
    const validation = await saveBudgetValidation({
      projectId:          id,
      predictionId:       data.predictionId,
      chefUserId:         session.user.userId,
      status:             data.action === 'accept' ? 'validated' : 'modified',
      approvedAmount:     data.approvedAmount,
      modificationReason: data.action === 'modify' ? data.modificationReason : undefined,
      modifiedValues:     data.action === 'modify' ? data.modifiedValues : undefined,
      createdBy:          session.user.userId,
    })

    await logActivity({
      projectId:  id,
      actorId:    session.user.userId,
      actorName:  session.user.name ?? session.user.email ?? 'Inconnu',
      action:     data.action === 'accept' ? 'budget.accepted' : 'budget.modified',
      newState: {
        approvedBudget:     data.approvedAmount,
        validationStatus:   data.action === 'accept' ? 'validated' : 'modified',
        modificationReason: data.action === 'modify' ? data.modificationReason : undefined,
      },
    })

    return NextResponse.json(validation, { status: 201 })
  } catch (err) {
    console.error('[POST budget-validation]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
