import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  listRsePartnerships,
  createRsePartnership,
  generateConventionReference,
  type RsePartnerType,
  type RsePartnershipStatus,
} from '@/lib/db/rse'
import { z } from 'zod'

const createSchema = z.object({
  partnerName: z.string().min(1, 'Nom du partenaire requis'),
  partnerType: z.enum(['hotel', 'municipalite', 'entreprise', 'institution', 'autre'] as const),
  partnerAddress: z.string().optional(),
  partnerContactName: z.string().optional(),
  partnerContactEmail: z.string().email('Email invalide').or(z.literal('')).optional(),
  partnerContactPhone: z.string().optional(),
  sopatReferentId: z.string().uuid('Référent SOPAT invalide'),
  partnerReferentName: z.string().optional(),
  signedDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  autoRenewal: z.boolean().optional(),
  noticePeriodDays: z.number().int().min(0).optional(),
  status: z.enum(['actif', 'expire', 'resilie', 'en_cours_de_negociation'] as const).optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const rows = await listRsePartnerships({
    status: (sp.get('status') as RsePartnershipStatus | null) ?? undefined,
    partnerType: (sp.get('partnerType') as RsePartnerType | null) ?? undefined,
  })

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (role !== 'admin' && role !== 'direction') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const conventionReference = await generateConventionReference()

  const partnership = await createRsePartnership({
    ...d,
    partnerContactEmail: d.partnerContactEmail || undefined,
    signedDate: d.signedDate ? new Date(d.signedDate) : undefined,
    startDate: d.startDate ? new Date(d.startDate) : undefined,
    endDate: d.endDate ? new Date(d.endDate) : undefined,
    conventionReference,
    createdBy: session.user.userId,
  })

  return NextResponse.json(partnership, { status: 201 })
}
