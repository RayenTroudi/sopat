import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAuditProgrammeForExport } from '@/lib/db/iso'
import { buildAuditProgrammeWorkbook } from '@/lib/export/audit-programme-workbook'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * Same roles that may read a programme through this module. Export reveals no
 * more than the screen already shows, so widening it here would create a second,
 * looser answer to the same question.
 */
const QUALITY_ROLES = ['admin', 'direction'] as const

/**
 * FOR-MI-14 export — the controlled form, from canonical data.
 *
 * The sheet is built from audit_programs, audit_program_clauses,
 * audit_program_items and qms_processes, so an exported form and the register
 * cannot disagree. Nothing is re-read from the source workbooks at export time.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!(QUALITY_ROLES as readonly string[]).includes(session.user.role))
    return NextResponse.json({ error: 'Accès réservé à l\'équipe qualité' }, { status: 403 })

  const { id } = await params
  const programme = await getAuditProgrammeForExport(id)
  if (!programme) return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 })

  const bytes = await buildAuditProgrammeWorkbook(programme)
  const safeReference = programme.reference.replace(/[^A-Za-z0-9._-]/g, '-')

  return new NextResponse(bytes as unknown as BodyInit, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="FOR-MI-14-${safeReference}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
