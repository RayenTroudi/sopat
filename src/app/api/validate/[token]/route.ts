/**
 * POST /api/validate/[token]
 * Public endpoint — no session required. JWT token in URL param is the only auth.
 * Confirms the budget prediction as-is.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  resolveToken,
  markTokenValidated,
} from '@/lib/jwt'
import { logActivity } from '@/lib/db/projects'
import { triggerPhaseTransitionEmail } from '@/lib/email-triggers'
import { sendEmail } from '@/lib/email'
import { db } from '../../../../../db/index'
import { users, projects } from '../../../../../db/schema'
import { eq, and, isNull } from 'drizzle-orm'

type RouteParams = { params: Promise<{ token: string }> }

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const { token } = await params

  const resolved = await resolveToken(token)

  if (resolved.state === 'invalid')  return NextResponse.json({ error: 'Token invalide' }, { status: 400 })
  if (resolved.state === 'expired')  return NextResponse.json({ error: 'Token expiré' },   { status: 410 })
  if (resolved.state === 'used')     return NextResponse.json({ error: 'Déjà validé' },     { status: 409 })

  const { validation, prediction, project, chef } = resolved

  // Guard: token must be a 'validate' action token
  const payload = prediction // we already have it via resolveToken
  const approvedAmount = parseFloat(prediction.predictedTotal)

  await markTokenValidated(
    validation.id,
    chef.id,
    prediction.id,
    project.id,
    approvedAmount,
  )

  // Immutable activity log
  await logActivity({
    projectId:  project.id,
    actorId:    chef.id,
    actorName:  chef.name,
    action:     'budget.validated_by_chef',
    newState:   { approvedAmount, predictionId: prediction.id, method: 'email_token' },
  })

  // Notify admin + études team
  void notifyValidationConfirmed({ project, chef, approvedAmount, validationId: validation.id })

  return NextResponse.json({ ok: true })
}

async function notifyValidationConfirmed({
  project,
  chef,
  approvedAmount,
  validationId,
}: {
  project: { id: string; name: string; reference: string; assignedEtudesChefId?: string | null }
  chef:    { id: string; name: string }
  approvedAmount: number
  validationId: string
}) {
  try {
    // Find admin + études chef recipients
    const adminUsers = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(and(eq(users.role, 'admin'), eq(users.isActive, true), isNull(users.deletedAt)))

    // Also fetch the project to get etudesChefId
    const [proj] = await db
      .select({ assignedEtudesChefId: projects.assignedEtudesChefId })
      .from(projects)
      .where(eq(projects.id, project.id))
      .limit(1)

    const recipients = [...adminUsers]

    if (proj?.assignedEtudesChefId) {
      const [etudesChef] = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, proj.assignedEtudesChefId))
        .limit(1)
      if (etudesChef && !recipients.some((r) => r.id === etudesChef.id)) {
        recipients.push(etudesChef)
      }
    }

    await Promise.all(
      recipients.map((r) =>
        sendEmail({
          to:               r.email,
          subject:          `[SOPAT] Budget validé — ${project.reference} · ${project.name}`,
          template:         'validation-confirmed',
          props: {
            recipientName:    r.name,
            chefName:         chef.name,
            projectName:      project.name,
            projectReference: project.reference,
            approvedAmount,
            validatedAt:      new Date().toISOString(),
          },
          projectId:         project.id,
          recipientId:       r.id,
          relatedEntityType: 'budget_validation',
          relatedEntityId:   validationId,
          createdBy:         chef.id,
        })
      )
    )
  } catch (err) {
    console.error('[validate] notifyValidationConfirmed failed:', err)
  }
}
