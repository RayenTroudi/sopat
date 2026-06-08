import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { sendEmail, type EmailTemplate } from '@/lib/email'
import { z } from 'zod'

const schema = z.object({
  to:                  z.union([z.string().email(), z.array(z.string().email())]),
  subject:             z.string().min(1).max(255),
  template:            z.enum([
    'prediction-email',
    'validation-confirmed',
    'validation-modified',
    'phase-transition',
    'budget-alert',
    'nc-assigned',
    'maintenance-reminder',
    'reminder-48h',
  ] as const),
  props:               z.record(z.string(), z.unknown()),
  projectId:           z.string().uuid().optional(),
  recipientId:         z.string().uuid().optional(),
  relatedEntityType:   z.string().optional(),
  relatedEntityId:     z.string().uuid().optional(),
  metadata:            z.record(z.string(), z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Manual sends are admin-only
  const { role } = session.user
  if (role !== 'admin' && role !== 'direction') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data

  try {
    const emailQueueId = await sendEmail({
      to:                  d.to,
      subject:             d.subject,
      template:            d.template as EmailTemplate,
      props:               d.props,
      projectId:           d.projectId,
      recipientId:         d.recipientId,
      relatedEntityType:   d.relatedEntityType,
      relatedEntityId:     d.relatedEntityId,
      metadata:            d.metadata as Record<string, unknown> | undefined,
      createdBy:           session.user.userId,
    })

    return NextResponse.json({ ok: true, emailQueueId })
  } catch (err) {
    return NextResponse.json({ error: `Échec de l'envoi : ${String(err)}` }, { status: 500 })
  }
}
