import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { searchClients } from '@/lib/db/clients'
import { NewProjectForm } from './NewProjectForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Nouveau projet — SOPAT Admin' }

export default async function NewProjectPage() {
  const session = await auth()
  if (!session) redirect('/auth/login')

  const canSeeClients = ['admin', 'direction', 'etudes_chef', 'realisation_chef'].includes(session.user.role)
  const clientOptions = canSeeClients ? await searchClients('') : []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>
          Nouveau projet
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
          Créer un projet — il sera ouvert directement en phase Études.
        </p>
      </div>
      <NewProjectForm clientOptions={clientOptions} />
    </div>
  )
}
