import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/db/projects'
import { getProjectConcept } from '@/lib/db/design-concepts'
import { ConceptSection } from './ConceptSection'

export const dynamic = 'force-dynamic'

export default async function EtudesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    if (access.error === 'NOT_FOUND') redirect('/admin/projects')
    redirect('/admin/dashboard')
  }

  const concept = await getProjectConcept(id)

  const canEdit =
    session.user.role === 'admin' ||
    session.user.role === 'direction' ||
    session.user.role === 'etudes_chef' ||
    session.user.role === 'etudes_team'

  return (
    <div className="space-y-6">
      <ConceptSection
        projectId={id}
        projectType={concept?.projectType ?? access.project.projectType}
        initialTitle={concept?.conceptTitle ?? ''}
        initialDescription={concept?.conceptDescription ?? ''}
        initialVocabulary={concept?.designVocabulary ?? []}
        initialPalette={concept?.plantPalettePhilosophy ?? []}
        canEdit={canEdit}
      />

      <div className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
        La liste des végétaux et le reste de la phase Études apparaîtront ici.
      </div>
    </div>
  )
}
