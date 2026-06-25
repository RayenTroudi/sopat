import Link from 'next/link'
import { auth } from '@/lib/auth'
import {
  getDashboardKpis,
  getRecentActivity,
  getAtRiskProjects,
  getUpcomingVisits,
  getCachedRecentActivity,
  getCachedAtRiskProjects,
} from '@/lib/db/dashboard'
import { runEmailReminderSweep } from '@/lib/tasks/email-reminders'
import { getRseDashboardData } from '@/lib/db/rse'
import { getInternationalDashboardData } from '@/lib/db/international'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { MiniPie } from '@/components/dashboard/MiniPie'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { AtRiskTable } from '@/components/dashboard/AtRiskTable'
import { DashboardTabs } from '@/components/dashboard/DashboardTabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  FolderOpen, Clock, TrendingUp, AlertTriangle, CheckCircle2,
  CalendarDays, Star, Handshake, CalendarClock, ArrowRight, CalendarX,
} from 'lucide-react'

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
    <div
      className="overflow-hidden"
      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}
    >
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid var(--admin-border)' }}>
        <p className="text-[13px] font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</p>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5 mt-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className="text-sm leading-none" style={{ color: score >= s ? '#D97706' : 'var(--admin-border)' }}>★</span>
      ))}
    </div>
  )
}

export default async function AdminDashboard() {
  // Fire-and-forget: runs at most once every 30 min (rate-gated in the task itself)
  runEmailReminderSweep().catch((e) => console.error('[reminder sweep]', e))

  const [kpis, activity, atRisk, upcomingVisits, rseData, intlData] = await Promise.all([
    getDashboardKpis(),
    getCachedRecentActivity(20),
    getCachedAtRiskProjects(),
    getUpcomingVisits(7),
    getRseDashboardData(),
    getInternationalDashboardData(),
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

  const mainDashboard = (
    <div className="space-y-5">
      {/* KPI cards — 4 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

        <MetricCard
          icon={FolderOpen}
          title="Projets actifs"
          value={activeProjects.total}
          subtitle={`Études: ${activeProjects.byPhase.etudes} · Réalisation: ${activeProjects.byPhase.realisation} · Entretien: ${activeProjects.byPhase.entretien}`}
          trend={{ value: activeProjects.trendVsLastMonth, suffix: ' vs mois préc.' }}
          accent="green"
          highlight
        >
          <MiniPie data={phasePieData} size={56} />
        </MetricCard>

        <MetricCard
          icon={Clock}
          title="Livraison dans les délais"
          value={`${onTimeDeliveryRate}%`}
          subtitle="Projets terminés dans les délais prévus"
          accent={onTimeDeliveryRate >= 80 ? 'green' : onTimeDeliveryRate >= 60 ? 'amber' : 'red'}
          isoClause="8.1"
        />

        <MetricCard
          icon={TrendingUp}
          title="Variance budgétaire moy."
          value={avgBudgetVariance === null ? '—' : `${avgBudgetVariance > 0 ? '+' : ''}${avgBudgetVariance}%`}
          subtitle="Écart moyen budget approuvé vs dépenses réelles"
          accent={varianceAccent}
          isoClause="8.1"
        />

        <MetricCard
          icon={AlertTriangle}
          title="Non-conformités ouvertes"
          value={openNcs.count}
          subtitle={openNcs.overdue > 0 ? `⚠ ${openNcs.overdue} en retard sur délai` : 'Toutes dans les délais'}
          accent={openNcs.count === 0 ? 'green' : openNcs.overdue > 0 ? 'red' : 'amber'}
          isoClause="8.7"
        />

      </div>

      {/* Second row of KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        <MetricCard
          icon={CheckCircle2}
          title="Taux clôture NC dans les délais"
          value={`${ncSlaClosureRate}%`}
          subtitle="NCs clôturées avant leur délai SLA"
          accent={ncSlaClosureRate >= 80 ? 'green' : ncSlaClosureRate >= 60 ? 'amber' : 'red'}
          isoClause="10.2"
        />

        <MetricCard
          icon={CalendarDays}
          title="Visites maintenance ce mois"
          value={`${maintenanceThisMonth.completed} / ${maintenanceThisMonth.scheduled}`}
          subtitle={`${maintenanceThisMonth.scheduled - maintenanceThisMonth.completed} visite${maintenanceThisMonth.scheduled - maintenanceThisMonth.completed !== 1 ? 's' : ''} restante${maintenanceThisMonth.scheduled - maintenanceThisMonth.completed !== 1 ? 's' : ''}`}
          accent={maintenanceThisMonth.scheduled === 0 ? 'muted' : maintenanceThisMonth.completed === maintenanceThisMonth.scheduled ? 'green' : 'blue'}
        />

        <MetricCard
          icon={Star}
          title="Satisfaction client (12 mois)"
          value={satisfactionScore !== null ? `${satisfactionScore} / 5` : '—'}
          subtitle="Score moyen glissant sur 12 mois"
          accent={satisfactionScore === null ? 'muted' : satisfactionScore >= 4 ? 'green' : satisfactionScore >= 3 ? 'amber' : 'red'}
          isoClause="9.1.2"
        >
          {satisfactionScore !== null && <StarRating score={Math.round(satisfactionScore)} />}
        </MetricCard>

      </div>

      {/* RSE Partnerships card */}
      {(rseData.activeCount > 0 || rseData.overdueCommitmentsCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MetricCard
            icon={Handshake}
            title="Partenariats RSE actifs"
            value={rseData.activeCount}
            subtitle={
              rseData.overdueCommitmentsCount > 0
                ? `⚠ ${rseData.overdueCommitmentsCount} engagement${rseData.overdueCommitmentsCount !== 1 ? 's' : ''} en retard`
                : 'Tous les engagements à jour'
            }
            accent={rseData.overdueCommitmentsCount > 0 ? 'red' : 'green'}
          />
          <MetricCard
            icon={CalendarClock}
            title="Prochain renouvellement RSE"
            value={rseData.nextExpiring ? `J-${rseData.nextExpiring.daysUntil}` : '—'}
            subtitle={
              rseData.nextExpiring
                ? `${rseData.nextExpiring.partnerName} · ${rseData.nextExpiring.conventionReference}`
                : 'Aucune convention expirant dans 90 jours'
            }
            accent={
              !rseData.nextExpiring ? 'muted'
              : rseData.nextExpiring.daysUntil <= 30 ? 'red'
              : 'amber'
            }
          />
          <div
            className="flex items-center justify-center rounded-lg border border-dashed"
            style={{ borderColor: 'var(--admin-border)', minHeight: '88px' }}
          >
            <Link
              href="/admin/rse/partnerships"
              className="text-xs font-medium"
              style={{ color: 'var(--admin-text-muted)' }}
            >
              Voir les partenariats →
            </Link>
          </div>
        </div>
      )}

      {/* Bottom grid: activity + risk + visits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <Section title="Activité récente">
          <ActivityFeed entries={activity} />
        </Section>

        <div className="lg:col-span-2 space-y-4">
          <Section
            title={`Projets à risque${atRisk.length > 0 ? ` — ${atRisk.length}` : ''}`}
            action={
              <Button variant="ghost" size="sm" asChild style={{ color: 'var(--admin-text-muted)' }}>
                <Link href="/admin/projects">Voir tous <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
              </Button>
            }
          >
            <AtRiskTable projects={atRisk} />
            {rseData.overdueCommitmentsCount > 0 && (
              <div
                className="mt-4 flex items-center gap-3 px-4 py-3 rounded-lg border"
                style={{ borderColor: 'var(--admin-red)', background: 'var(--admin-red-dim)' }}
              >
                <span style={{ color: 'var(--admin-red)' }}>⚠</span>
                <p className="text-sm flex-1" style={{ color: 'var(--admin-red)' }}>
                  <span className="font-semibold">{rseData.overdueCommitmentsCount} engagement{rseData.overdueCommitmentsCount !== 1 ? 's' : ''} RSE</span>
                  {' '}en retard
                </p>
                <Link
                  href="/admin/rse/partnerships?status=actif"
                  className="text-xs font-medium shrink-0"
                  style={{ color: 'var(--admin-red)' }}
                >
                  Voir →
                </Link>
              </div>
            )}
          </Section>

          <Section
            title="Visites de maintenance — 7 prochains jours"
            action={
              <Button variant="ghost" size="sm" asChild style={{ color: 'var(--admin-text-muted)' }}>
                <Link href="/admin/projects">Voir tous <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
              </Button>
            }
          >
            {upcomingVisits.length === 0 ? (
              <EmptyState icon={CalendarX} title="Aucune visite planifiée" description="Pas de visite dans les 7 prochains jours." iconColor="#000000" />
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
                {upcomingVisits.map((v) => {
                  const dayDiff = Math.ceil((new Date(v.visitDate).getTime() - Date.now()) / 86400000)
                  const urgent = dayDiff <= 1
                  return (
                    <div
                      key={v.id}
                      className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="shrink-0 w-10 text-center">
                        <p className="text-sm font-bold tabular-nums leading-none" style={{ color: urgent ? 'var(--admin-amber)' : 'var(--admin-text)' }}>
                          {new Date(v.visitDate).getDate()}
                        </p>
                        <p className="text-[10px] uppercase mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                          {new Date(v.visitDate).toLocaleDateString('fr-FR', { month: 'short' })}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--admin-text)' }}>
                          {v.projectName ?? '—'}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                          {VISIT_TYPE_LABELS[v.visitType] ?? v.visitType}
                          {v.teamMemberName ? ` · ${v.teamMemberName}` : ''}
                          {v.durationHours ? ` · ${v.durationHours}h` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="text-[11px] font-medium"
                          style={{ color: urgent ? 'var(--admin-amber)' : 'var(--admin-text-muted)' }}
                        >
                          {dayDiff <= 0 ? "Auj." : dayDiff === 1 ? 'Dem.' : `J+${dayDiff}`}
                        </span>
                        <Link
                          href={`/admin/projects/${v.projectId}?tab=entretien`}
                          className="text-[11px] hover:underline"
                          style={{ color: 'var(--admin-text-muted)' }}
                        >
                          →
                        </Link>
                      </div>
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

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>Tableau de bord</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            ISO 9001:2015 · Temps réel
          </p>
        </div>
        <Link
          href="/admin/reports"
          className="text-xs px-3 py-1.5 font-medium transition-colors"
          style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)', borderRadius: '6px' }}
        >
          Rapports →
        </Link>
      </div>

      <DashboardTabs
        mainContent={mainDashboard}
        internationalData={intlData.byCountry}
        hasForeignProjects={intlData.totalForeign > 0}
      />
    </div>
  )
}
