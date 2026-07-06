import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/db/projects'
import { getLineItems, upsertLineItems } from '@/lib/db/realisation-docs'

type RouteParams = { params: Promise<{ id: string }> }
const ALLOWED = ['admin', 'direction', 'realisation_chef', 'etudes_chef']

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  return NextResponse.json(await getLineItems(id, 'decompte'))
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  if (!ALLOWED.includes(session.user.role)) return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
  const { items } = await req.json() as { items: Parameters<typeof upsertLineItems>[2] }
  return NextResponse.json(await upsertLineItems(id, 'decompte', items, session.user.userId))
}
