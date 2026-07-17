import { NextRequest } from 'next/server'
import { z } from 'zod'
import { compare } from 'bcryptjs'
import { eq, isNull, and } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { signMobileToken, corsJson, corsPreflight } from '@/lib/mobile-auth'
import type { UserRole } from '@/lib/auth-utils'

// Login de l'app mobile : mêmes identifiants que le back-office web (table
// `users`, bcrypt), mais renvoie un JWT Bearer au lieu d'un cookie.
// Accès réservé à l'équipe Réalisation (terrain + chef) et à l'admin.

const ALLOWED_ROLES: UserRole[] = ['admin', 'realisation_chef', 'realisation_team']

const loginSchema = z.object({
  email: z.string().email({ message: 'Email invalide' }),
  password: z.string().min(6, { message: 'Mot de passe trop court' }),
})

export function OPTIONS() {
  return corsPreflight()
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return corsJson(
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

  if (!user || !(await compare(password, user.passwordHash))) {
    return corsJson({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
  }

  if (!ALLOWED_ROLES.includes(user.role as UserRole)) {
    return corsJson(
      { error: 'Accès réservé à l’équipe Réalisation. Contactez votre administrateur SOPAT.' },
      { status: 403 },
    )
  }

  const token = await signMobileToken({
    userId: user.id,
    role: user.role as UserRole,
    email: user.email,
    name: user.name,
  })

  return corsJson({ token, role: user.role, name: user.name, email: user.email })
}
