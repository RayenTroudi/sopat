import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { listIsoClauses, listProcessDefinitions } from '@/lib/db/iso-reference'

/**
 * The QMS reference data: the ISO 9001:2015 clause register and SOPAT's process
 * cartography with its reusable audit criteria.
 *
 * Exists so the audit-programme UI reads its clause list, agenda templates,
 * reference documents and time slots from the database instead of from literals
 * compiled into the client bundle, where they could not be validated on the
 * server and had drifted from the FOR-MI-14 workbooks.
 *
 * Read-only, and available to any signed-in user: the clause register is not
 * confidential, and the modules that will consume it next (non-conformities,
 * management review) are not restricted to the quality team.
 */
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const [clauses, processes] = await Promise.all([
    listIsoClauses(),
    listProcessDefinitions(),
  ])

  return NextResponse.json({ clauses, processes })
}
