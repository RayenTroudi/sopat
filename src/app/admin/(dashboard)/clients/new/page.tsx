import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ClientForm } from '@/components/clients/ClientForm'

export const metadata = { title: 'Nouveau client | SOPAT Admin' }

export default async function NewClientPage() {
  const session = await auth()
  if (!session) redirect('/auth/login')

  const canCreate = ['admin', 'direction', 'etudes_chef'].includes(session.user.role)
  if (!canCreate) redirect('/admin/clients')

  const canToggleFeatured = ['admin', 'direction'].includes(session.user.role)

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
        Nouveau client
      </h1>
      <ClientForm canToggleFeatured={canToggleFeatured} />
    </div>
  )
}
