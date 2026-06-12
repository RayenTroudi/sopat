import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getEventLogistics, upsertEventLogistics } from '@/lib/db/rse-events'
import { z } from 'zod'

const logisticsSchema = z.object({
  items: z.array(z.object({
    category: z.enum(['materiel_environnement', 'materiel_evenementiel', 'confort']),
    itemName: z.string().min(1),
    quantityPlanned: z.number().int().nullable().optional(),
    quantityActual: z.number().int().nullable().optional(),
    unit: z.string().nullable().optional(),
    supplier: z.string().nullable().optional(),
    cost: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const items = await getEventLogistics(id)
  return NextResponse.json(items)
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

  const { id } = await params
  const body = await req.json()
  const parsed = logisticsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const items = await upsertEventLogistics(id, parsed.data.items, session.user.userId)
  return NextResponse.json(items)
}
