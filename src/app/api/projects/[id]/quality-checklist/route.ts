import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/db/projects'
import { getChecklist, upsertChecklist } from '@/lib/db/realisation-docs'

type RouteParams = { params: Promise<{ id: string }> }
const ALLOWED = ['admin', 'direction', 'realisation_chef', 'realisation_team', 'etudes_chef']

const VALID_TYPES = [
  'travaux_preliminaires',
  'reseaux_maconnerie',
  'plantations',
  'engazonnement',
  'matiere_decorative',
  'fourniture_plantes',
]

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  const type = req.nextUrl.searchParams.get('type') ?? ''
  if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
  return NextResponse.json(await getChecklist(id, type))
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  if (!ALLOWED.includes(session.user.role)) return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
  const body = await req.json() as { type: string } & Parameters<typeof upsertChecklist>[2]
  const { type, ...data } = body
  if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
  const row = await upsertChecklist(id, type, data, session.user.userId)
  return NextResponse.json(row)
}
