import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getProjectsForSelect, getSuppliersForSelect } from '@/lib/db/achat'
import NewDeliveryNoteForm from './NewDeliveryNoteForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Nouveau bon | SOPAT Admin' }

export default async function NewDeliveryNotePage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['admin', 'direction', 'realisation_chef', 'etudes_chef'].includes(session.user.role)) redirect('/admin')

  const [projects, suppliers] = await Promise.all([
    getProjectsForSelect(),
    getSuppliersForSelect(),
  ])

  return <NewDeliveryNoteForm projects={projects} suppliers={suppliers} />
}
