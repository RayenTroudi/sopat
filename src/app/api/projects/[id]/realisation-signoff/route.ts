import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess, transitionPhase } from '@/lib/db/projects'
import { checkRealisationSignoffPrerequisites } from '@/lib/db/realisation'
import { triggerPhaseTransitionEmail } from '@/lib/email-triggers'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const schema = z.object({ notes: z.string().optional() })

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const checks = await checkRealisationSignoffPrerequisites(id)
  return NextResponse.json(checks)
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const { role } = session.user
  const canSignOff =
    role === 'admin' || role === 'direction' || role === 'realisation_chef'
  if (!canSignOff) {
    return NextResponse.json({ error: 'Seuls les chefs de réalisation peuvent valider' }, { status: 403 })
  }

  const checks = await checkRealisationSignoffPrerequisites(id)
  if (!checks.allPassed) {
    const missing = buildMissingMessages(checks)
    return NextResponse.json({ error: 'Prérequis manquants', checks, missing }, { status: 422 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)

  const result = await transitionPhase(id, 'realisation', {
    actorId:   session.user.userId,
    actorName: session.user.name ?? session.user.email ?? 'Inconnu',
    notes:     parsed.success ? parsed.data.notes : undefined,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 422 })
  }

  void triggerPhaseTransitionEmail({
    projectId:       id,
    fromPhase:       'realisation',
    toPhase:         'entretien',
    signedOffBy:     session.user.userId,
    signedOffByName: session.user.name ?? session.user.email ?? 'Inconnu',
    notes:           parsed.success ? parsed.data.notes : undefined,
  })

  return NextResponse.json({ ok: true, newStatus: result.newStatus })
}

function buildMissingMessages(checks: {
  hasAll5Photos: boolean
  hasClientReception: boolean
  hasBudgetReconciliation: boolean
  hasNoOpenNCs: boolean
  details: { missingMilestones: string[] }
}): string[] {
  const msgs: string[] = []
  if (!checks.hasAll5Photos) {
    msgs.push(`Photos manquantes : ${checks.details.missingMilestones.join(', ')}`)
  }
  if (!checks.hasClientReception) msgs.push('Document de réception client non téléchargé')
  if (!checks.hasBudgetReconciliation) msgs.push('Rapprochement budgétaire non soumis')
  if (!checks.hasNoOpenNCs) msgs.push('Des non-conformités ouvertes existent sur ce projet')
  return msgs
}
