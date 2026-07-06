import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/db/projects'
import { getProjectTeamMembers, upsertProjectTeamMembers } from '@/lib/db/realisation'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const memberSchema = z.object({
  poste:              z.string().min(1).max(255),
  titulaire:          z.string().max(255).optional(),
  suppleant:          z.string().max(255).optional(),
  isSubcontractor:    z.boolean().optional(),
  subcontractorName:  z.string().max(255).optional(),
  userId:             z.string().uuid().optional(),
  phaseStartDate:     z.string().optional(),
  phaseEndDate:       z.string().optional(),
  sortOrder:          z.number().int().optional(),
})

const saveSchema = z.object({
  members: z.array(memberSchema),
})

const ALLOWED_ROLES = ['admin', 'direction', 'realisation_chef', 'realisation_team', 'etudes_chef']

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const members = await getProjectTeamMembers(id)
  return NextResponse.json(members)
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const members = await upsertProjectTeamMembers(id, parsed.data.members, session.user.userId)
  return NextResponse.json(members)
}
