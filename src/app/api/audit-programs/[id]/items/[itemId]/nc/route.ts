import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createNcFromAuditFinding, getAuditProgramById } from '@/lib/db/iso'
import { ncFromFindingSchema } from '@/lib/validation/project-docs'

type RouteParams = { params: Promise<{ id: string; itemId: string }> }

const QUALITY_ROLES = ['admin', 'direction'] as const

/** Raises a non-conformity from an audit finding (FOR-MI-14 → FOR-MI-05). */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!(QUALITY_ROLES as readonly string[]).includes(session.user.role))
    return NextResponse.json({ error: 'Accès réservé à l\'équipe qualité' }, { status: 403 })

  const { id, itemId } = await params

  const program = await getAuditProgramById(id)
  if (!program) return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 })
  if (!program.items.some((i) => i.id === itemId))
    return NextResponse.json({ error: 'Constat introuvable' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const parsed = ncFromFindingSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })

  const result = await createNcFromAuditFinding({
    itemId,
    description: parsed.data.description,
    ncType:      parsed.data.ncType,
    assignedTo:  parsed.data.assignedTo,
    detectedBy:  session.user.userId,
    createdBy:   session.user.userId,
    actor:       session.user,
  })

  if (!result.ok) {
    // A finding that already raised an NC is a conflict, not a validation error.
    const status = result.existingNcId ? 409 : result.reason === 'Constat introuvable' ? 404 : 422
    return NextResponse.json({ error: result.reason, ncId: result.existingNcId }, { status })
  }

  return NextResponse.json(result, { status: 201 })
}
