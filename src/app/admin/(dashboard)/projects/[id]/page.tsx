import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getProjectById } from '@/lib/db/projects'
import { getLatestBudgetValidation } from '@/lib/db/predictions'
import { getPlantList, getActiveSuppliers } from '@/lib/db/etudes'
import { getActiveUsers } from '@/lib/db/iso'
import { PhaseBadge } from '@/components/projects/PhaseBadge'
import { BudgetBadge } from '@/components/projects/BudgetBadge'
import { ProjectTabs } from './ProjectTabs'
import { ConceptCard } from '@/components/projects/ConceptCard'
import { maskClientName } from '@/lib/db/projects'

export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string }>
type SearchParams = Promise<{ tab?: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params
  const data = await getProjectById(id)
  if (!data) return { title: 'Projet introuvable' }
  return { title: `${data.project.reference} — ${data.project.name} | SOPAT Admin` }
}

const TYPE_LABELS: Record<string, string> = {
  ingenierie_territoriale: 'Ingénierie territoriale',
  espace_public:           'Espace public',
  siege_social:            'Siège social',
  hotelier_touristique:    'Hôtelier & touristique',
  residentiel:             'Résidentiel',
  interieur:               'Intérieur',
}

function fmt(date: Date | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const [{ id }, sp, session] = await Promise.all([
    params,
    searchParams,
    auth(),
  ])

  const activeTab = sp.tab ?? 'etudes'

  const data = await getProjectById(id)
  if (!data) notFound()

  const { project, phases, activityLog, assets } = data

  const [latestValidation, plantList, users] = await Promise.all([
    getLatestBudgetValidation(id),
    getPlantList(id),
    getActiveUsers(),
  ])

  // Derive plant zones from plant categories in the études list
  const plantZones = [...new Set(plantList.map((p) => {
    const labels: Record<string, string> = {
      tree: 'Arbres', shrub: 'Arbustes', ground_cover: 'Couvre-sols',
      climber: 'Grimpantes', palm: 'Palmiers', grass: 'Graminées',
      aquatic: 'Plantes aquatiques', other: 'Autres',
    }
    return labels[p.category] ?? p.category
  }))]

  const isAdmin = session?.user.role === 'admin' || session?.user.role === 'direction'

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
        <Link href="/admin/projects" className="hover:underline">Projets</Link>
        <span>/</span>
        <span style={{ color: 'var(--admin-text)' }}>{project.reference}</span>
      </nav>

      {/* Header */}
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>
                {project.name}
              </h1>
              <PhaseBadge status={project.status} />
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--admin-text-muted)' }}>
              {project.reference} · {TYPE_LABELS[project.projectType] ?? project.projectType} · {maskClientName(project.clientName, project.clientAnonymized ?? false, session?.user.role ?? '')}
            </p>
          </div>
          <BudgetBadge approved={project.approvedBudget} />
        </div>

        {/* Key info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t" style={{ borderColor: 'var(--admin-border)' }}>
          {[
            { label: 'Surface',       value: project.siteAreaM2 ? `${project.siteAreaM2} m²` : '—' },
            { label: 'Début',         value: fmt(project.startDate) },
            { label: 'Livraison est.', value: fmt(project.estimatedDeliveryDate) },
            {
              label: 'Budget approuvé',
              value: project.approvedBudget
                ? `${Number(project.approvedBudget).toLocaleString('fr-FR')} ${project.currency ?? 'TND'}`
                : '—',
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--admin-text)' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      <ConceptCard
        conceptTitle={project.conceptTitle}
        conceptDescription={project.conceptDescription}
        designVocabulary={project.designVocabulary}
        plantPalettePhilosophy={project.plantPalettePhilosophy}
      />

      {/* Tabs */}
      <ProjectTabs
        projectId={id}
        activeTab={activeTab}
        phases={phases}
        activityLog={activityLog}
        assets={assets}
        approvedBudget={project.approvedBudget}
        latestValidation={latestValidation ? {
        id:                 latestValidation.id,
        status:             latestValidation.status,
        approvedAmount:     latestValidation.approvedAmount,
        approvedByName:     latestValidation.chefName,
        approvedAt:         latestValidation.validatedAt ?? latestValidation.modifiedAt,
        modificationReason: latestValidation.modificationReason,
        predictionId:       latestValidation.predictionId,
      } : null}
        isAdmin={isAdmin}
        projectType={project.projectType}
        siteAreaM2={project.siteAreaM2}
        userRole={session?.user.role ?? 'etudes_team'}
        siteAddress={project.siteAddress}
        clientEmail={project.clientEmail}
        clientPhone={project.clientPhone}
        plantZones={plantZones}
        users={users}
        currentUserId={session?.user.userId ?? ''}
        country={project.country}
        currency={project.currency}
      />
    </div>
  )
}
