import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRseDashboardData } from '@/lib/db/rse-dashboard'
import {
  Recycle, Trees, Users, CalendarCheck, Handshake, ClipboardList,
  Droplets, MapPin, TrendingUp, GraduationCap, Shield, Award,
  BarChart2, Leaf, Waves, Eye, type LucideIcon,
} from 'lucide-react'
import {
  WasteYearlyChart, TreesYearlyChart, EventsByTypeChart, ParticipantsTrendChart,
  WasteByTypeChart, WasteMonthlyChart, TrainingByYearChart, LeaveByTypeChart,
  PartnersByTypeChart, BeachCleanedChart,
} from '@/components/rse/RseDashboardCharts'
import { RseExportButton } from '@/components/rse/RseExportButton'

export const dynamic = 'force-dynamic'

const EVENT_TYPE_LABELS: Record<string, string> = {
  nettoyage_plage:       'Nettoyage de plage',
  plantation:            'Plantation',
  sensibilisation:       'Sensibilisation',
  team_building:         'Team building',
  journee_environnement: 'Journée environnement',
  autre:                 'Autre',
}

const PARTNER_TYPE_LABELS: Record<string, string> = {
  hotel:        'Hôtel',
  municipalite: 'Municipalité',
  entreprise:   'Entreprise',
  institution:  'Institution',
  autre:        'Autre',
}

function fmtNum(n: number, dec = 0) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function fmtDate(d: Date | string | null): string {
  if (!d) return ''
  const dt = typeof d === 'string' ? new Date(d) : d
  return dt.toLocaleDateString('fr-FR')
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color, dim, icon: Icon,
}: {
  label: string; value: string; sub?: string
  color: string; dim: string; icon: LucideIcon
}) {
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-2"
      style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: dim }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-2xl font-bold tracking-tight" style={{ color }}>{value}</p>
      <div>
        {sub && <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{sub}</p>}
        <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--admin-text)' }}>{label}</p>
      </div>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon, label, color, description,
}: {
  icon: LucideIcon; label: string; color: string; description?: string
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${color}18` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <h2 className="text-base font-semibold" style={{ color: 'var(--admin-text)' }}>{label}</h2>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{description}</p>
        )}
      </div>
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressRow({ label, value, max, color, unit = '' }: {
  label: string; value: number; max: number; color: string; unit?: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: 'var(--admin-text)' }}>{label}</span>
        <span className="font-semibold tabular-nums" style={{ color }}>{fmtNum(value)}{unit}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--admin-bg)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ─── Stat row ─────────────────────────────────────────────────────────────────

function StatRow({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--admin-border)' }}>
      <span className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold tabular-nums" style={{ color: color ?? 'var(--admin-text)' }}>{value}</span>
        {sub && <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{sub}</p>}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RseImpactPage() {
  const session = await auth()
  if (!session) redirect('/auth/login')

  const data = await getRseDashboardData()
  const { meta, environmental, social, partnerships, locations, recentEvents } = data

  const EMERALD = '#1C7A48'
  const BLUE    = '#2563EB'
  const AMBER   = '#B8870A'
  const TEAL    = '#0D9488'
  const VIOLET  = '#7C3AED'

  return (
    <div className="p-6 space-y-8 max-w-[1600px]" id="rse-impact-printable">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Leaf className="w-5 h-5" style={{ color: EMERALD }} />
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
              Tableau de bord Impact RSE
            </h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Indicateurs environnementaux, sociaux et de gouvernance — Rapport {meta.reportYear}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {meta.rseLabelLevel && (
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: `${EMERALD}18`, color: EMERALD }}
            >
              Label RSE {meta.rseLabelLevel}
            </span>
          )}
          {meta.isoCertNumber && (
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: `${BLUE}12`, color: BLUE }}
            >
              ISO {meta.isoCertNumber}
            </span>
          )}
          <RseExportButton year={meta.reportYear} />
        </div>
      </div>

      {/* ── Top KPI Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Déchets collectés" value={`${fmtNum(environmental.totalWasteKg, 1)} kg`}
          sub="événements RSE" color={EMERALD} dim={`${EMERALD}18`} icon={Recycle}
        />
        <KpiCard
          label="Arbres plantés" value={fmtNum(environmental.totalTrees)}
          sub="événements RSE" color={TEAL} dim={`${TEAL}18`} icon={Trees}
        />
        <KpiCard
          label="Participants RSE" value={fmtNum(environmental.totalParticipants)}
          sub="événements clôturés" color={BLUE} dim={`${BLUE}12`} icon={Users}
        />
        <KpiCard
          label="Événements réalisés" value={fmtNum(environmental.completedEvents)}
          sub={`/ ${fmtNum(environmental.totalEvents)} total`} color={VIOLET} dim={`${VIOLET}12`} icon={CalendarCheck}
        />
        <KpiCard
          label="Partenariats actifs" value={fmtNum(partnerships.activePartnerships)}
          sub={`${fmtNum(partnerships.totalPartnerships)} total`} color={AMBER} dim={`${AMBER}18`} icon={Handshake}
        />
        <KpiCard
          label="Engagements respectés" value={`${fmtNum(partnerships.fulfillmentRate)}%`}
          sub={`${partnerships.fulfilledCommitments} / ${partnerships.totalCommitments}`}
          color={EMERALD} dim={`${EMERALD}18`} icon={ClipboardList}
        />
      </div>

      {/* ══ PILIER ENVIRONNEMENTAL ══ */}
      <section>
        <SectionHeader
          icon={Leaf} label="Pilier Environnemental" color={EMERALD}
          description="Impact environnemental direct des actions RSE et des projets d'aménagement"
        />

        {/* Key environmental metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Plage nettoyée', value: `${fmtNum(environmental.totalBeachCleanedM, 1)} m`, icon: Waves, color: TEAL },
            { label: 'Zones traitées', value: fmtNum(environmental.totalZonesTreated), icon: MapPin, color: EMERALD },
            { label: 'Portée sociale', value: fmtNum(environmental.totalSocialMediaReach), icon: Eye, color: BLUE },
            { label: 'Score satisfaction', value: environmental.avgSatisfaction != null ? `${fmtNum(environmental.avgSatisfaction, 1)}/10` : '—', icon: TrendingUp, color: AMBER },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-xl border p-4 flex items-center gap-3"
              style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}14` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums" style={{ color }}>{value}</p>
                <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Yearly trends charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <WasteYearlyChart data={environmental.yearlyTrends} />
          <TreesYearlyChart data={environmental.yearlyTrends} />
          <ParticipantsTrendChart data={environmental.yearlyTrends} />
          <BeachCleanedChart data={environmental.yearlyTrends} />
        </div>

        {/* Internal waste tracking + event types */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <WasteByTypeChart data={environmental.wasteByType} />
          <WasteMonthlyChart data={environmental.wasteMonthlyCurrent} year={meta.reportYear} />
        </div>

        {/* Events by type + green projects */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <EventsByTypeChart data={environmental.eventsByType} />

          {/* Green infrastructure panel */}
          <div
            className="rounded-xl border p-5"
            style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
          >
            <div className="mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                Infrastructure verte — Projets d'aménagement
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                Végétaux intégrés dans les projets SOPAT
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div
                  className="flex-1 rounded-xl p-4 text-center"
                  style={{ background: `${TEAL}12` }}
                >
                  <p className="text-3xl font-bold" style={{ color: TEAL }}>{fmtNum(environmental.totalTreesInProjects)}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>Arbres & palmiers</p>
                </div>
                <div
                  className="flex-1 rounded-xl p-4 text-center"
                  style={{ background: `${EMERALD}12` }}
                >
                  <p className="text-3xl font-bold" style={{ color: EMERALD }}>{fmtNum(environmental.totalPlantsInProjects)}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>Total végétaux</p>
                </div>
              </div>
              <div
                className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: `${AMBER}10` }}
              >
                <BarChart2 className="w-5 h-5 shrink-0" style={{ color: AMBER }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                    Investissement événements RSE
                  </p>
                  <p className="text-xl font-bold tabular-nums mt-0.5" style={{ color: AMBER }}>
                    {fmtNum(environmental.totalEventInvestment, 3)} TND
                  </p>
                </div>
              </div>
              {environmental.mediaCoverageCount > 0 && (
                <StatRow label="Événements avec couverture média" value={fmtNum(environmental.mediaCoverageCount)} />
              )}
              {environmental.totalPressArticles > 0 && (
                <StatRow label="Articles de presse" value={fmtNum(environmental.totalPressArticles)} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══ PILIER SOCIAL ══ */}
      <section>
        <SectionHeader
          icon={Users} label="Pilier Social" color={BLUE}
          description="Capital humain, formation, bien-être et conformité au travail"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

          {/* HR KPIs */}
          <div
            className="rounded-xl border p-5"
            style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
          >
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>Effectifs & Organisation</h3>
            <div className="space-y-1">
              <StatRow label="Employés actifs" value={fmtNum(social.totalActiveEmployees)} color={BLUE} />
              <StatRow label="Auditeurs internes qualifiés" value={fmtNum(social.internalAuditorsCount)} />
              <StatRow label="Taux de conformité HSE" value={social.hseComplianceRate != null ? `${fmtNum(social.hseComplianceRate)}%` : 'N/D'} color={social.hseComplianceRate && social.hseComplianceRate >= 80 ? EMERALD : AMBER} />
              <StatRow label="Vérifications HSE réalisées" value={fmtNum(social.hseSubmissionsCount)} />
              <StatRow label="NC clôturées" value={`${fmtNum(social.ncsClosedRate)}%`} sub={`${social.closedNcs} / ${social.totalNcs} non-conformités`} color={social.ncsClosedRate >= 80 ? EMERALD : AMBER} />
            </div>

            {/* Gauge-style progress */}
            <div className="mt-5 space-y-3">
              {social.hseComplianceRate != null && (
                <ProgressRow
                  label="Conformité HSE" value={social.hseComplianceRate} max={100}
                  color={social.hseComplianceRate >= 80 ? EMERALD : AMBER} unit="%"
                />
              )}
              <ProgressRow
                label="NC clôturées" value={social.ncsClosedRate} max={100}
                color={social.ncsClosedRate >= 80 ? EMERALD : AMBER} unit="%"
              />
              <ProgressRow
                label="Présence formations" value={social.trainingCompletion} max={100}
                color={BLUE} unit="%"
              />
            </div>
          </div>

          {/* Training KPIs */}
          <div
            className="rounded-xl border p-5"
            style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-4 h-4" style={{ color: BLUE }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Formation & Développement</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Sessions', value: fmtNum(social.trainingSessions), color: BLUE },
                { label: 'Participants', value: fmtNum(social.trainingParticipants), color: TEAL },
                { label: 'Présence', value: `${fmtNum(social.trainingCompletion)}%`, color: EMERALD },
                { label: 'Score moyen', value: social.avgHotEvalScore != null ? fmtNum(social.avgHotEvalScore, 1) : '—', color: AMBER },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="rounded-lg p-3 text-center"
                  style={{ background: `${color}10` }}
                >
                  <p className="text-xl font-bold" style={{ color }}>{value}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Leave stats */}
          <div
            className="rounded-xl border p-5"
            style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4" style={{ color: VIOLET }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Bien-être & Congés</h3>
            </div>
            <div
              className="rounded-xl p-4 text-center mb-4"
              style={{ background: `${VIOLET}10` }}
            >
              <p className="text-3xl font-bold" style={{ color: VIOLET }}>{fmtNum(social.totalLeaveDays, 1)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>Jours de congé approuvés (total)</p>
            </div>
            <div className="space-y-1">
              {social.leaveByType.slice(0, 5).map((lt) => {
                const labels: Record<string, string> = {
                  conge_annuel: 'Annuel', conge_maladie: 'Maladie',
                  conge_maternite: 'Maternité', conge_paternite: 'Paternité',
                  conge_sans_solde: 'Sans solde', jour_ferie: 'Jour férié', autre: 'Autre',
                }
                return (
                  <StatRow
                    key={lt.leaveType}
                    label={labels[lt.leaveType] ?? lt.leaveType}
                    value={`${fmtNum(lt.totalDays, 1)} j`}
                    sub={`${lt.count} demande(s)`}
                  />
                )
              })}
            </div>
          </div>
        </div>

        {/* Training + Leave charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TrainingByYearChart data={social.trainingByYear} />
          <LeaveByTypeChart data={social.leaveByType} />
        </div>
      </section>

      {/* ══ PILIER PARTENARIATS ══ */}
      <section>
        <SectionHeader
          icon={Handshake} label="Pilier Partenariats & Communauté" color={AMBER}
          description="Partenariats institutionnels, engagements contractuels et rayonnement communautaire"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Partnership KPIs */}
          <div
            className="rounded-xl border p-5"
            style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
          >
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>Partenariats</h3>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: 'Actifs', value: fmtNum(partnerships.activePartnerships), color: EMERALD },
                { label: 'Total', value: fmtNum(partnerships.totalPartnerships), color: AMBER },
                { label: 'Respectés', value: `${fmtNum(partnerships.fulfillmentRate)}%`, color: TEAL },
                { label: 'En retard', value: fmtNum(partnerships.overdueCommitments), color: '#DC2626' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="rounded-lg p-3 text-center"
                  style={{ background: `${color}10` }}
                >
                  <p className="text-xl font-bold" style={{ color }}>{value}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
                </div>
              ))}
            </div>
            <ProgressRow label="Engagements respectés" value={partnerships.fulfillmentRate} max={100} color={AMBER} unit="%" />
          </div>

          {/* Top partners */}
          <div
            className="rounded-xl border p-5 lg:col-span-2"
            style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4" style={{ color: AMBER }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Partenaires actifs</h3>
            </div>
            {partnerships.topPartners.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--admin-text-muted)' }}>
                Aucun partenariat actif
              </p>
            ) : (
              <div className="space-y-1">
                {partnerships.topPartners.map((p) => (
                  <div
                    key={p.partnerName}
                    className="flex items-center justify-between py-2.5 border-b last:border-0"
                    style={{ borderColor: 'var(--admin-border)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: AMBER }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>{p.partnerName}</span>
                    </div>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: `${AMBER}14`, color: AMBER }}
                    >
                      {PARTNER_TYPE_LABELS[p.partnerType] ?? p.partnerType}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PartnersByTypeChart data={partnerships.partnersByType} />

          {/* Commitment progress */}
          <div
            className="rounded-xl border p-5"
            style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
          >
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>
              Suivi des engagements
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Respectés', value: partnerships.fulfilledCommitments, color: EMERALD },
                  { label: 'En retard', value: partnerships.overdueCommitments, color: '#DC2626' },
                  { label: 'À venir', value: Math.max(0, partnerships.totalCommitments - partnerships.fulfilledCommitments - partnerships.overdueCommitments), color: BLUE },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center rounded-lg p-3" style={{ background: `${color}10` }}>
                    <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
                  </div>
                ))}
              </div>
              <ProgressRow
                label="Taux de réalisation"
                value={partnerships.fulfillmentRate}
                max={100}
                color={partnerships.fulfillmentRate >= 80 ? EMERALD : AMBER}
                unit="%"
              />
              <p className="text-xs pt-1" style={{ color: 'var(--admin-text-muted)' }}>
                Total : {fmtNum(partnerships.totalCommitments)} engagement(s) contractuel(s)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ RÉPARTITION GÉOGRAPHIQUE ══ */}
      {locations.length > 0 && (
        <section>
          <SectionHeader icon={MapPin} label="Répartition Géographique" color={TEAL} />
          <div
            className="rounded-xl border overflow-hidden"
            style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                  {['Lieu', 'Événements', 'Participants', 'Déchets collectés (kg)'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--admin-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {locations.map((row, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: '1px solid var(--admin-border)' }}
                    className="hover:bg-[var(--admin-bg)] transition-colors"
                  >
                    <td className="px-5 py-3 font-medium" style={{ color: 'var(--admin-text)' }}>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: TEAL }} />
                        {row.location}
                      </div>
                    </td>
                    <td className="px-5 py-3 tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>{fmtNum(row.eventCount)}</td>
                    <td className="px-5 py-3 tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>{fmtNum(row.totalParticipants)}</td>
                    <td className="px-5 py-3 tabular-nums font-medium" style={{ color: EMERALD }}>{fmtNum(row.totalWasteKg, 1)} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ══ ÉVÉNEMENTS RÉCENTS ══ */}
      {recentEvents.length > 0 && (
        <section>
          <SectionHeader icon={CalendarCheck} label="Derniers Événements RSE" color={VIOLET} />
          <div
            className="rounded-xl border overflow-hidden"
            style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                  {['Événement', 'Date', 'Type', 'Participants', 'Déchets (kg)', 'Arbres'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--admin-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((evt, i) => (
                  <tr
                    key={evt.id}
                    style={{ borderBottom: '1px solid var(--admin-border)' }}
                    className="hover:bg-[var(--admin-bg)] transition-colors"
                  >
                    <td className="px-5 py-3 font-medium max-w-[240px]" style={{ color: 'var(--admin-text)' }}>
                      <span className="line-clamp-1">{evt.title}</span>
                    </td>
                    <td className="px-5 py-3 tabular-nums whitespace-nowrap" style={{ color: 'var(--admin-text-muted)' }}>
                      {fmtDate(evt.date)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: `${VIOLET}12`, color: VIOLET }}
                      >
                        {EVENT_TYPE_LABELS[evt.eventType] ?? evt.eventType}
                      </span>
                    </td>
                    <td className="px-5 py-3 tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>
                      {evt.participants != null ? fmtNum(evt.participants) : '—'}
                    </td>
                    <td className="px-5 py-3 tabular-nums font-medium" style={{ color: EMERALD }}>
                      {evt.wasteKg != null ? `${fmtNum(evt.wasteKg, 1)} kg` : '—'}
                    </td>
                    <td className="px-5 py-3 tabular-nums" style={{ color: TEAL }}>
                      {evt.trees != null ? fmtNum(evt.trees) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  )
}
