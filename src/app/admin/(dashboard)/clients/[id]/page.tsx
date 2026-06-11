import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getClientById, getClientProjects, getClientInteractions } from '@/lib/db/clients'
import { db } from '../../../../../../db/index'
import { clientSatisfaction, projects } from '../../../../../../db/schema'
import { eq, inArray } from 'drizzle-orm'
import { ClientDetailTabs } from '@/components/clients/ClientDetailTabs'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['admin', 'direction', 'etudes_chef', 'realisation_chef']

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/auth/login')
  if (!ALLOWED_ROLES.includes(session.user.role)) redirect('/admin')

  const { id } = await params
  const [client, clientProjectsList, interactions] = await Promise.all([
    getClientById(id),
    getClientProjects(id),
    getClientInteractions(id),
  ])
  if (!client) notFound()

  const projectIds = clientProjectsList.map((p) => p.id)
  let satisfaction: {
    id: string
    score: number
    comments: string | null
    recordedAt: Date
    projectName: string
    projectReference: string
  }[] = []

  if (projectIds.length > 0) {
    const satRows = await db
      .select({
        id: clientSatisfaction.id,
        score: clientSatisfaction.score,
        comments: clientSatisfaction.comments,
        recordedAt: clientSatisfaction.recordedAt,
        projectName: projects.name,
        projectReference: projects.reference,
      })
      .from(clientSatisfaction)
      .innerJoin(projects, eq(clientSatisfaction.projectId, projects.id))
      .where(inArray(clientSatisfaction.projectId, projectIds))
      .orderBy(clientSatisfaction.recordedAt)

    satisfaction = satRows
  }

  const role = session.user.role
  const canEdit = ['admin', 'direction', 'etudes_chef'].includes(role)
  const canDelete = ['admin', 'direction'].includes(role)
  const canLogInteraction = ALLOWED_ROLES.includes(role)
  const canDeleteInteraction = ['admin', 'direction', 'etudes_chef'].includes(role)
  const canSeeFullName = ['admin', 'direction'].includes(role)

  const maskedDisplayName =
    !canSeeFullName && client.clientType === 'residentiel_prive'
      ? client.displayName.split(/\s+/).map((w) => (w[0]?.toUpperCase() ?? '') + '.').join(' ')
      : client.displayName

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
          {maskedDisplayName}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
          {client.country} · {client.projectCount} projet{client.projectCount !== 1 ? 's' : ''}
        </p>
      </div>

      <ClientDetailTabs
        client={client}
        clientProjects={clientProjectsList}
        interactions={interactions}
        satisfaction={satisfaction}
        canEdit={canEdit}
        canDelete={canDelete}
        canLogInteraction={canLogInteraction}
        canDeleteInteraction={canDeleteInteraction}
        canSeeFullName={canSeeFullName}
      />
    </div>
  )
}
