import { auth } from '@/lib/auth'
import { listSuppliers } from '@/lib/db/suppliers'
import { SuppliersClient } from './SuppliersClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Fournisseurs agréés | SOPAT Admin' }

export default async function SuppliersPage() {
  const [session, suppliers] = await Promise.all([
    auth(),
    listSuppliers(),
  ])

  const canEdit = session?.user.role === 'admin'
    || session?.user.role === 'direction'
    || session?.user.role === 'etudes_chef'
    || session?.user.role === 'realisation_chef'

  return <SuppliersClient initialSuppliers={suppliers} canEdit={canEdit} currentUserId={session?.user.userId ?? ''} />
}
