import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  listRseCommitments,
  createRseCommitment,
  markCommitmentCompleted,
} from '@/lib/db/rse'
import { z } from 'zod'

const createSchema = z.object({
  articleNumber: z.string().optional(),
  commitmentDescription: z.string().min(1, 'Description requise'),
  commitmentType: z.enum(['action_annuelle', 'sensibilisation', 'communication', 'projet_paysager', 'autre'] as const).optional(),
  frequency: z.enum(['unique', 'annuel', 'semestriel', 'trimestriel', 'mensuel'] as const).optional(),
  responsibleParty: z.enum(['sopat', 'partenaire', 'conjoint'] as const).optional(),
  nextDueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
})

const completeSchema = z.object({
  action: z.literal('complete'),
  commitmentId: z.string().uuid(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const rows = await listRseCommitments(id)
  return NextResponse.json(rows)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (role !== 'admin' && role !== 'direction') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id: partnershipId } = await params
  const body = await req.json()

  // Handle "mark as complete" action
  if (body.action === 'complete') {
    const parsed = completeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
    }
    const updated = await markCommitmentCompleted(
      parsed.data.commitmentId,
      session.user.userId,
      session.user.name ?? session.user.email ?? 'Inconnu'
    )
    if (!updated) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 })
    return NextResponse.json(updated)
  }

  // Create new commitment
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const commitment = await createRseCommitment({
    partnershipId,
    ...d,
    nextDueDate: d.nextDueDate ? new Date(d.nextDueDate) : undefined,
    createdBy: session.user.userId,
  })

  return NextResponse.json(commitment, { status: 201 })
}
