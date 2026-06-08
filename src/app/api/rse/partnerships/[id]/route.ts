import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getRsePartnership,
  updateRsePartnership,
  deleteRsePartnership,
  logRseActivity,
} from '@/lib/db/rse'
import { z } from 'zod'

const updateSchema = z.object({
  partnerName: z.string().min(1).optional(),
  partnerType: z.enum(['hotel', 'municipalite', 'entreprise', 'institution', 'autre'] as const).optional(),
  partnerAddress: z.string().optional(),
  partnerContactName: z.string().optional(),
  partnerContactEmail: z.string().email().or(z.literal('')).optional(),
  partnerContactPhone: z.string().optional(),
  sopatReferentId: z.string().uuid().optional(),
  partnerReferentName: z.string().optional(),
  signedDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  autoRenewal: z.boolean().optional(),
  noticePeriodDays: z.number().int().min(0).optional(),
  status: z.enum(['actif', 'expire', 'resilie', 'en_cours_de_negociation'] as const).optional(),
  conventionPdfCloudinaryId: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const partnership = await getRsePartnership(id)
  if (!partnership) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 })

  return NextResponse.json(partnership)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (role !== 'admin' && role !== 'direction') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params
  const existing = await getRsePartnership(id)
  if (!existing) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const updated = await updateRsePartnership(id, {
    ...d,
    partnerContactEmail: d.partnerContactEmail || undefined,
    signedDate: d.signedDate ? new Date(d.signedDate) : undefined,
    startDate: d.startDate ? new Date(d.startDate) : undefined,
    endDate: d.endDate ? new Date(d.endDate) : undefined,
  })

  if (d.status && d.status !== existing.status) {
    await logRseActivity({
      partnershipId: id,
      actorId: session.user.userId,
      actorName: session.user.name ?? session.user.email ?? 'Inconnu',
      action: 'rse.status_changed',
      previousState: { status: existing.status },
      newState: { status: d.status },
    })
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params
  const existing = await getRsePartnership(id)
  if (!existing) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 })

  await deleteRsePartnership(id)
  return NextResponse.json({ ok: true })
}
