import { auth } from '@/lib/auth'
import { getActiveUsers } from '@/lib/db/iso'
import { DmsDocumentsClient } from './DocumentsClient'

export const metadata = { title: 'Informations Documentées | SOPAT Admin' }

export default async function DocumentsPage() {
  const [session, users] = await Promise.all([auth(), getActiveUsers()])
  if (!session) return null

  const canEdit = session.user.role === 'admin' || session.user.role === 'direction'

  return (
    <DmsDocumentsClient
      users={users}
      canEdit={canEdit}
      currentUserId={session.user.userId}
    />
  )
}
