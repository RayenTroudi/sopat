import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getClientById, getClientInteractions, createInteraction } from '@/lib/db/clients'
import { z } from 'zod'

const ALLOWED_ROLES = ['admin', 'direction', 'etudes_chef', 'realisation_chef']

const createSchema = z.object({
  interactionType: z.enum(['appel', 'email', 'reunion', 'visite_site', 'autre']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD requis'),
  summary: z.string().min(1, 'Résumé requis'),
  outcome: z.string().optional(),
  nextAction: z.string().optional(),
  nextActionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  const client = await getClientById(id)
  if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  try {
    const interactions = await getClientInteractions(id)
    return NextResponse.json(interactions)
  } catch (err) {
    console.error('[GET /api/clients/[id]/interactions]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  const client = await getClientById(id)
  if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })

  try {
    const interactionId = await createInteraction({ ...parsed.data, clientId: id, loggedBy: session.user.userId })
    return NextResponse.json({ id: interactionId }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/clients/[id]/interactions]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
