import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getOfferBordereau } from '@/lib/db/bordereau'
import { buildBordereauWorkbook } from '@/lib/export/bordereau-workbook'

type RouteParams = { params: Promise<{ id: string }> }

const READ_ROLES = ['admin', 'direction', 'etudes_chef']

/**
 * FOR-CO-02 export — the official layout, with live formulas.
 *
 * The file recalculates in Excel and re-imports into an identical structured
 * model, so the ERP and the document a client receives can never disagree.
 * Every subtotal is a real `SUM`; none of the source's twelve `#REF!` formulas
 * and none of its seventeen category banner leftovers are reproduced.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!READ_ROLES.includes(session.user.role))
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })

  const { id } = await params
  const document = await getOfferBordereau(id)
  if (!document) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })

  const bytes = await buildBordereauWorkbook(document)
  const safeReference = document.offer.reference.replace(/[^A-Za-z0-9._-]/g, '-')

  return new NextResponse(bytes as unknown as BodyInit, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        `attachment; filename="FOR-CO-02-${safeReference}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
