import { prisma } from '@/lib/db'
import Link from 'next/link'
import { tnd } from '@/lib/fmt'
import { ProgressBar } from '@/components/admin/ui'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Budget vs Réel – SOPAT Admin' }

export default async function BudgetReportPage() {
  const projects = await prisma.project.findMany({
    orderBy: { name: 'asc' },
    include: {
      client: { select: { name: true } },
      budgetItems: true,
      costItems: true,
      timeEntries: true,
    },
  })

  const rows = projects.map(p => {
    const budget = p.budgetItems.reduce((s, b) => s + b.plannedAmount, 0)
    const actual = p.costItems.reduce((s, c) => s + c.amount, 0) +
      p.timeEntries.reduce((s, t) => s + t.amount, 0)
    const variance = budget - actual
    const pct = budget > 0 ? (actual / budget) * 100 : 0
    return { id: p.id, name: p.name, client: p.client.name, status: p.status, budget, actual, variance, pct }
  }).filter(r => r.budget > 0 || r.actual > 0)

  const totalBudget = rows.reduce((s, r) => s + r.budget, 0)
  const totalActual = rows.reduce((s, r) => s + r.actual, 0)
  const overBudget = rows.filter(r => r.pct > 100).length

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1"
            style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}>
            Rapports
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
            Budget vs Réel
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/reports"
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ color: 'var(--admin-text-muted)', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', fontFamily: 'var(--font-sans)' }}>
            P&L →
          </Link>
          <Link href="/admin/reports/status"
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ color: 'var(--admin-text-muted)', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', fontFamily: 'var(--font-sans)' }}>
            Statut →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Budget total', value: tnd(totalBudget), color: 'var(--admin-emerald)' },
          { label: 'Coûts réels', value: tnd(totalActual), color: 'var(--admin-accent)' },
          { label: 'Variance', value: tnd(totalBudget - totalActual), color: totalBudget >= totalActual ? 'var(--admin-emerald)' : 'var(--admin-red)' },
          { label: 'Projets hors budget', value: overBudget, color: overBudget > 0 ? 'var(--admin-red)' : 'var(--admin-emerald)' },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-5" style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>{k.label}</p>
            <p className="text-xl font-semibold" style={{ color: k.color, fontFamily: 'var(--font-playfair)' }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
        <table className="w-full" style={{ fontFamily: 'var(--font-sans)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
              {['Projet', 'Client', 'Budget prévu', 'Coûts réels', 'Variance', 'Utilisation'].map((h, i) => (
                <th key={h} className="py-3 text-xs uppercase tracking-widest font-medium"
                  style={{ color: 'var(--admin-text-dim)', paddingLeft: i === 0 ? '1.25rem' : '1rem', paddingRight: i === 5 ? '1.25rem' : '1rem', textAlign: i >= 2 ? 'right' : 'left', letterSpacing: '0.08em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="admin-tr" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <td className="py-3.5 pl-5 pr-4">
                  <Link href={`/admin/projects/${r.id}`}
                    className="font-medium text-sm hover:underline"
                    style={{ color: 'var(--admin-text)' }}>
                    {r.name}
                  </Link>
                </td>
                <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>{r.client}</td>
                <td className="py-3.5 px-4 text-right text-sm tabular-nums" style={{ color: 'var(--admin-text)' }}>{tnd(r.budget)}</td>
                <td className="py-3.5 px-4 text-right text-sm tabular-nums" style={{ color: 'var(--admin-text)' }}>{tnd(r.actual)}</td>
                <td className="py-3.5 px-4 text-right text-sm tabular-nums font-semibold"
                  style={{ color: r.variance >= 0 ? 'var(--admin-emerald)' : 'var(--admin-red)' }}>
                  {r.variance >= 0 ? '+' : ''}{tnd(r.variance)}
                </td>
                <td className="py-3.5 pl-4 pr-5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <ProgressBar pct={r.pct} />
                    </div>
                    <span className="text-xs tabular-nums flex-shrink-0"
                      style={{ color: r.pct > 100 ? 'var(--admin-red)' : r.pct > 80 ? 'var(--admin-amber)' : 'var(--admin-emerald)', fontFamily: 'var(--font-sans)', minWidth: '3rem', textAlign: 'right' }}>
                      {r.pct.toFixed(0)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-sm" style={{ color: 'var(--admin-text-dim)' }}>Aucun projet avec budget</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
