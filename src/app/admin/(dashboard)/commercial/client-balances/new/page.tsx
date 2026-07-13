import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getClientsForSelect } from '@/lib/db/client-accounts'
import { getProjectsForSelect } from '@/lib/db/achat'
import NewEntryForm from './NewEntryForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Nouvelle écriture client | SOPAT Admin' }

export default async function NewClientEntryPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['admin', 'direction', 'etudes_chef'].includes(session.user.role)) redirect('/admin')

  const [clients, projects] = await Promise.all([
    getClientsForSelect(),
    getProjectsForSelect(),
  ])

  return <NewEntryForm clients={clients} projects={projects} />
}
