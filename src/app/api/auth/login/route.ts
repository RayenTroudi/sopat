import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { compare } from 'bcryptjs'
import { eq, isNull, and } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { getSession } from '@/lib/session'

const loginSchema = z.object({
  email: z.string().email({ message: 'Email invalide' }),
  password: z.string().min(6, { message: 'Mot de passe trop court' }),
})

const ROLE_REDIRECTS: Record<string, string> = {
  admin: '/admin/dashboard',
  direction: '/admin/dashboard',
  etudes_chef: '/admin/projects',
  etudes_team: '/admin/projects',
  realisation_chef: '/admin/projects',
  realisation_team: '/admin/projects',
  entretien_chef: '/admin/projects',
  entretien_team: '/admin/projects',
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides' },
      { status: 400 },
    )
  }

  const { email, password } = parsed.data

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.isActive, true), isNull(users.deletedAt)))
    .limit(1)

  if (!user) {
    return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
  }

  const valid = await compare(password, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
  }

  const session = await getSession()
  session.isLoggedIn = true
  session.userId = user.id
  session.email = user.email
  session.name = user.name
  session.role = user.role
  await session.save()

  const redirectTo = ROLE_REDIRECTS[user.role] ?? '/admin/dashboard'

  const response = NextResponse.json({ success: true, role: user.role, redirectTo })

  // Lightweight presence cookie: Edge middleware reads this to decide redirects.
  // Cannot decode iron-session in Edge runtime, so we use a separate plain cookie.
  response.cookies.set('sopat_auth', '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  return response
}
