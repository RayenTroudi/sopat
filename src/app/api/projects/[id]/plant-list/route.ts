import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPlantList, savePlantList } from '@/lib/db/etudes'
import { assertProjectAccess } from '@/lib/db/projects'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  try {
    const items = await getPlantList(id)
    return NextResponse.json(items)
  } catch (err) {
    console.error('[GET plant-list]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

const itemSchema = z.object({
  botanicalName: z.string().min(1),
  commonName: z.string().optional(),
  category: z.enum(['tree', 'shrub', 'ground_cover', 'climber', 'palm', 'grass', 'aquatic', 'other']),
  quantity: z.string().min(1),
  unit: z.enum(['unit', 'm2', 'm3', 'kg', 'liter', 'ml']),
  unitPriceEstimate: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  notes: z.string().optional(),
  plantSpeciesId: z.string().uuid().optional(),
})

const bodySchema = z.object({
  items: z.array(itemSchema),
})

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const saved = await savePlantList(id, parsed.data.items, session.user.userId)
    return NextResponse.json(saved)
  } catch (err) {
    console.error('[POST plant-list]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
