import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getDocumentReviewById,
  updateDocumentReview,
} from '@/lib/db/document-reviews'
import { getRecordAuditTrail } from '@/lib/audit'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

/** Même périmètre que la page : FOR-MI-01 est un enregistrement de direction. */
const QUALITY_ROLES = ['admin', 'direction'] as const

const lineSchema = z.object({
  id:                    z.string().uuid().optional(),
  documentCode:          z.string().max(30).nullable().optional(),
  documentId:            z.string().uuid().nullable().optional(),
  title:                 z.string().max(255).nullable().optional(),
  changeNeeded:          z.boolean().nullable().optional(),
  changeDescription:     z.string().nullable().optional(),
  riskReviewNeeded:      z.boolean().nullable().optional(),
  riskReviewDescription: z.string().nullable().optional(),
  comments:              z.string().nullable().optional(),
  sortOrder:             z.number().int().min(0).optional(),
})

const updateSchema = z.object({
  reviewDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  processCode:    z.enum(['AC', 'CO', 'ET', 'MI', 'MI1', 'MI2', 'RE1', 'RE2', 'RH']).nullable().optional(),
  scope:          z.string().nullable().optional(),
  documentsCount: z.number().int().min(0).nullable().optional(),
  findings:       z.string().nullable().optional(),
  decisions:      z.string().nullable().optional(),
  nextReviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status:         z.enum(['planned', 'in_progress', 'completed']).optional(),
  lines:          z.array(lineSchema).optional(),
  /**
   * Non requis ici par Zod : c'est le service qui l'exige, parce que
   * l'obligation dépend du statut courant en base et pas de la charge utile.
   */
  changeReason:   z.string().max(2000).optional(),
})

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!(QUALITY_ROLES as readonly string[]).includes(session.user.role))
    return NextResponse.json({ error: 'Accès réservé à la direction' }, { status: 403 })

  const { id } = await params
  const review = await getDocumentReviewById(id)
  if (!review) return NextResponse.json({ error: 'Revue introuvable' }, { status: 404 })

  const trail = await getRecordAuditTrail('document_review', id)
  return NextResponse.json({ ...review, auditTrail: trail })
}

/**
 * Modifie une revue documentaire existante (FOR-MI-01).
 *
 * Le contrôle qui compte n'est pas ici mais dans `updateDocumentReview` : une
 * revue terminée ne peut être modifiée qu'avec un motif, et la modification
 * incrémente alors le numéro de révision. La route se contente de valider la
 * forme et de traduire le refus en 422.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!(QUALITY_ROLES as readonly string[]).includes(session.user.role))
    return NextResponse.json({ error: 'Accès réservé à la direction' }, { status: 403 })

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 },
    )

  const result = await updateDocumentReview(id, parsed.data, {
    userId: session.user.userId,
    name:   session.user.name,
    email:  session.user.email,
    role:   session.user.role,
  })

  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: result.status })

  const updated = await getDocumentReviewById(id)
  return NextResponse.json({
    ...updated,
    revisionNumber: result.revisionNumber,
    revised: result.revised,
  })
}
