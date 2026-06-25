import { auth } from '@/lib/auth'
import { SuppliersClient } from './SuppliersClient'

export const metadata = { title: 'Fournisseurs agréés | SOPAT Admin' }

export default async function SuppliersPage() {
  const session = await auth()

  const canEdit = session?.user.role === 'admin'
    || session?.user.role === 'direction'
    || session?.user.role === 'etudes_chef'
    || session?.user.role === 'realisation_chef'

  return <SuppliersClient canEdit={canEdit} currentUserId={session?.user.userId ?? ''} />
}
