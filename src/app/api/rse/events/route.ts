import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { listRseEvents, createRseEvent } from '@/lib/db/rse-events'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1),
  eventType: z.enum(['nettoyage_plage', 'plantation', 'sensibilisation', 'team_building', 'journee_environnement', 'autre']),
  date: z.string(),
  location: z.string().min(1),
  partnerId: z.string().uuid().nullable().optional(),
  participantCountPlanned: z.number().int().positive().nullable().optional(),
  sopatCoordinatorId: z.string().uuid(),
  notes: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const events = await listRseEvents({
    type: sp.get('type') ?? undefined,
    status: sp.get('status') ?? undefined,
    year: sp.get('year') ? Number(sp.get('year')) : undefined,
  })

  return NextResponse.json(events)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (role !== 'admin' && role !== 'direction') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const event = await createRseEvent({
    title: d.title,
    eventType: d.eventType,
    date: new Date(d.date),
    location: d.location,
    partnerId: d.partnerId ?? null,
    participantCountPlanned: d.participantCountPlanned ?? null,
    sopatCoordinatorId: d.sopatCoordinatorId,
    notes: d.notes ?? null,
    createdBy: session.user.userId,
  })

  return NextResponse.json(event, { status: 201 })
}
