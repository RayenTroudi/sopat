import Link from 'next/link'
import { auth } from '@/auth'
import {
  getDashboardKpis,
  getRecentActivity,
  getAtRiskProjects,
  getUpcomingVisits,
} from '@/lib/db/dashboard'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { MiniPie } from '@/components/dashboard/MiniPie'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { AtRiskTable } from '@/components/dashboard/AtRiskTable'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Tableau de bord | SOPAT Admin' }

const VISIT_TYPE_LABELS: Record<string, string> = {
  taille:                    'Taille',
  arrosage:                  'Arrosage',
  traitement_phytosanitaire: 'Traitement',
  fertilisation:             'Fertilisation',
  controle_general:          'Contrôle général',
  other:                     'Autre',
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className="text-lg" style={{ color: score >= s ? '#F59E0B' : 'var(--admin-border)' }}>★</span>
      ))}
    </div>
  )
}

export default async function AdminDashboard() {
  const [kpis, activity, atRisk, upcomingVisits] = await Promise.all([
    getDashboardKpis(),
    getRecentActivity(20),
    getAtRiskProjects(),
    getUpcomingVisits(7),
  ])

  const { activeProjects, onTimeDeliveryRate, avgBudgetVariance, openNcs, ncSlaClosureRate, maintenanceThisMonth, satisfactionScore } = kpis

  const phaseColors = {
    etudes:      '#2D5A27',
    realisation: '#D97706',
    entretien:   '#2563EB',
  }
  const phasePieData = [
    { name: 'Études',      value: activeProjects.byPhase.etudes,      color: phaseColors.etudes },
    { name: 'Réalisation', value: activeProjects.byPhase.realisation,  color: phaseColors.realisation },
    { name: 'Entretien',   value: activeProjects.byPhase.entretien,    color: phaseColors.entretien },
  ]

  const varianceAccent = avgBudgetVariance === null ? 'muted'
    : avgBudgetVariance > 10 ? 'red'
    : avgBudgetVariance > 0  ? 'amber'
    : 'green'

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>Tableau de bord</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            Objectifs qualité ISO 9001:2015 · Mis à jour en temps réel
          </p>
        </div>
        <Link href="/admin/reports" className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>
          Voir les rapports →
        </Link>
      </div>

      {/* KPI cards — 4 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* 1. Active projects */}
        <MetricCard
          title="Projets actifs"
          value={activeProjects.total}
          subtitle={`Études: ${activeProjects.byPhase.etudes} · Réalisation: ${activeProjects.byPhase.realisation} · Entretien: ${activeProjects.byPhase.entretien}`}
          trend={{ value: activeProjects.trendVsLastMonth, suffix: ' vs mois préc.' }}
          accent="green"
        >
          <MiniPie data={phasePieData} size={56} />
        </MetricCard>

        {/* 2. On-time delivery */}
        <MetricCard
          title="Livraison dans les délais"
          value={`${onTimeDeliveryRate}%`}
          subtitle="Projets terminés dans les délais prévus"
          accent={onTimeDeliveryRate >= 80 ? 'green' : onTimeDeliveryRate >= 60 ? 'amber' : 'red'}
          isoClause="8.1"
        />

        {/* 3. Budget variance */}
        <MetricCard
          title="Variance budgétaire moy."
          value={avgBudgetVariance === null ? '—' : `${avgBudgetVariance > 0 ? '+' : ''}${avgBudgetVariance}%`}
          subtitle="Écart moyen budget approuvé vs dépenses réelles"
          accent={varianceAccent}
          isoClause="8.1"
        />

        {/* 4. Open NCs */}
        <MetricCard
          title="Non-conformités ouvertes"
          value={openNcs.count}
          subtitle={openNcs.overdue > 0 ? `⚠ ${openNcs.overdue} en retard sur délai` : 'Toutes dans les délais'}
          trend={{ value: openNcs.trendVsLastMonth, suffix: ' vs mois préc.' }}
          accent={openNcs.count === 0 ? 'green' : openNcs.overdue > 0 ? 'red' : 'amber'}
          isoClause="8.7"
        />

      </div>

      {/* Second row of KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* 5. NC SLA closure rate */}
        <MetricCard
          title="Taux clôture NC dans les délais"
          value={`${ncSlaClosureRate}%`}
          subtitle="NCs clôturées avant leur délai SLA"
          accent={ncSlaClosureRate >= 80 ? 'green' : ncSlaClosureRate >= 60 ? 'amber' : 'red'}
          isoClause="10.2"
        />

        {/* 6. Maintenance this month */}
        <MetricCard
          title="Visites maintenance ce mois"
          value={`${maintenanceThisMonth.completed} / ${maintenanceThisMonth.scheduled}`}
          subtitle={`${maintenanceThisMonth.scheduled - maintenanceThisMonth.completed} visite${maintenanceThisMonth.scheduled - maintenanceThisMonth.completed !== 1 ? 's' : ''} restante${maintenanceThisMonth.scheduled - maintenanceThisMonth.completed !== 1 ? 's' : ''}`}
          accent={maintenanceThisMonth.scheduled === 0 ? 'muted' : maintenanceThisMonth.completed === maintenanceThisMonth.scheduled ? 'green' : 'blue'}
        />

        {/* 7. Client satisfaction */}
        <MetricCard
          title="Satisfaction client (12 mois)"
          value={satisfactionScore !== null ? `${satisfactionScore} / 5` : '—'}
          subtitle="Score moyen glissant sur 12 mois"
          accent={satisfactionScore === null ? 'muted' : satisfactionScore >= 4 ? 'green' : satisfactionScore >= 3 ? 'amber' : 'red'}
          isoClause="9.1.2"
        >
          {satisfactionScore !== null && <StarRating score={Math.round(satisfactionScore)} />}
        </MetricCard>

      </div>

      {/* Bottom grid: activity + risk + visits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Activity feed — 1 col */}
        <Section title="Activité récente">
          <ActivityFeed entries={activity} />
        </Section>

        {/* At-risk projects + upcoming visits — 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          <Section
            title={`Projets à risque${atRisk.length > 0 ? ` — ${atRisk.length}` : ''}`}
            action={
              <Link href="/admin/projects" className="text-xs" style={{ color: 'var(--admin-blue)' }}>
                Voir tous →
              </Link>
            }
          >
            <AtRiskTable projects={atRisk} />
          </Section>

          <Section
            title="Visites de maintenance — 7 prochains jours"
            action={
              <Link href="/admin/projects" className="text-xs" style={{ color: 'var(--admin-blue)' }}>
                Voir tous les projets →
              </Link>
            }
          >
            {upcomingVisits.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--admin-text-muted)' }}>
                Aucune visite planifiée dans les 7 prochains jours.
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingVisits.map((v) => {
                  const dayDiff = Math.ceil((new Date(v.visitDate).getTime() - Date.now()) / 86400000)
                  return (
                    <div
                      key={v.id}
                      className="flex items-center gap-4 px-4 py-3 rounded-lg border"
                      style={{ borderColor: 'var(--admin-border)' }}
                    >
                      {/* Date badge */}
                      <div className="shrink-0 w-12 text-center">
                        <p className="text-lg font-bold tabular-nums leading-none" style={{ color: 'var(--admin-emerald)' }}>
                          {new Date(v.visitDate).getDate()}
                        </p>
                        <p className="text-xs uppercase" style={{ color: 'var(--admin-text-muted)' }}>
                          {new Date(v.visitDate).toLocaleDateString('fr-FR', { month: 'short' })}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--admin-text)' }}>
                          {v.projectName ?? '—'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                          {VISIT_TYPE_LABELS[v.visitType] ?? v.visitType}
                          {v.teamMemberName ? ` · ${v.teamMemberName}` : ''}
                          {v.durationHours ? ` · ${v.durationHours}h` : ''}
                        </p>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded font-medium shrink-0"
                        style={{
                          background: dayDiff <= 1 ? 'var(--admin-amber-dim)' : 'var(--admin-emerald-dim)',
                          color:      dayDiff <= 1 ? 'var(--admin-amber)'     : 'var(--admin-emerald)',
                        }}
                      >
                        {dayDiff <= 0 ? 'Aujourd\'hui' : dayDiff === 1 ? 'Demain' : `J+${dayDiff}`}
                      </span>
                      <Link
                        href={`/admin/projects/${v.projectId}?tab=entretien`}
                        className="text-xs shrink-0 hover:underline"
                        style={{ color: 'var(--admin-blue)' }}
                      >
                        Voir →
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>
        </div>

      </div>
    </div>
  )
}
