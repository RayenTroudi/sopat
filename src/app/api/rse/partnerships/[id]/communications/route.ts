import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  listRseCommunications,
  createRseCommunication,
  updateCommunicationValidation,
} from '@/lib/db/rse'
import { triggerRseCommunicationSubmittedEmail } from '@/lib/email-triggers'
import { z } from 'zod'

const createSchema = z.object({
  communicationType: z.enum(['logo_sopat', 'logo_partenaire', 'publication_commune'] as const),
  description: z.string().min(1, 'Description requise'),
  requiredByDate: z.string().datetime().optional(),
  notes: z.string().optional(),
})

const validateSchema = z.object({
  action: z.enum(['approve', 'refuse'] as const),
  communicationId: z.string().uuid(),
  assetCloudinaryId: z.string().uuid().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const rows = await listRseCommunications(id)
  return NextResponse.json(rows)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id: partnershipId } = await params
  const body = await req.json()

  // Handle validation action (admin/direction only)
  if (body.action === 'approve' || body.action === 'refuse') {
    const role = session.user.role
    if (role !== 'admin' && role !== 'direction') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const parsed = validateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
    }

    const updated = await updateCommunicationValidation(
      parsed.data.communicationId,
      parsed.data.action === 'approve' ? 'approuve' : 'refuse',
      session.user.name ?? session.user.email ?? 'Inconnu',
      parsed.data.assetCloudinaryId,
    )
    return NextResponse.json(updated)
  }

  // Submit new communication request
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const communication = await createRseCommunication({
    partnershipId,
    ...d,
    requiredByDate: d.requiredByDate ? new Date(d.requiredByDate) : undefined,
    submittedBy: session.user.userId,
    createdBy: session.user.userId,
  })

  void triggerRseCommunicationSubmittedEmail({
    partnershipId,
    communicationId: communication.id,
    communicationType: d.communicationType,
    description: d.description,
    requiredByDate: d.requiredByDate ? new Date(d.requiredByDate) : null,
    submittedByName: session.user.name ?? session.user.email ?? 'Inconnu',
    submittedById: session.user.userId,
  })

  return NextResponse.json(communication, { status: 201 })
}
