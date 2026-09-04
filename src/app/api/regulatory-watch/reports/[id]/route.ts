import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getRegulatoryWatchReportById,
  updateRegulatoryWatchReport,
} from '@/lib/db/regulatory-watch'
import { getRecordAuditTrail } from '@/lib/audit'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

/** Même périmètre que la page : FOR-MI-02 est un enregistrement de direction. */
const QUALITY_ROLES = ['admin', 'direction'] as const

/** Les 13 colonnes du formulaire officiel, dans leur ordre. */
const lineSchema = z.object({
  id:                   z.string().uuid().optional(),
  watchDate:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  watchType:            z.string().max(120).nullable().optional(),
  axis:                 z.string().max(120).nullable().optional(),
  reference:            z.string().max(50).nullable().optional(),
  content:              z.string().nullable().optional(),
  version:              z.string().max(60).nullable().optional(),
  consultationSource:   z.string().nullable().optional(),
  results:              z.string().nullable().optional(),
  applicationLevel:     z.string().nullable().optional(),
  conformityAssessment: z.string().nullable().optional(),
  associatedRisk:       z.string().nullable().optional(),
  processCode:          z.enum(['AC', 'CO', 'ET', 'MI', 'MI1', 'MI2', 'RE1', 'RE2', 'RH']).nullable().optional(),
  comments:             z.string().nullable().optional(),
  sortOrder:            z.number().int().min(0).optional(),
})

const updateSchema = z.object({
  year:   z.number().int().min(2000).max(2100).optional(),
  status: z.enum(['planned', 'in_progress', 'completed']).optional(),
  lines:  z.array(lineSchema).optional(),
  /**
   * Non requis ici par Zod : c'est le service qui l'exige, parce que
   * l'obligation dépend du statut courant en base et pas de la charge utile.
   */
  changeReason: z.string().max(2000).optional(),
})

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!(QUALITY_ROLES as readonly string[]).includes(session.user.role))
    return NextResponse.json({ error: 'Accès réservé à la direction' }, { status: 403 })

  const { id } = await params
  const report = await getRegulatoryWatchReportById(id)
  if (!report) return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 })

  const trail = await getRecordAuditTrail('regulatory_watch_report', id)
  return NextResponse.json({ ...report, auditTrail: trail })
}

/**
 * Modifie un rapport de veille normative et réglementaire (FOR-MI-02).
 *
 * Le contrôle qui compte n'est pas ici mais dans `updateRegulatoryWatchReport` :
 * un rapport terminé ne peut être modifié qu'avec un motif, et la modification
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

  const result = await updateRegulatoryWatchReport(id, parsed.data, {
    userId: session.user.userId,
    name:   session.user.name,
    email:  session.user.email,
    role:   session.user.role,
  })

  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: result.status })

  const updated = await getRegulatoryWatchReportById(id)
  return NextResponse.json({
    ...updated,
    revisionNumber: result.revisionNumber,
    revised: result.revised,
  })
}
