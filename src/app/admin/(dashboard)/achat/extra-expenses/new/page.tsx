import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getProjectsForSelect } from '@/lib/db/achat'
import NewExpenseForm from './NewExpenseForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Nouvelle extra dépense | SOPAT Admin' }

export default async function NewExtraExpensePage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['admin', 'direction', 'realisation_chef', 'etudes_chef'].includes(session.user.role)) redirect('/admin')

  const projects = await getProjectsForSelect()
  return <NewExpenseForm projects={projects} />
}
