import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listAuditPrograms, getActiveUsers, type NcDept, type AuditProgramStatus } from '@/lib/db/iso'
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

  const [rows, users] = await Promise.all([
    listAuditPrograms({ year, dept, status }),
    getActiveUsers(),
  ])

  const role = session.user.role
  const canEdit = role === 'admin' || role === 'direction'

  return (
    <AuditProgramsClient
      initialRows={rows}
      users={users}
      currentUserId={session.user.userId}
      canEdit={canEdit}
    />
  )
}
