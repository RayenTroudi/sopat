import Link from 'next/link'
import { auth } from '@/lib/auth'
import {
  getDashboardKpis,
  getCachedRecentActivity,
  getCachedAtRiskProjects,
  getUpcomingVisits,
} from '@/lib/db/dashboard'
import { runEmailReminderSweep } from '@/lib/tasks/email-reminders'
import { getRseDashboardData } from '@/lib/db/rse'
import { getInternationalDashboardData } from '@/lib/db/international'
import { getSmqKpis } from '@/lib/db/kpi-smq'
import {
  getEtudesDashboardKpis,
  getRealisationDashboardKpis,
  getEntretienDashboardKpis,
  getRhDashboardKpis,
  type EtudesDashboardKpis,
  type RealisationDashboardKpis,
  type EntretienDashboardKpis,
  type RhDashboardKpis,
} from '@/lib/db/dashboard-dept'
import { MetricCard } from '@/components/dashboard/MetricCard'
import DeadlineAlertsPanel from '@/components/dashboard/DeadlineAlertsPanel'
import { getDeadlineAlerts } from '@/lib/db/alerts'
import { MiniPie } from '@/components/dashboard/MiniPie'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { AtRiskTable } from '@/components/dashboard/AtRiskTable'
import { DashboardTabs } from '@/components/dashboard/DashboardTabs'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import type { UserRole } from '@/lib/auth-utils'
import {
  FolderOpen, Clock, TrendingUp, AlertTriangle, CheckCircle2,
  CalendarDays, Star, Handshake, CalendarClock, ArrowRight, CalendarX,
  BookOpen, Leaf, Layers, FlaskConical, ClipboardList, FileText,
  ShoppingCart, HardHat, Users, UserPlus, GraduationCap, CalendarCheck,
  Wrench, Package,
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

const PROJECT_TYPE_LABELS: Record<string, string> = {
  residential: 'Résidentiel', commercial: 'Commercial', public: 'Public',
  industrial: 'Industriel', hotel: 'Hôtelier', sports: 'Sportif',
  educational: 'Éducatif', mixed: 'Mixte',
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  conge_annuel: 'Congé annuel', conge_maladie: 'Maladie', conge_maternite: 'Maternité',
  conge_sans_solde: 'Sans solde', conge_exceptionnel: 'Exceptionnel', autre: 'Autre',
}

const LEAVE_STATUS_LABELS: Record<string, string> = {
  en_attente: 'En attente', approuve: 'Approuvé', refuse: 'Refusé',
}

// ─── Shared layout helpers ─────────────────────────────────────────────────────

function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>{title}</h1>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
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

function ProjectsTable({ projects, linkBase }: {
  projects: Array<{ id: string; name: string; clientName: string | null; projectType: string }>
  linkBase: string
}) {
  if (projects.length === 0) return (
    <EmptyState icon={FolderOpen} title="Aucun projet actif" description="Aucun projet en cours dans ce département." iconColor="#2F6F4F" />
  )
  return (
    <table className="w-full text-sm">
      <thead>
        <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
          {['Projet', 'Client', 'Type', ''].map((h) => (
            <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {projects.map((p) => (
          <tr key={p.id} className="hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
            <td className="px-4 py-3">
              <span className="font-medium text-[13px]" style={{ color: 'var(--admin-text)' }}>{p.name}</span>
            </td>
            <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>{p.clientName ?? '—'}</td>
            <td className="px-4 py-3">
              <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)' }}>
                {PROJECT_TYPE_LABELS[p.projectType] ?? p.projectType}
              </span>
            </td>
            <td className="px-4 py-3">
              <Link href={`/admin/projects/${p.id}/${linkBase}`} className="text-[12px] hover:underline" style={{ color: 'var(--admin-emerald)' }}>
                Voir →
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── Études dashboard ──────────────────────────────────────────────────────────

function EtudesDashboard({ data }: { data: EtudesDashboardKpis }) {
  const stats = [
    { label: 'Projets en études', value: data.projectsInEtudes, icon: FolderOpen, accent: 'green' as const },
    { label: 'Fiches de suivi', value: data.studyRecordsCount, icon: FileText, accent: 'blue' as const },
    { label: 'NC ouvertes (ET)', value: data.openNcsEtudes, icon: AlertTriangle, accent: data.openNcsEtudes > 0 ? 'amber' as const : 'green' as const },
  ]

  const quickLinks = [
    { href: '/admin/etude/study-register', icon: BookOpen, title: 'Registre de suivi', desc: 'FOR-ET-01 — Fiches projets' },
    { href: '/admin/etude/project-articles', icon: ClipboardList, title: 'Articles par projet', desc: 'FOR-ET-06 — Palette végétale' },
    { href: '/admin/etude/plant-species', icon: Leaf, title: 'Palette végétale', desc: 'LIS-ET-02/03' },
    { href: '/admin/etude/decorative-materials', icon: Layers, title: 'Matières décoratives', desc: 'FOR-ET-03' },
    { href: '/admin/etude/phytosanitary', icon: FlaskConical, title: 'Produits phytosanitaires', desc: 'FOR-ET-05' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <MetricCard key={s.label} icon={s.icon} title={s.label} value={s.value} accent={s.accent} />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {quickLinks.map((l) => {
          const Icon = l.icon
          return (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-start gap-3 p-4 rounded-xl border transition-opacity hover:opacity-80"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
            >
              <div className="p-2 rounded-lg shrink-0 mt-0.5" style={{ background: 'var(--admin-emerald)', opacity: 0.85 }}>
                <Icon size={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{l.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{l.desc}</p>
              </div>
            </Link>
          )
        })}
      </div>

      <Section
        title={`Projets en phase Études (${data.activeProjects.length})`}
        action={
          <Button variant="ghost" size="sm" asChild style={{ color: 'var(--admin-text-muted)' }}>
            <Link href="/admin/projects">Tous les projets <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
          </Button>
        }
      >
        <ProjectsTable projects={data.activeProjects} linkBase="etudes" />
      </Section>
    </div>
  )
}

// ─── Réalisation dashboard ─────────────────────────────────────────────────────

function RealisationDashboard({ data }: { data: RealisationDashboardKpis }) {
  const FMT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

  const stats = [
    { label: 'Chantiers en cours', value: data.projectsInRealisation, icon: HardHat, accent: 'green' as const },
    { label: 'Bons de commande ce mois', value: data.purchaseOrdersThisMonth, icon: ShoppingCart, accent: 'blue' as const },
    { label: 'NC ouvertes (RE)', value: data.openNcsRealisation, icon: AlertTriangle, accent: data.openNcsRealisation > 0 ? 'amber' as const : 'green' as const },
  ]

  const quickLinks = [
    { href: '/admin/realisation', icon: ClipboardList, title: 'Registre de réalisation', desc: 'Tous les chantiers' },
    { href: '/admin/realisation/weekly-schedule', icon: CalendarDays, title: 'Planning hebdomadaire', desc: 'Semaine en cours' },
    { href: '/admin/nc', icon: AlertTriangle, title: 'Non-conformités', desc: 'Suivi CAPA' },
    { href: '/admin/suppliers', icon: Package, title: 'Fournisseurs', desc: 'Gestion des achats' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <MetricCard key={s.label} icon={s.icon} title={s.label} value={s.value} accent={s.accent} />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quickLinks.map((l) => {
          const Icon = l.icon
          return (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-start gap-3 p-4 rounded-xl border transition-opacity hover:opacity-80"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
            >
              <div className="p-2 rounded-lg shrink-0 mt-0.5" style={{ background: 'var(--admin-emerald)', opacity: 0.85 }}>
                <Icon size={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{l.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{l.desc}</p>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section
          title={`Chantiers actifs (${data.activeProjects.length})`}
          action={
            <Button variant="ghost" size="sm" asChild style={{ color: 'var(--admin-text-muted)' }}>
              <Link href="/admin/projects">Voir tous <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
            </Button>
          }
        >
          <ProjectsTable projects={data.activeProjects} linkBase="realisation" />
        </Section>

        <Section title="Derniers bons de commande">
          {data.recentPurchaseOrders.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="Aucun bon de commande" description="Aucun achat ce mois-ci." iconColor="#2F6F4F" />
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
              {data.recentPurchaseOrders.map((po) => (
                <div key={po.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: 'var(--admin-text)' }}>{po.itemDescription}</p>
                    <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                      {po.projectName ?? '—'} · {new Date(po.purchaseDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span className="text-[12px] font-medium tabular-nums shrink-0" style={{ color: 'var(--admin-text)' }}>
                    {FMT.format(Number(po.totalCost))} TND
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

// ─── Entretien dashboard ───────────────────────────────────────────────────────

function EntretienDashboard({ data }: { data: EntretienDashboardKpis }) {
  const stats = [
    { label: 'Projets en entretien', value: data.projectsInEntretien, icon: Wrench, accent: 'green' as const },
    {
      label: 'Visites ce mois',
      value: `${data.visitsThisMonth.completed} / ${data.visitsThisMonth.scheduled}`,
      icon: CalendarCheck,
      subtitle: `${data.visitsThisMonth.scheduled} contrats actifs`,
      accent: data.visitsThisMonth.completed >= data.visitsThisMonth.scheduled ? 'green' as const : 'amber' as const,
    },
    { label: 'NC ouvertes (MI)', value: data.openNcsEntretien, icon: AlertTriangle, accent: data.openNcsEntretien > 0 ? 'amber' as const : 'green' as const },
  ]

  const quickLinks = [
    { href: '/admin/calendrier-entretien', icon: CalendarDays, title: 'Calendrier de maintenance', desc: 'Planning des visites' },
    { href: '/admin/nc', icon: AlertTriangle, title: 'Non-conformités', desc: 'Suivi CAPA entretien' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <MetricCard key={s.label} icon={s.icon} title={s.label} value={s.value} subtitle={s.subtitle} accent={s.accent} />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quickLinks.map((l) => {
          const Icon = l.icon
          return (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-start gap-3 p-4 rounded-xl border transition-opacity hover:opacity-80"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
            >
              <div className="p-2 rounded-lg shrink-0 mt-0.5" style={{ background: 'var(--admin-emerald)', opacity: 0.85 }}>
                <Icon size={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{l.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{l.desc}</p>
              </div>
            </Link>
          )
        })}
      </div>

      <Section
        title="Visites prévues — 7 prochains jours"
        action={
          <Button variant="ghost" size="sm" asChild style={{ color: 'var(--admin-text-muted)' }}>
            <Link href="/admin/calendrier-entretien">Calendrier <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
          </Button>
        }
      >
        {data.upcomingVisits.length === 0 ? (
          <EmptyState icon={CalendarX} title="Aucune visite planifiée" description="Pas de visite dans les 7 prochains jours." iconColor="#2F6F4F" />
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
            {data.upcomingVisits.map((v) => {
              const dayDiff = Math.ceil((new Date(v.visitDate).getTime() - Date.now()) / 86400000)
              return (
                <div key={v.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="shrink-0 w-10 text-center">
                    <p className="text-sm font-bold tabular-nums leading-none" style={{ color: dayDiff <= 1 ? 'var(--admin-amber)' : 'var(--admin-text)' }}>
                      {new Date(v.visitDate).getDate()}
                    </p>
                    <p className="text-[10px] uppercase mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                      {new Date(v.visitDate).toLocaleDateString('fr-FR', { month: 'short' })}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: 'var(--admin-text)' }}>{v.projectName ?? '—'}</p>
                    <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                      {VISIT_TYPE_LABELS[v.visitType] ?? v.visitType}
                      {v.teamMemberName ? ` · ${v.teamMemberName}` : ''}
                    </p>
                  </div>
                  <span className="text-[11px] font-medium shrink-0" style={{ color: dayDiff <= 1 ? 'var(--admin-amber)' : 'var(--admin-text-muted)' }}>
                    {dayDiff <= 0 ? 'Auj.' : dayDiff === 1 ? 'Dem.' : `J+${dayDiff}`}
                  </span>
                  <Link href={`/admin/projects/${v.projectId}?tab=entretien`} className="text-[11px] hover:underline shrink-0" style={{ color: 'var(--admin-text-muted)' }}>→</Link>
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}

// ─── RH dashboard ─────────────────────────────────────────────────────────────

function RhDashboard({ data }: { data: RhDashboardKpis }) {
  const stats = [
    { label: 'Effectif actif', value: data.totalEmployees, icon: Users, accent: 'green' as const },
    { label: 'Congés en attente', value: data.pendingLeaves, icon: CalendarDays, accent: data.pendingLeaves > 0 ? 'amber' as const : 'green' as const },
    { label: 'Recrutements ouverts', value: data.pendingRecruitment, icon: UserPlus, accent: data.pendingRecruitment > 0 ? 'blue' as const : 'muted' as const },
  ]

  const quickLinks = [
    { href: '/admin/rh/employees', icon: Users, title: 'Employés', desc: 'Dossiers du personnel' },
    { href: '/admin/rh/leaves', icon: CalendarDays, title: 'Congés', desc: 'Demandes en attente' },
    { href: '/admin/rh/recruitment', icon: UserPlus, title: 'Recrutement', desc: 'FOR-RH-01' },
    { href: '/admin/rh/training', icon: GraduationCap, title: 'Formations', desc: 'PLA-RH-02' },
    { href: '/admin/rh/performance', icon: Star, title: 'Évaluation', desc: 'Bilans annuels' },
    { href: '/admin/rh/attendance', icon: CalendarCheck, title: 'Pointage', desc: 'Feuilles de présence' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <MetricCard key={s.label} icon={s.icon} title={s.label} value={s.value} accent={s.accent} />
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {quickLinks.map((l) => {
          const Icon = l.icon
          return (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-start gap-3 p-4 rounded-xl border transition-opacity hover:opacity-80"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
            >
              <div className="p-2 rounded-lg shrink-0 mt-0.5" style={{ background: 'var(--admin-emerald)', opacity: 0.85 }}>
                <Icon size={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{l.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{l.desc}</p>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Congés récents">
          {data.recentLeaves.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Aucune demande" description="Aucune demande de congé récente." iconColor="#2F6F4F" />
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
              {data.recentLeaves.map((l) => {
                const statusColor = l.status === 'approuve' ? 'var(--admin-emerald)' : l.status === 'refuse' ? 'var(--admin-red)' : 'var(--admin-amber)'
                return (
                  <div key={l.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: 'var(--admin-text)' }}>
                        {l.employeeName ?? '—'}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                        {LEAVE_TYPE_LABELS[l.leaveType] ?? l.leaveType} · {l.startDate} → {l.endDate}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold shrink-0" style={{ color: statusColor }}>
                      {LEAVE_STATUS_LABELS[l.status] ?? l.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        <Section title="Formations à venir">
          {data.upcomingTrainings.length === 0 ? (
            <EmptyState icon={GraduationCap} title="Aucune formation planifiée" description="Aucune formation à venir." iconColor="#2F6F4F" />
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
              {data.upcomingTrainings.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: 'var(--admin-text)' }}>{t.theme}</p>
                    <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                      {t.plannedStartDate ?? 'Date à définir'} · {t.participantCount} participant{t.participantCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Link href="/admin/rh/training" className="text-[11px] hover:underline shrink-0" style={{ color: 'var(--admin-text-muted)' }}>→</Link>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default async function AdminDashboard() {
  runEmailReminderSweep().catch((e) => console.error('[reminder sweep]', e))

  const session = await auth()
  const role = (session?.user as any)?.role as UserRole | undefined

  // Department-specific dashboards
  if (role === 'etudes_chef' || role === 'etudes_team') {
    const data = await getEtudesDashboardKpis()
    return (
      <div className="space-y-5 max-w-[1400px]">
        <PageHeader
          title="Tableau de bord — Études"
          subtitle="INS-ET-01 / PRS-ET-01"
          action={
            <Link href="/admin/etude" className="text-xs px-3 py-1.5 font-medium transition-colors" style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)', borderRadius: '6px' }}>
              Vue Études →
            </Link>
          }
        />
        <EtudesDashboard data={data} />
      </div>
    )
  }

  if (role === 'realisation_chef' || role === 'realisation_team') {
    const data = await getRealisationDashboardKpis()
    return (
      <div className="space-y-5 max-w-[1400px]">
        <PageHeader
          title="Tableau de bord — Réalisation"
          subtitle="Chantiers en cours · Achats · NC"
          action={
            <Link href="/admin/realisation" className="text-xs px-3 py-1.5 font-medium transition-colors" style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)', borderRadius: '6px' }}>
              Registre →
            </Link>
          }
        />
        <RealisationDashboard data={data} />
      </div>
    )
  }

  if (role === 'entretien_chef' || role === 'entretien_team') {
    const data = await getEntretienDashboardKpis()
    return (
      <div className="space-y-5 max-w-[1400px]">
        <PageHeader
          title="Tableau de bord — Entretien"
          subtitle="Maintenance · Visites · NC"
          action={
            <Link href="/admin/calendrier-entretien" className="text-xs px-3 py-1.5 font-medium transition-colors" style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)', borderRadius: '6px' }}>
              Calendrier →
            </Link>
          }
        />
        <EntretienDashboard data={data} />
      </div>
    )
  }

  if (role === 'rh_manager' || role === 'rh_agent') {
    const data = await getRhDashboardKpis()
    return (
      <div className="space-y-5 max-w-[1400px]">
        <PageHeader
          title="Tableau de bord — Ressources Humaines"
          subtitle="Effectif · Congés · Formations · Recrutement"
          action={
            <Link href="/admin/rh/employees" className="text-xs px-3 py-1.5 font-medium transition-colors" style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)', borderRadius: '6px' }}>
              Employés →
            </Link>
          }
        />
        <RhDashboard data={data} />
      </div>
    )
  }

  // ── Admin / Direction — full dashboard ──────────────────────────────────────
  const currentYear = new Date().getFullYear()
  const [kpis, activity, atRisk, upcomingVisits, rseData, intlData, smqKpis, deadlineAlerts] = await Promise.all([
    getDashboardKpis(),
    getCachedRecentActivity(20),
    getCachedAtRiskProjects(),
    getUpcomingVisits(7),
    getRseDashboardData(),
    getInternationalDashboardData(),
    getSmqKpis(currentYear),
    getDeadlineAlerts(),
  ])

  const { activeProjects, onTimeDeliveryRate, avgBudgetVariance, openNcs, ncSlaClosureRate, maintenanceThisMonth, satisfactionScore } = kpis

  const phasePieData = [
    { name: 'Études',      value: activeProjects.byPhase.etudes,      color: '#2D5A27' },
    { name: 'Réalisation', value: activeProjects.byPhase.realisation,  color: '#D97706' },
    { name: 'Entretien',   value: activeProjects.byPhase.entretien,    color: '#2563EB' },
  ]

  const varianceAccent = avgBudgetVariance === null ? 'muted'
    : avgBudgetVariance > 10 ? 'red'
    : avgBudgetVariance > 0  ? 'amber'
    : 'green'

  const mainDashboard = (
    <div className="space-y-5">
      <DeadlineAlertsPanel alerts={deadlineAlerts} />
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
            <Link href="/admin/rse/partnerships" className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>
              Voir les partenariats →
            </Link>
          </div>
        </div>
      )}

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
                <Link href="/admin/rse/partnerships?status=actif" className="text-xs font-medium shrink-0" style={{ color: 'var(--admin-red)' }}>
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
                    <div key={v.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="shrink-0 w-10 text-center">
                        <p className="text-sm font-bold tabular-nums leading-none" style={{ color: urgent ? 'var(--admin-amber)' : 'var(--admin-text)' }}>
                          {new Date(v.visitDate).getDate()}
                        </p>
                        <p className="text-[10px] uppercase mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                          {new Date(v.visitDate).toLocaleDateString('fr-FR', { month: 'short' })}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--admin-text)' }}>{v.projectName ?? '—'}</p>
                        <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                          {VISIT_TYPE_LABELS[v.visitType] ?? v.visitType}
                          {v.teamMemberName ? ` · ${v.teamMemberName}` : ''}
                          {v.durationHours ? ` · ${v.durationHours}h` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-medium" style={{ color: urgent ? 'var(--admin-amber)' : 'var(--admin-text-muted)' }}>
                          {dayDiff <= 0 ? 'Auj.' : dayDiff === 1 ? 'Dem.' : `J+${dayDiff}`}
                        </span>
                        <Link href={`/admin/projects/${v.projectId}?tab=entretien`} className="text-[11px] hover:underline" style={{ color: 'var(--admin-text-muted)' }}>→</Link>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>Tableau de bord</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>ISO 9001:2015 · Temps réel</p>
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
        smqKpis={smqKpis}
        smqYear={currentYear}
      />
    </div>
  )
}
