import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { listClients, createClient } from '@/lib/db/clients'
import { z } from 'zod'

const ALLOWED_ROLES = ['admin', 'direction', 'etudes_chef', 'realisation_chef']
const CREATE_ROLES = ['admin', 'direction', 'etudes_chef']

const createSchema = z.object({
  companyName: z.string().min(1, 'Requis'),
  displayName: z.string().min(1, 'Requis'),
  clientType: z.enum(['banque','hotellerie','automobile','institutionnel_public','institutionnel_prive','residentiel_prive','diplomatique','autre']),
  country: z.string().length(2).default('TN'),
  city: z.string().optional(),
  address: z.string().optional(),
  primaryContactName: z.string().optional(),
  primaryContactTitle: z.string().optional(),
  primaryContactEmail: z.string().email().optional().or(z.literal('')),
  primaryContactPhone: z.string().optional(),
  secondaryContactName: z.string().optional(),
  secondaryContactEmail: z.string().email().optional().or(z.literal('')),
  logoCloudinaryId: z.string().uuid().optional(),
  isFeatured: z.boolean().default(false),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const sp = req.nextUrl.searchParams
  try {
    const rows = await listClients({
      type: sp.get('type') ?? undefined,
      country: sp.get('country') ?? undefined,
      isFeatured: sp.get('featured') === 'true' ? true : undefined,
    })
    return NextResponse.json(rows)
  } catch (err) {
    console.error('[GET /api/clients]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!CREATE_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  if (parsed.data.clientType === 'residentiel_prive' && parsed.data.isFeatured) {
    return NextResponse.json({ error: 'Les clients résidentiels privés ne peuvent pas être mis en vedette' }, { status: 400 })
  }

  try {
    const id = await createClient({ ...parsed.data, createdBy: session.user.userId })
    return NextResponse.json({ id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/clients]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
