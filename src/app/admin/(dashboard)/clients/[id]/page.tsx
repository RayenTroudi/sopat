import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getClientById, getClientProjects, getClientInteractions } from '@/lib/db/clients'
import { db } from '../../../../../../db/index'
import { clientSatisfaction, projects } from '../../../../../../db/schema'
import { eq, inArray } from 'drizzle-orm'
import { ClientDetailTabs } from '@/components/clients/ClientDetailTabs'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['admin', 'direction', 'etudes_chef', 'realisation_chef']

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/auth/login')
  if (!ALLOWED_ROLES.includes(session.user.role)) redirect('/admin')

  const { id } = await params
  const { edit } = await searchParams
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
  const canToggleFeatured = ['admin', 'direction'].includes(role)
  const canDelete = ['admin', 'direction'].includes(role)
  const canLogInteraction = ALLOWED_ROLES.includes(role)
  const canDeleteInteraction = ['admin', 'direction', 'etudes_chef'].includes(role)
  const canSeeFullName = ['admin', 'direction'].includes(role)

  const maskedDisplayName =
    !canSeeFullName && client.clientType === 'residentiel_prive'
      ? client.displayName.split(/\s+/).map((w) => (w[0]?.toUpperCase() ?? '') + '.').join(' ')
      : client.displayName

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--admin-text-muted)' }}>
        <Link href="/admin/clients" className="flex items-center gap-1 hover:underline" style={{ color: 'var(--admin-text-muted)' }}>
          <ChevronLeft className="w-3.5 h-3.5" />
          Clients
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--admin-text)' }}>{maskedDisplayName}</span>
      </div>

      {/* Tabs + content */}
      <ClientDetailTabs
        client={client}
        clientProjects={clientProjectsList}
        interactions={interactions}
        satisfaction={satisfaction}
        canEdit={canEdit}
        canToggleFeatured={canToggleFeatured}
        canDelete={canDelete}
        canLogInteraction={canLogInteraction}
        canDeleteInteraction={canDeleteInteraction}
        canSeeFullName={canSeeFullName}
        initialEditing={canEdit && edit === '1'}
      />
    </div>
  )
}
