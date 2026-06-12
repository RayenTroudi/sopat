import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { searchConcepts } from '@/lib/db/design-concepts'
import { ConceptsLibraryClient } from './ConceptsLibraryClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Bibliothèque de concepts | SOPAT Admin' }

export default async function ConceptsLibraryPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const allowed = ['admin', 'direction', 'etudes_chef', 'etudes_team']
  if (!allowed.includes(session.user.role)) redirect('/admin/dashboard')

  const concepts = await searchConcepts()
  const canCreateTemplate =
    session.user.role === 'admin' || session.user.role === 'direction' || session.user.role === 'etudes_chef'

  return <ConceptsLibraryClient initialConcepts={concepts} canCreateTemplate={canCreateTemplate} />
}
