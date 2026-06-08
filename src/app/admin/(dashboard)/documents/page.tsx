import { auth } from '@/lib/auth'
import { listDocuments, getActiveUsers, type DocumentStatus, type DocumentCategory } from '@/lib/db/iso'
import { DocumentsClient } from './DocumentsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Contrôle Documentaire | SOPAT Admin' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function DocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) return null

  const status   = (typeof sp.status   === 'string' ? sp.status   : undefined) as DocumentStatus | undefined
  const category = (typeof sp.category === 'string' ? sp.category : undefined) as DocumentCategory | undefined
  const search   = typeof sp.search === 'string' ? sp.search : undefined

  const [{ rows, total }, users] = await Promise.all([
    listDocuments({ status, category, search }),
    getActiveUsers(),
  ])

  const isAdmin = session.user.role === 'admin' || session.user.role === 'direction'

  return (
    <DocumentsClient
      initialRows={rows}
      total={total}
      users={users}
      isAdmin={isAdmin}
      currentUserId={session.user.userId}
    />
  )
}
