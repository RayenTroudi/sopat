import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listAuditPrograms, type NcDept, type AuditProgramStatus } from '@/lib/db/iso'
import { listIsoClauses, listProcessDefinitions, getAnnualCoverage } from '@/lib/db/iso-reference'
import { db } from '@/db'
import { users } from '@/db/schema'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { AuditProgramsClient } from './AuditProgramsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Programmes d\'audit | SOPAT Admin' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function AuditProgramsPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) return null
  if (!['admin', 'direction'].includes(session.user.role)) redirect('/admin')

  const year   = typeof sp.year   === 'string' ? Number(sp.year)   : undefined
  const dept   = typeof sp.dept   === 'string' ? sp.dept   as NcDept           : undefined
  const status = typeof sp.status === 'string' ? sp.status as AuditProgramStatus : undefined

  // Clause 9.2.2 a) asks the programme itself — not each audit — to take the
  // importance of the processes and the results of previous audits into account.
  // Coverage is now a query rather than a guess, so the year's blind spots are
  // visible while next year's programme is being planned.
  const coverageYear = year ?? new Date().getFullYear()

  const [rows, clauses, processes, auditors, coverage] = await Promise.all([
    listAuditPrograms({ year, dept, status }),
    listIsoClauses(),
    listProcessDefinitions(),
    // The qualified internal auditors register (LIS-MI-05). The previous version
    // fetched every active user and then never used the list at all — the auditor
    // was a free-text box with no connection to the register, so ISO 9001
    // § 9.2.2 c) could not be checked.
    db
      .select({ id: users.id, name: users.name, role: users.role, domain: users.auditorDomain })
      .from(users)
      .where(and(
        eq(users.isInternalAuditor, true),
        eq(users.isActive, true),
        isNull(users.deletedAt),
      ))
      .orderBy(asc(users.name)),
    getAnnualCoverage(coverageYear),
  ])

  const role = session.user.role
  const canEdit = role === 'admin' || role === 'direction'

  return (
    <AuditProgramsClient
      initialRows={rows}
      clauses={clauses}
      processes={processes}
      auditors={auditors}
      coverage={coverage}
      canEdit={canEdit}
    />
  )
}
