import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getClientById, updateClient, softDeleteClient } from '@/lib/db/clients'
import { z } from 'zod'

const ALLOWED_ROLES = ['admin', 'direction', 'etudes_chef', 'realisation_chef']
const EDIT_ROLES = ['admin', 'direction', 'etudes_chef']
const DELETE_ROLES = ['admin', 'direction']

const updateSchema = z.object({
  companyName: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
  clientType: z.enum(['banque','hotellerie','automobile','institutionnel_public','institutionnel_prive','residentiel_prive','diplomatique','autre']).optional(),
  country: z.string().length(2).optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  primaryContactName: z.string().optional(),
  primaryContactTitle: z.string().optional(),
  primaryContactEmail: z.string().email().optional().or(z.literal('')),
  primaryContactPhone: z.string().optional(),
  secondaryContactName: z.string().optional(),
  secondaryContactEmail: z.string().email().optional().or(z.literal('')),
  logoCloudinaryId: z.string().uuid().optional(),
  isFeatured: z.boolean().optional(),
  notes: z.string().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  try {
    const client = await getClientById(id)
    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
    return NextResponse.json(client)
  } catch (err) {
    console.error('[GET /api/clients/[id]]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!EDIT_ROLES.includes(session.user.role)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  const client = await getClientById(id)
  if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })

  const data = parsed.data
  if (data.isFeatured && (data.clientType ?? client.clientType) === 'residentiel_prive') {
    return NextResponse.json({ error: 'Les clients résidentiels privés ne peuvent pas être mis en vedette' }, { status: 400 })
  }

  try {
    await updateClient(id, data)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/clients/[id]]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!DELETE_ROLES.includes(session.user.role)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  try {
    const ok = await softDeleteClient(id)
    if (!ok) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/clients/[id]]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
