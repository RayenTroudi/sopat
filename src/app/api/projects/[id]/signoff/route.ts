import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'
import { checkEtudesSignoffPrerequisites } from '@/lib/db/etudes'
import { transitionPhase, assertProjectAccess } from '@/lib/db/projects'
import { triggerPredictionEmail, triggerPhaseTransitionEmail } from '@/lib/email-triggers'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const schema = z.object({
  phase: z.enum(['etudes', 'realisation', 'entretien']),
  notes: z.string().optional(),
})

// GET — check sign-off prerequisites without triggering transition
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const checks = await checkEtudesSignoffPrerequisites(id)
  return NextResponse.json(checks)
}

// POST — validate prerequisites then trigger phase transition
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params

  // Authorization: only chefs assigned to this project, or admin/direction, may trigger sign-off
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  // Additionally: only chefs (not team members) and admins may sign off a phase
  const { role } = session.user
  const canSignOff = role === 'admin' || role === 'direction' ||
    role === 'etudes_chef' || role === 'realisation_chef' || role === 'entretien_chef'
  if (!canSignOff) {
    return NextResponse.json({ error: 'Seuls les chefs de phase peuvent valider' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  // Only études phase has the prerequisite checklist for now
  if (parsed.data.phase === 'etudes') {
    const checks = await checkEtudesSignoffPrerequisites(id)
    if (!checks.allPassed) {
      return NextResponse.json(
        { error: 'Prérequis manquants', checks, missing: buildMissingMessages(checks) },
        { status: 422 }
      )
    }
  }

  const result = await transitionPhase(id, parsed.data.phase, {
    actorId: session.user.userId,
    actorName: session.user.name ?? session.user.email ?? 'Inconnu',
    notes: parsed.data.notes,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 422 })
  }

  const actorName = session.user.name ?? session.user.email ?? 'Inconnu'

  // Fire emails asynchronously (non-blocking)
  if (parsed.data.phase === 'etudes') {
    // Prediction email to réalisation chef + phase transition notification
    void triggerPredictionEmail(id, session.user.userId)
    void triggerPhaseTransitionEmail({
      projectId:      id,
      fromPhase:      'etudes',
      toPhase:        'realisation',
      signedOffBy:    session.user.userId,
      signedOffByName: actorName,
      notes:          parsed.data.notes,
    })
  } else if (parsed.data.phase === 'realisation') {
    void triggerPhaseTransitionEmail({
      projectId:      id,
      fromPhase:      'realisation',
      toPhase:        'entretien',
      signedOffBy:    session.user.userId,
      signedOffByName: actorName,
      notes:          parsed.data.notes,
    })
  }

  return NextResponse.json({ ok: true, newStatus: result.newStatus })
}

function buildMissingMessages(checks: {
  hasPlantList: boolean
  hasBudgetApproved: boolean
  hasRender3d: boolean
  hasClientValidation: boolean
}): string[] {
  const missing: string[] = []
  if (!checks.hasPlantList) missing.push('La liste végétale doit contenir au moins un article')
  if (!checks.hasBudgetApproved) missing.push('Un budget approuvé doit être saisi')
  if (!checks.hasRender3d) missing.push('Au moins un rendu 3D doit être téléchargé')
  if (!checks.hasClientValidation) missing.push('Le document de validation client doit être téléchargé')
  return missing
}
