import { auth } from '@/lib/auth'
import { listNcs, getActiveUsers, type NcStatus, type NcProcess } from '@/lib/db/iso'
import { NcPageClient } from './NcPageClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Non-Conformités | SOPAT Admin' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function NCPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) return null

  const status    = (typeof sp.status  === 'string' ? sp.status  : undefined) as NcStatus | undefined
  const process   = (typeof sp.process === 'string' ? sp.process : undefined) as NcProcess | undefined
  const projectId = typeof sp.projectId === 'string' ? sp.projectId : undefined
  const search    = typeof sp.search    === 'string' ? sp.search    : undefined

  const [{ rows, total }, users] = await Promise.all([
    listNcs({ status, process, projectId, search }),
    getActiveUsers(),
  ])

  return (
    <NcPageClient
      initialRows={rows}
      total={total}
      users={users}
      currentUserId={session.user.userId}
      currentUserName={session.user.name ?? session.user.email ?? 'Inconnu'}
    />
  )
}
