import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'
import { transitionPhase } from '@/lib/db/projects'
import type { Phase } from '@/lib/db/projects'
import { z } from 'zod'

const schema = z.object({
  currentPhase: z.enum(['etudes', 'realisation', 'entretien']),
  notes: z.string().optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const result = await transitionPhase(id, parsed.data.currentPhase as Phase, {
    actorId: session.user.userId,
    actorName: session.user.name ?? session.user.email ?? 'Inconnu',
    notes: parsed.data.notes,
  })

  if (!result.ok) {
    const statusCode =
      result.error === 'PROJECT_NOT_FOUND' ? 404
      : result.error === 'ALREADY_COMPLETED' ? 409
      : 422
    return NextResponse.json({ error: result.message }, { status: statusCode })
  }

  return NextResponse.json({ ok: true, newStatus: result.newStatus })
}
