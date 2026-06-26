import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getClientById, getClientProjects, getClientInteractions } from '@/lib/db/clients'
import { db } from '../../../../../../db/index'
import { clientSatisfaction, projects } from '../../../../../../db/schema'
import { eq, inArray } from 'drizzle-orm'
import { ClientDetailTabs } from '@/components/clients/ClientDetailTabs'
import { ChevronLeft, Building2, MapPin, Briefcase, Star } from 'lucide-react'

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

  const avgSatisfaction =
    satisfaction.length > 0
      ? (satisfaction.reduce((s, r) => s + r.score, 0) / satisfaction.length).toFixed(1)
      : null

  const CLIENT_TYPE_LABELS: Record<string, string> = {
    entreprise:           'Entreprise',
    institution_publique: 'Institution publique',
    promoteur_immobilier: 'Promoteur immobilier',
    residentiel_prive:    'Résidentiel privé',
    autre:                'Autre',
  }

  const activeProjectCount = clientProjectsList.filter(
    (p) => !['completed', 'cancelled'].includes(p.status)
  ).length

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

      {/* Hero header */}
      <div
        className="rounded-2xl border p-5 sm:p-6"
        style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
      >
        <div className="flex items-start gap-4">
          {/* Logo or avatar */}
          {client.logoUrl ? (
            <img
              src={client.logoUrl}
              alt={maskedDisplayName}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-contain border shrink-0"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}
            />
          ) : (
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--admin-emerald-dim)' }}
            >
              <Building2 className="w-7 h-7" style={{ color: 'var(--admin-emerald)' }} />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
              {maskedDisplayName}
            </h1>
            {client.companyName && client.companyName !== maskedDisplayName && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{client.companyName}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span
                className="text-[12px] px-2.5 py-1 rounded-full border font-medium"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}
              >
                {CLIENT_TYPE_LABELS[client.clientType] ?? client.clientType}
              </span>
              {client.country && (
                <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>
                  <MapPin className="w-3 h-3" />
                  {client.city ? `${client.city}, ${client.country}` : client.country}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div
          className="mt-5 pt-4 grid grid-cols-3 gap-4 border-t"
          style={{ borderColor: 'var(--admin-border)' }}
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Briefcase className="w-3.5 h-3.5" style={{ color: 'var(--admin-text-muted)' }} />
            </div>
            <p className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>{client.projectCount}</p>
            <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
              {activeProjectCount > 0 ? `${activeProjectCount} actif${activeProjectCount !== 1 ? 's' : ''}` : 'projets'}
            </p>
          </div>
          <div className="text-center border-x" style={{ borderColor: 'var(--admin-border)' }}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Building2 className="w-3.5 h-3.5" style={{ color: 'var(--admin-text-muted)' }} />
            </div>
            <p className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
              {client.totalRevenueTND > 0 ? `${(client.totalRevenueTND / 1000).toFixed(0)} k` : '—'}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>TND approuvés</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="w-3.5 h-3.5" style={{ color: 'var(--admin-text-muted)' }} />
            </div>
            <p className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>{avgSatisfaction ?? '—'}</p>
            <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>satisfaction / 5</p>
          </div>
        </div>
      </div>

      {/* Tabs + content */}
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
