import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ClientsClient } from './ClientsClient'

export const metadata = { title: 'Clients | SOPAT Admin' }

const ALLOWED_ROLES = ['admin', 'direction', 'etudes_chef', 'realisation_chef']

export default async function ClientsPage() {
  const session = await auth()
  if (!session) redirect('/auth/login')
  if (!ALLOWED_ROLES.includes(session.user.role)) redirect('/admin')

  const role = session.user.role
  const canCreate = ['admin', 'direction', 'etudes_chef'].includes(role)
  const canSeeFullPrivate = ['admin', 'direction'].includes(role)

  return <ClientsClient canCreate={canCreate} canSeeFullPrivate={canSeeFullPrivate} />
}
