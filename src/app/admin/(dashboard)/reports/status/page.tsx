import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Badge } from '@/components/admin/ui'
import { STAGES, SHORT_STAGE_NAMES } from '@/lib/stages'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Statut des projets – SOPAT Admin' }

export default async function ProjectStatusReportPage() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      client: { select: { name: true } },
      milestones: true,
      tasks: { where: { status: { not: 'Done' } } },
      issues: { where: { status: 'Open' } },
    },
  })

  const now = new Date()

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1"
            style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}>
            Rapports
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
            Statut des projets
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/reports"
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ color: 'var(--admin-text-muted)', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', fontFamily: 'var(--font-sans)' }}>
            P&L →
          </Link>
          <Link href="/admin/reports/budget"
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ color: 'var(--admin-text-muted)', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', fontFamily: 'var(--font-sans)' }}>
            Budget →
          </Link>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total projets', value: projects.length, color: 'var(--admin-text)' },
          { label: 'Actifs', value: projects.filter(p => p.status === 'Active').length, color: 'var(--admin-emerald)' },
          { label: 'En retard', value: projects.filter(p => p.endDate && new Date(p.endDate) < now && p.status === 'Active').length, color: 'var(--admin-red)' },
          { label: 'Problèmes ouverts', value: projects.reduce((s, p) => s + p.issues.length, 0), color: 'var(--admin-amber)' },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-5" style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>{k.label}</p>
            <p className="text-2xl font-semibold" style={{ color: k.color, fontFamily: 'var(--font-playfair)' }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Project status table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <h3 className="text-xs uppercase tracking-widest font-semibold"
            style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}>
            Tous les projets
          </h3>
        </div>
        <table className="w-full" style={{ fontFamily: 'var(--font-sans)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
              {['Projet', 'Client', 'Étape', 'Statut', 'Jalons', 'Tâches', 'Problèmes', 'Fin prévue'].map((h, i) => (
                <th key={h} className="py-3 text-xs uppercase tracking-widest font-medium"
                  style={{ color: 'var(--admin-text-dim)', paddingLeft: i === 0 ? '1.25rem' : '0.75rem', paddingRight: i === 7 ? '1.25rem' : '0.75rem', textAlign: i >= 4 ? 'right' : 'left', letterSpacing: '0.08em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map(p => {
              const isDelayed = p.endDate && new Date(p.endDate) < now && p.status === 'Active'
              const pendingMilestones = p.milestones.filter(m => m.status !== 'Completed').length
              return (
                <tr key={p.id} className="admin-tr" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  <td className="py-3 pl-5 pr-3">
                    <Link href={`/admin/projects/${p.id}`}
                      className="font-medium text-sm hover:underline"
                      style={{ color: 'var(--admin-text)' }}>
                      {p.name}
                    </Link>
                  </td>
                  <td className="py-3 px-3 text-sm" style={{ color: 'var(--admin-text-muted)' }}>{p.client.name}</td>
                  <td className="py-3 px-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: STAGES[p.stage]?.color + '20', color: STAGES[p.stage]?.color }}>
                      {SHORT_STAGE_NAMES[p.stage] ?? `Étape ${p.stage}`}
                    </span>
                  </td>
                  <td className="py-3 px-3"><Badge status={p.status} /></td>
                  <td className="py-3 px-3 text-right text-sm" style={{ color: pendingMilestones > 0 ? 'var(--admin-amber)' : 'var(--admin-text-dim)' }}>
                    {pendingMilestones > 0 ? `${pendingMilestones} restants` : '—'}
                  </td>
                  <td className="py-3 px-3 text-right text-sm" style={{ color: p.tasks.length > 0 ? 'var(--admin-blue)' : 'var(--admin-text-dim)' }}>
                    {p.tasks.length > 0 ? p.tasks.length : '—'}
                  </td>
                  <td className="py-3 px-3 text-right text-sm" style={{ color: p.issues.length > 0 ? 'var(--admin-red)' : 'var(--admin-text-dim)' }}>
                    {p.issues.length > 0 ? p.issues.length : '—'}
                  </td>
                  <td className="py-3 pl-3 pr-5 text-right text-sm tabular-nums"
                    style={{ color: isDelayed ? 'var(--admin-red)' : 'var(--admin-text-muted)' }}>
                    {p.endDate ? new Date(p.endDate).toLocaleDateString('fr-TN') : '—'}
                    {isDelayed && ' ⚠'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
