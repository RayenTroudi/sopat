import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getMeetingById, updateMeetingMinute } from '@/lib/db/meetings'
import { getRecordAuditTrail } from '@/lib/audit'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

/** Même périmètre que la page : le PV FOR-MI-04 est un enregistrement de direction. */
const QUALITY_ROLES = ['admin', 'direction'] as const

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/** Bloc « Participant(s): Nom, prénom et poste » du formulaire. */
const participantSchema = z.object({
  id:        z.string().uuid().optional(),
  fullName:  z.string().min(1).max(255),
  position:  z.string().max(255).nullable().optional(),
  userId:    z.string().uuid().nullable().optional(),
  present:   z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

/** Grille « N° | Ordre de jour prévu | Points traités ». */
const agendaSchema = z.object({
  id:              z.string().uuid().optional(),
  plannedItem:     z.string().nullable().optional(),
  discussedPoints: z.string().nullable().optional(),
  sortOrder:       z.number().int().min(0).optional(),
})

/**
 * Grille « N° | Action | Responsable(s) | Délai Prévu | Délai Réalisé | Suivi |
 * Commentaire(s) ».
 */
const actionSchema = z.object({
  id:          z.string().uuid().optional(),
  description: z.string().min(1),
  responsible: z.string().nullable().optional(),
  targetDate:  isoDate.nullable().optional(),
  actualDate:  isoDate.nullable().optional(),
  followUp:    z.string().nullable().optional(),
  comments:    z.string().nullable().optional(),
  sortOrder:   z.number().int().min(0).optional(),
})

const updateSchema = z.object({
  meetingDate:     isoDate.optional(),
  meetingType:     z.string().max(100).nullable().optional(),
  location:        z.string().max(255).nullable().optional(),
  projectId:       z.string().uuid().nullable().optional(),
  status:          z.enum(['planned', 'in_progress', 'completed']).optional(),
  recommendations: z.string().nullable().optional(),
  nextMeetingDate: isoDate.nullable().optional(),
  nextMeetingTime: z.string().max(10).nullable().optional(),
  participants:    z.array(participantSchema).optional(),
  agenda:          z.array(agendaSchema).optional(),
  actions:         z.array(actionSchema).optional(),
  /**
   * Non requis ici par Zod : c'est le service qui l'exige, parce que
   * l'obligation dépend du statut courant en base et pas de la charge utile.
   */
  changeReason:    z.string().max(2000).optional(),
})

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!(QUALITY_ROLES as readonly string[]).includes(session.user.role))
    return NextResponse.json({ error: 'Accès réservé à la direction' }, { status: 403 })

  const { id } = await params
  const data = await getMeetingById(id)
  if (!data) return NextResponse.json({ error: 'PV introuvable' }, { status: 404 })

  const trail = await getRecordAuditTrail('meeting_minute', id)
  return NextResponse.json({ ...data, auditTrail: trail })
}

/**
 * Modifie un PV de réunion (FOR-MI-04) : en-tête, participants, ordre du jour
 * et plan d'action dans un seul appel, donc une seule transaction.
 *
 * Le contrôle qui compte n'est pas ici mais dans `updateMeetingMinute` : un PV
 * validé ne peut être modifié qu'avec un motif, et la modification incrémente
 * alors le numéro de révision. La route se contente de valider la forme et de
 * traduire le refus en 422.
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

  const result = await updateMeetingMinute(id, parsed.data, {
    userId: session.user.userId,
    name:   session.user.name,
    email:  session.user.email,
    role:   session.user.role,
  })

  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: result.status })

  const updated = await getMeetingById(id)
  return NextResponse.json({
    ...updated,
    revisionNumber: result.revisionNumber,
    revised: result.revised,
  })
}
