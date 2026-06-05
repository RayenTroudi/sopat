/**
 * POST /api/edit/[token]
 * Public endpoint — no session required. JWT token in URL param is the only auth.
 * Saves chef's modified budget values.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  resolveToken,
  markTokenModified,
} from '@/lib/jwt'
import { logActivity } from '@/lib/db/projects'
import { sendEmail } from '@/lib/email'
import { db } from '../../../../../db/index'
import { users } from '../../../../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'

type RouteParams = { params: Promise<{ token: string }> }

const schema = z.object({
  plants:             z.number().min(0),
  soil:               z.number().min(0),
  labor:              z.number().min(0),
  equipment:          z.number().min(0),
  logistics:          z.number().min(0),
  modificationReason: z.string().min(20, 'La raison doit comporter au moins 20 caractères'),
})

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { token } = await params

  const resolved = await resolveToken(token)

  if (resolved.state === 'invalid')  return NextResponse.json({ error: 'Token invalide' }, { status: 400 })
  if (resolved.state === 'expired')  return NextResponse.json({ error: 'Token expiré' },   { status: 410 })
  if (resolved.state === 'used')     return NextResponse.json({ error: 'Déjà traité' },     { status: 409 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const { validation, prediction, project, chef } = resolved
  const d = parsed.data

  const modifiedValues = {
    plants:    d.plants,
    soil:      d.soil,
    labor:     d.labor,
    equipment: d.equipment,
    logistics: d.logistics,
  }
  const approvedAmount = Object.values(modifiedValues).reduce((s, v) => s + v, 0)

  await markTokenModified(
    validation.id,
    prediction.id,
    project.id,
    approvedAmount,
    d.modificationReason,
    modifiedValues,
  )

  await logActivity({
    projectId:  project.id,
    actorId:    chef.id,
    actorName:  chef.name,
    action:     'budget.modified_by_chef',
    previousState: {
      plants:    parseFloat(prediction.breakdownPlants    ?? '0'),
      soil:      parseFloat(prediction.breakdownSoil      ?? '0'),
      labor:     parseFloat(prediction.breakdownLabor     ?? '0'),
      equipment: parseFloat(prediction.breakdownEquipment ?? '0'),
      logistics: parseFloat(prediction.breakdownLogistics ?? '0'),
      total:     parseFloat(prediction.predictedTotal),
    },
    newState: { ...modifiedValues, total: approvedAmount, modificationReason: d.modificationReason, method: 'email_token' },
  })

  void notifyModification({ project, chef, prediction, modifiedValues, approvedAmount, reason: d.modificationReason, validationId: validation.id })

  return NextResponse.json({ ok: true })
}

async function notifyModification({
  project,
  chef,
  prediction,
  modifiedValues,
  approvedAmount,
  reason,
  validationId,
}: {
  project: { id: string; name: string; reference: string }
  chef:    { id: string; name: string }
  prediction: { predictedTotal: string; breakdownPlants: string | null; breakdownSoil: string | null; breakdownLabor: string | null; breakdownEquipment: string | null; breakdownLogistics: string | null }
  modifiedValues: Record<string, number>
  approvedAmount: number
  reason: string
  validationId: string
}) {
  try {
    const adminUsers = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(and(eq(users.role, 'admin'), eq(users.isActive, true), isNull(users.deletedAt)))

    const original = {
      plants:    parseFloat(prediction.breakdownPlants    ?? '0'),
      soil:      parseFloat(prediction.breakdownSoil      ?? '0'),
      labor:     parseFloat(prediction.breakdownLabor     ?? '0'),
      equipment: parseFloat(prediction.breakdownEquipment ?? '0'),
      logistics: parseFloat(prediction.breakdownLogistics ?? '0'),
      total:     parseFloat(prediction.predictedTotal),
    }

    await Promise.all(
      adminUsers.map((admin) =>
        sendEmail({
          to:               admin.email,
          subject:          `[SOPAT] Budget modifié par chef — ${project.reference}`,
          template:         'validation-modified',
          props: {
            recipientName:      admin.name,
            chefName:           chef.name,
            projectName:        project.name,
            projectReference:   project.reference,
            modificationReason: reason,
            modifiedAt:         new Date().toISOString(),
            original,
            modified:           { ...modifiedValues, total: approvedAmount },
          },
          projectId:         project.id,
          recipientId:       admin.id,
          relatedEntityType: 'budget_validation',
          relatedEntityId:   validationId,
          createdBy:         chef.id,
        })
      )
    )
  } catch (err) {
    console.error('[edit] notifyModification failed:', err)
  }
}
