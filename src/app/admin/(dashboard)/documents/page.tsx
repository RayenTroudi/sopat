import { auth } from '@/lib/auth'
import { listDmsDocuments } from '@/lib/dms/queries'
import { getActiveUsers } from '@/lib/db/iso'
import { DmsDocumentsClient } from './DocumentsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Informations Documentées | SOPAT Admin' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function DocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) return null

  const [{ rows, total }, users] = await Promise.all([
    listDmsDocuments({
      status:      typeof sp.status      === 'string' ? sp.status      : undefined,
      typeCode:    typeof sp.typeCode    === 'string' ? (sp.typeCode as any)    : undefined,
      processCode: typeof sp.processCode === 'string' ? (sp.processCode as any) : undefined,
      search:      typeof sp.search      === 'string' ? sp.search      : undefined,
    }),
    getActiveUsers(),
  ])

  const canEdit = session.user.role === 'admin' || session.user.role === 'direction'

  return (
    <DmsDocumentsClient
      initialRows={rows}
      total={total}
      users={users}
      canEdit={canEdit}
      currentUserId={session.user.userId}
    />
  )
}
