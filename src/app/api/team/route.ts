import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { listUsers, createUser } from '@/lib/db/team'
import type { UserRole } from '@/lib/auth-utils'
import { z } from 'zod'

const ROLES = ['admin','direction','etudes_chef','etudes_team','realisation_chef','realisation_team','entretien_chef','entretien_team'] as const

const createSchema = z.object({
  name:     z.string().min(1).max(255),
  email:    z.string().email(),
  password: z.string().min(8),
  role:     z.enum(ROLES),
  phone:    z.string().max(50).optional(),
})

function requireAdmin(role: string) {
  return role === 'admin'
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!requireAdmin(session.user.role)) return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const rows = await listUsers({
    search: sp.get('search') ?? undefined,
    role:   sp.get('role')   ?? undefined,
  })
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!requireAdmin(session.user.role)) return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })

  try {
    const user = await createUser({ ...parsed.data, role: parsed.data.role as UserRole, createdBy: session.user.userId })
    return NextResponse.json(user, { status: 201 })
  } catch (err: unknown) {
    const msg = String(err)
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json({ error: 'Un utilisateur avec cet email existe déjà.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
