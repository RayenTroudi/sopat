import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/db/projects'
import { getSupplyRegister } from '@/lib/db/supply'
import { buildSupplyWorkbook } from '@/lib/export/supply-workbook'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * FOR-AC-10 export.
 *
 * Deliberately NOT registered in `/api/export`, whose registry authorises by
 * role alone: this register is project-scoped, so it must also pass through
 * `assertProjectAccess` or a chef could export a chantier they are not on.
 *
 * The workbook itself is built by `buildSupplyWorkbook`, which reproduces the
 * source form's header block, three column groups, vertical merges and totals
 * row, with live formulas rather than baked values.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access)
    return NextResponse.json(
      { error: access.error === 'NOT_FOUND' ? 'Projet introuvable' : 'Non autorisé' },
      { status: access.error === 'NOT_FOUND' ? 404 : 403 }
    )

  const register = await getSupplyRegister(id)
  if (!register)
    return NextResponse.json({ error: 'Aucun registre pour ce projet' }, { status: 404 })

  const buffer = await buildSupplyWorkbook(register)

  const date = new Date().toISOString().slice(0, 10)
  const slug = register.project.reference.replace(/[^A-Za-z0-9-]+/g, '-')
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="FOR-AC-10-${slug}-${date}.xlsx"`,
    },
  })
}
