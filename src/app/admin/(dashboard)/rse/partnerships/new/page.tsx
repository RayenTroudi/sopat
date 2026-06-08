import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listUsers } from '@/lib/db/team'
import { NewRsePartnershipForm } from '@/components/rse/NewRsePartnershipForm'

export const metadata = { title: 'Nouveau partenariat RSE | SOPAT Admin' }

export default async function NewRsePartnershipPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const role = session.user.role
  if (role !== 'admin' && role !== 'direction') redirect('/admin/rse/partnerships')

  const allUsers = await listUsers()

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
          Nouveau partenariat RSE
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
          Enregistrer une nouvelle convention de collaboration environnementale
        </p>
      </div>

      <NewRsePartnershipForm users={allUsers} currentUserId={session.user.userId} />
    </div>
  )
}
