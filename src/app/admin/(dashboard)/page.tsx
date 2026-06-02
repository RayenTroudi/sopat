import Link from 'next/link'
import { prisma } from '@/lib/db'
import { KpiCard, Badge } from '@/components/admin/ui'
import { tnd } from '@/lib/fmt'
import BudgetChart from '@/components/admin/BudgetChart'
import { STAGES, SHORT_STAGE_NAMES } from '@/lib/stages'

export const dynamic = 'force-dynamic'

async function getDashboardData() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const in7days = new Date(now.getTime() + 7 * 86400000)

  const [projects, alerts, recentActivity, upcomingMilestones, openIssues] = await Promise.all([
    prisma.project.findMany({
      include: {
        client: { select: { name: true } },
        budgetItems: true,
        costItems: true,
        timeEntries: true,
        invoices: { include: { payments: true } },
        overheadAllocs: true,
        milestones: true,
        tasks: { where: { status: { not: 'Done' } } },
      },
    }),
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/admin/alerts`, {
      cache: 'no-store',
    }).then(r => r.json()).then(d => d.data ?? []).catch(() => []),
    prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { project: { select: { name: true } } },
    }),
    prisma.milestone.findMany({
      where: { dueDate: { lte: in7days, gte: now }, status: { not: 'Completed' } },
      orderBy: { dueDate: 'asc' },
      take: 5,
      include: { project: { select: { name: true } } },
    }),
    prisma.issue.count({ where: { status: 'Open', severity: 'Critical' } }),
  ])

  const activeProjects = projects.filter(p => p.status === 'Active')
  const delayedProjects = projects.filter(p => p.endDate && new Date(p.endDate) < now && p.status === 'Active')

  const revenueThisMonth = projects.flatMap(p => p.invoices)
    .filter(i => i.status === 'Paid' && new Date(i.date) >= monthStart)
    .reduce((s, i) => s + i.amount, 0)

  const costsThisMonth = projects.flatMap(p => p.costItems)
    .filter(c => new Date(c.date) >= monthStart)
    .reduce((s, c) => s + c.amount, 0)

  const pendingInvoices = projects.flatMap(p => p.invoices).filter(i => i.status === 'Issued')
  const pendingTotal = pendingInvoices.reduce((s, i) => s + i.totalAmount, 0)

  const atRisk = projects.filter(p => {
    const budget = p.budgetItems.reduce((s, b) => s + b.plannedAmount, 0)
    const costs = p.costItems.reduce((s, c) => s + c.amount, 0) +
      p.timeEntries.reduce((s, t) => s + t.amount, 0)
    return budget > 0 && costs / budget > 0.8
  })

  // Stage distribution
  const stageDistribution: Record<number, number> = {}
  for (const p of projects.filter(p => p.status === 'Active')) {
    stageDistribution[p.stage] = (stageDistribution[p.stage] ?? 0) + 1
  }

  const top5 = projects.map(p => {
    const revenue = p.invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0)
    const costs = p.costItems.reduce((s, c) => s + c.amount, 0) +
      p.timeEntries.reduce((s, t) => s + t.amount, 0) +
      p.overheadAllocs.reduce((s, o) => s + o.amount, 0)
    const netProfit = revenue - costs
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0
    return { id: p.id, name: p.name, client: p.client.name, status: p.status, stage: p.stage, revenue, netProfit, margin }
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  const chartData = projects.slice(0, 8).map(p => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name,
    budget: p.budgetItems.reduce((s, b) => s + b.plannedAmount, 0),
    actual: p.costItems.reduce((s, c) => s + c.amount, 0) +
      p.timeEntries.reduce((s, t) => s + t.amount, 0),
  }))

  return {
    totalProjects: projects.length,
    activeCount: activeProjects.length,
    delayedCount: delayedProjects.length,
    revenueThisMonth,
    costsThisMonth,
    pendingCount: pendingInvoices.length,
    pendingTotal,
    atRiskCount: atRisk.length,
    openCriticalIssues: openIssues,
    top5,
    chartData,
    stageDistribution,
    alerts: (alerts as Array<{ type: string; category: string; projectId?: string; projectName?: string; message: string }>).slice(0, 5),
    recentActivity: JSON.parse(JSON.stringify(recentActivity)),
    upcomingMilestones: JSON.parse(JSON.stringify(upcomingMilestones)),
  }
}

function IconActive() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
}
function IconDelay() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}
function IconRevenue() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6" /></svg>
}
function IconPending() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v14l-3-2-2 2-2-2-2 2-2-2-3 2V6a2 2 0 012-2z" /></svg>
}
function IconRisk() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
}
function IconIssue() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
}

export default async function AdminDashboard() {
  const d = await getDashboardData()

  const marginStyle = (pct: number) => ({
    color: pct > 20 ? 'var(--admin-emerald)' : pct >= 5 ? 'var(--admin-amber)' : 'var(--admin-red)',
    fontFamily: 'var(--font-sans)',
  })

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1"
            style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}>
            SOPAT
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
            Tableau de bord
          </h1>
        </div>
        <div className="text-xs px-3 py-1.5 rounded-lg"
          style={{ background: 'var(--admin-card)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)', fontFamily: 'var(--font-sans)' }}>
          {new Date().toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* KPI row — 6 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <KpiCard label="Projets actifs" value={d.activeCount} accent="green" icon={<IconActive />} />
        <KpiCard label="En retard" value={d.delayedCount} accent="red" icon={<IconDelay />} />
        <KpiCard label="Revenus ce mois" value={tnd(d.revenueThisMonth)} accent="green" icon={<IconRevenue />} />
        <KpiCard label="Factures en attente" value={d.pendingCount} sub={tnd(d.pendingTotal)} accent="orange" icon={<IconPending />} />
        <KpiCard label="Projets à risque" value={d.atRiskCount} accent="red" icon={<IconRisk />} />
        <KpiCard label="Problèmes critiques" value={d.openCriticalIssues} accent="red" icon={<IconIssue />} />
      </div>

      {/* Pipeline des projets — 4 stages */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
              Pipeline des Projets
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
              {d.activeCount} projets actifs
            </p>
          </div>
          <Link href="/admin/projects/lifecycle"
            className="text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{ color: 'var(--admin-accent)', background: 'var(--admin-accent-dim)', fontFamily: 'var(--font-sans)' }}>
            Voir le pipeline complet →
          </Link>
        </div>
        <div className="px-5 py-4 space-y-3">
          {[1, 2, 3, 4].map(n => {
            const count = d.stageDistribution[n] ?? 0
            const maxCount = Math.max(1, ...Object.values(d.stageDistribution))
            const barPct = Math.round((count / maxCount) * 100)
            const color = STAGES[n].color
            return (
              <div key={n} className="flex items-center gap-3">
                <p className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)', width: 96 }}>
                  {SHORT_STAGE_NAMES[n]}
                </p>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--admin-border)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${barPct}%`, background: color }} />
                </div>
                <span className="text-xs font-semibold flex-shrink-0 tabular-nums"
                  style={{ color: count > 0 ? color : 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', width: 64, textAlign: 'right' }}>
                  {count} projet{count !== 1 ? 's' : ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Top 5 projects */}
        <div className="admin-card-shine lg:col-span-2 rounded-xl overflow-hidden"
          style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--admin-border)' }}>
            <div>
              <h3 className="font-semibold text-xs uppercase tracking-widest"
                style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
                Top 5 Projets
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
                classé par chiffre d&apos;affaires
              </p>
            </div>
            <Link href="/admin/projects"
              className="text-xs font-medium px-3 py-1.5 rounded-lg"
              style={{ color: 'var(--admin-accent)', background: 'var(--admin-accent-dim)', fontFamily: 'var(--font-sans)' }}>
              Voir tout →
            </Link>
          </div>
          <div className="overflow-x-auto admin-scroll">
            <table className="w-full" style={{ fontFamily: 'var(--font-sans)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['#', 'Projet', 'Client', 'Étape', 'Statut', 'Revenu', 'Marge'].map((h, i) => (
                    <th key={h} className="py-3 text-xs uppercase tracking-widest font-medium"
                      style={{ color: 'var(--admin-text-dim)', paddingLeft: i === 0 ? '1.25rem' : '1rem', paddingRight: i === 6 ? '1.25rem' : '1rem', textAlign: i >= 5 ? 'right' : 'left', letterSpacing: '0.08em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.top5.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
                      Aucun projet
                    </td>
                  </tr>
                )}
                {d.top5.map((p, idx) => (
                  <tr key={p.id} className="admin-tr transition-colors duration-100"
                    style={{ borderBottom: '1px solid var(--admin-border)', position: 'relative' }}>
                    <td className="py-3.5 pl-5 pr-4">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: idx === 0 ? 'var(--admin-accent-dim)' : 'var(--admin-border)', color: idx === 0 ? 'var(--admin-accent)' : 'var(--admin-text-dim)', display: 'inline-flex', fontFamily: 'var(--font-sans)' }}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Link href={`/admin/projects/${p.id}`}
                        className="font-medium text-sm after:absolute after:inset-0"
                        style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-sans)' }}>
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>{p.client}</td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: STAGES[p.stage]?.color + '20', color: STAGES[p.stage]?.color, fontFamily: 'var(--font-sans)' }}>
                        {SHORT_STAGE_NAMES[p.stage] ?? `Ét. ${p.stage}`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4"><Badge status={p.status} /></td>
                    <td className="py-3.5 px-4 text-right text-sm font-medium tabular-nums" style={{ color: 'var(--admin-text)' }}>
                      {tnd(p.revenue)}
                    </td>
                    <td className="py-3.5 pl-4 pr-5 text-right">
                      <span className="text-sm font-bold tabular-nums" style={marginStyle(p.margin)}>
                        {p.margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: Alerts + Upcoming milestones */}
        <div className="space-y-5">
          {/* Alerts */}
          <div className="admin-card-shine rounded-xl overflow-hidden"
            style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <h3 className="font-semibold text-xs uppercase tracking-widest"
                style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
                Alertes récentes
              </h3>
              <Link href="/admin/alerts"
                className="text-xs font-medium px-3 py-1.5 rounded-lg"
                style={{ color: 'var(--admin-accent)', background: 'var(--admin-accent-dim)', fontFamily: 'var(--font-sans)' }}>
                Voir tout →
              </Link>
            </div>
            <div>
              {d.alerts.length === 0 && (
                <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
                  Aucune alerte
                </div>
              )}
              {d.alerts.map((a, i) => (
                <div key={i} className="px-5 py-3 flex items-start gap-3 transition-colors duration-100"
                  style={{ borderBottom: i < d.alerts.length - 1 ? '1px solid var(--admin-border)' : 'none' }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: a.type === 'critical' ? 'var(--admin-red-dim)' : 'var(--admin-amber-dim)', color: a.type === 'critical' ? 'var(--admin-red)' : 'var(--admin-amber)' }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    {a.projectName && (
                      <p className="text-xs font-semibold truncate mb-0.5" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-sans)' }}>{a.projectName}</p>
                    )}
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>{a.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming milestones */}
          <div className="admin-card-shine rounded-xl overflow-hidden"
            style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <h3 className="font-semibold text-xs uppercase tracking-widest"
                style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
                Jalons cette semaine
              </h3>
              <Link href="/admin/projects/milestones"
                className="text-xs font-medium px-3 py-1.5 rounded-lg"
                style={{ color: 'var(--admin-accent)', background: 'var(--admin-accent-dim)', fontFamily: 'var(--font-sans)' }}>
                Voir tout →
              </Link>
            </div>
            <div>
              {d.upcomingMilestones.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
                  Aucun jalon cette semaine
                </div>
              ) : (
                d.upcomingMilestones.map((m: { id: string; title: string; dueDate: string; project: { name: string } }, i: number) => (
                  <div key={m.id} className="px-5 py-3 flex items-center gap-3"
                    style={{ borderBottom: i < d.upcomingMilestones.length - 1 ? '1px solid var(--admin-border)' : 'none' }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--admin-amber)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-sans)' }}>{m.title}</p>
                      <p className="text-xs" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>{m.project.name}</p>
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--admin-amber)', fontFamily: 'var(--font-sans)' }}>
                      {new Date(m.dueDate).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity + Budget Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent activity */}
        <div className="admin-card-shine rounded-xl overflow-hidden"
          style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--admin-border)' }}>
            <h3 className="font-semibold text-xs uppercase tracking-widest"
              style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
              Activité récente
            </h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
            {d.recentActivity.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
                Aucune activité
              </div>
            ) : (
              d.recentActivity.map((log: { id: string; description: string; createdAt: string; project?: { name: string } | null }) => (
                <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-tight" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>{log.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
                      {log.project?.name} · {new Date(log.createdAt).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Budget chart */}
        <div className="admin-card-shine lg:col-span-2 rounded-xl"
          style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--admin-border)' }}>
            <div>
              <h3 className="font-semibold text-xs uppercase tracking-widest"
                style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
                Budget vs Coûts réels
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
                {d.chartData.length} projets · montants en TND
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-1.5 rounded-full" style={{ background: '#4CAF80' }} />
                <span className="text-xs" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>Budget</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1.5 rounded-full" style={{ background: '#E8C96A' }} />
                <span className="text-xs" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>Coûts réels</span>
              </div>
            </div>
          </div>
          <div className="p-5">
            <BudgetChart data={d.chartData} />
          </div>
        </div>
      </div>

    </div>
  )
}
