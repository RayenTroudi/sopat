import { auth } from '@/lib/auth'
import { listAudits, getActiveUsers, type AuditStatus } from '@/lib/db/iso'
import { AuditsClient } from './AuditsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Audits Internes | SOPAT Admin' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function AuditsPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) return null

  const status  = (typeof sp.status  === 'string' ? sp.status  : undefined) as AuditStatus | undefined
  const process = typeof sp.process === 'string' ? sp.process : undefined

  const [{ rows, total }, users] = await Promise.all([
    listAudits({ status, process }),
    getActiveUsers(),
  ])

  const isAdmin = session.user.role === 'admin' || session.user.role === 'direction'

  return (
    <AuditsClient
      initialRows={rows}
      total={total}
      users={users}
      isAdmin={isAdmin}
      currentUserId={session.user.userId}
    />
  )
}
