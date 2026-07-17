import { SignJWT, jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import type { UserRole } from '@/lib/auth-utils'

// ─────────────────────────────────────────────────────────────────────────────
// Authentification de l'API mobile (/api/mobile/*).
//
// Contrairement au back-office web (cookie iron-session, même origine), l'app
// mobile Flutter tourne :
//   - en production : natif Android / iOS (pas de navigateur, pas de CORS)
//   - en dev        : Flutter Web dans Chrome, sur une AUTRE origine que l'API
//
// Un cookie httpOnly SameSite=Lax ne peut pas être envoyé en cross-origin
// depuis un navigateur sur HTTP. On utilise donc un jeton JWT (Bearer) :
// mêmes identifiants, même table `users`, même bcrypt que le login web — seul
// le transport de session change (en-tête Authorization au lieu d'un cookie).
// ─────────────────────────────────────────────────────────────────────────────

const raw = process.env.JWT_SECRET
if (!raw || raw.length < 32) {
  throw new Error('JWT_SECRET must be set to a strong random value of at least 32 characters')
}
const secret = new TextEncoder().encode(raw)

export type MobileTokenPayload = {
  userId: string
  role: UserRole
  email: string
  name: string | null
}

/** Jeton mobile signé (30 jours). */
export async function signMobileToken(payload: MobileTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret)
}

export async function verifyMobileToken(token: string): Promise<MobileTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    const { userId, role, email, name } = payload as Record<string, unknown>
    if (typeof userId !== 'string' || typeof role !== 'string' || typeof email !== 'string') {
      return null
    }
    return { userId, role: role as UserRole, email, name: (name as string) ?? null }
  } catch {
    return null
  }
}

// ─── CORS (pour Flutter Web en dev) ──────────────────────────────────────────
// Les endpoints mobiles sont protégés par jeton (pas de cookie), donc autoriser
// toutes les origines est sûr : sans jeton valide, aucune donnée n'est exposée.

export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

/** Réponse au préflight OPTIONS. */
export function corsPreflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

/** JSON + en-têtes CORS. */
export function corsJson(body: unknown, init?: { status?: number }): NextResponse {
  return NextResponse.json(body, { status: init?.status ?? 200, headers: corsHeaders() })
}

// ─── Garde d'accès mobile ────────────────────────────────────────────────────

export type MobileAuthResult =
  | { user: MobileTokenPayload }
  | { response: NextResponse }

/**
 * Vérifie le jeton Bearer et le rôle. Renvoie l'utilisateur, ou une réponse
 * 401/403 (avec en-têtes CORS) à retourner telle quelle.
 */
export async function requireMobileAuth(
  req: NextRequest,
  roles: UserRole[],
): Promise<MobileAuthResult> {
  const header = req.headers.get('authorization') ?? ''
  const token = header.toLowerCase().startsWith('bearer ')
    ? header.slice(7).trim()
    : null

  if (!token) {
    return { response: corsJson({ error: 'Non autorisé' }, { status: 401 }) }
  }
  const payload = await verifyMobileToken(token)
  if (!payload) {
    return { response: corsJson({ error: 'Session expirée, reconnectez-vous.' }, { status: 401 }) }
  }
  if (!roles.includes(payload.role)) {
    return { response: corsJson({ error: 'Accès refusé' }, { status: 403 }) }
  }
  return { user: payload }
}
