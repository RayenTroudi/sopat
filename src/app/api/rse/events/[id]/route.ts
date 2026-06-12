import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRseEvent, updateRseEvent } from '@/lib/db/rse-events'
import { z } from 'zod'

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  eventType: z.enum(['nettoyage_plage', 'plantation', 'sensibilisation', 'team_building', 'journee_environnement', 'autre']).optional(),
  date: z.string().optional(),
  location: z.string().min(1).optional(),
  partnerId: z.string().uuid().nullable().optional(),
  status: z.enum(['planifie', 'en_cours', 'termine', 'annule']).optional(),
  participantCountPlanned: z.number().int().positive().nullable().optional(),
  participantCountActual: z.number().int().positive().nullable().optional(),
  sopatCoordinatorId: z.string().uuid().optional(),
  notes: z.string().nullable().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const event = await getRseEvent(id)
  if (!event) return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 })

  return NextResponse.json(event)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (role !== 'admin' && role !== 'direction') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const updated = await updateRseEvent(id, {
    ...d,
    date: d.date ? new Date(d.date) : undefined,
  })

  if (!updated) return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 })

  return NextResponse.json(updated)
}
