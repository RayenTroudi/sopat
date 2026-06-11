import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { searchClients } from '@/lib/db/clients'

const ALLOWED_ROLES = ['admin', 'direction', 'etudes_chef', 'realisation_chef']

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const q = req.nextUrl.searchParams.get('q') ?? ''
  try {
    const results = await searchClients(q)
    return NextResponse.json(results)
  } catch (err) {
    console.error('[GET /api/clients/search]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
