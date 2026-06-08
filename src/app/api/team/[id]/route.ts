import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserById, updateUser } from '@/lib/db/team'
import type { UserRole } from '@/lib/auth-utils'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const ROLES = ['admin','direction','etudes_chef','etudes_team','realisation_chef','realisation_team','entretien_chef','entretien_team'] as const

const updateSchema = z.object({
  name:     z.string().min(1).max(255).optional(),
  role:     z.enum(ROLES).optional(),
  phone:    z.string().max(50).nullable().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
})

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

  const { id } = await params
  const user = await getUserById(id)
  if (!user) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  return NextResponse.json(user)
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })

  const user = await updateUser(id, { ...parsed.data, role: parsed.data.role as UserRole | undefined })
  if (!user) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  return NextResponse.json(user)
}
