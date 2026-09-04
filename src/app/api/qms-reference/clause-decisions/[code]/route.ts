import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { recordClauseDecision } from '@/lib/db/iso-reference'
import { z } from 'zod'

type RouteParams = { params: Promise<{ code: string }> }

/** The quality team owns the audit programme, so it owns this ruling too. */
const QUALITY_ROLES = ['admin', 'direction'] as const

/**
 * Records the quality manager's ruling on a clause no process is audited against.
 *
 * Two dispositions are accepted, and they are the only two that can be settled
 * from a screen:
 *
 *   `transversal` — the requirement is audited at organisation level, outside
 *     the per-process programme. The clause stops counting as an open gap and
 *     starts counting as covered by a stated arrangement.
 *   `excluded` — the requirement is judged not applicable, with the rationale
 *     ISO 9001 § 4.3 expects for any determination of scope.
 *
 * Attaching the clause to a process is deliberately NOT one of them. A process
 * referential is transcribed from the controlled FOR-MI-14 workbook; editing it
 * from a form would put the application and the controlled document into
 * disagreement, which is the failure this module exists to prevent. That route
 * runs through a revision of the workbook and a migration, and the screen says so.
 *
 * A justification is mandatory. A ruling without a reason is not a ruling an
 * auditor can accept.
 */
const bodySchema = z.object({
  disposition:   z.enum(['transversal', 'excluded'] as const),
  justification: z.string().trim().min(20,
    'Une justification d\'au moins 20 caractères est requise : une décision sans motif ' +
    'n\'est pas opposable en audit.'),
})

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!(QUALITY_ROLES as readonly string[]).includes(session.user.role))
    return NextResponse.json({ error: 'Accès réservé à l\'équipe qualité' }, { status: 403 })

  const { code } = await params
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides' }, { status: 400 })

  const result = await recordClauseDecision({
    clauseCode:    code,
    disposition:   parsed.data.disposition,
    justification: parsed.data.justification,
    decidedBy:     session.user.userId,
  })
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 422 })

  return NextResponse.json(result.decision)
}
