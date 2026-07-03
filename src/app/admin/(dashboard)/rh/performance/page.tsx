import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { listPerformanceEvaluations } from '@/lib/db/rh'
import { Star, Plus, ChevronRight } from 'lucide-react'

function ScoreBadge({ pct }: { pct: number | null }) {
  if (pct == null) return <span style={{ color: 'var(--admin-muted)' }}>—</span>
  const color = pct >= 75 ? 'var(--green)' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: color, color: 'white' }}>
      {pct.toFixed(0)}%
    </span>
  )
}

export default async function PerformancePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const evaluations = await listPerformanceEvaluations()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <Star size={20} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Évaluations de performance</h1>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>FOR-RH-03 — {evaluations.length} évaluation(s)</p>
          </div>
        </div>
        <Link
          href="/admin/rh/performance/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          <Plus size={16} /> Nouvelle évaluation
        </Link>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Employé', 'Poste évalué', 'Date', 'Score global', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--admin-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {evaluations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center" style={{ color: 'var(--admin-muted)' }}>
                  Aucune évaluation enregistrée
                </td>
              </tr>
            )}
            {evaluations.map((ev) => (
              <tr key={ev.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors"
                style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--admin-fg)' }}>{ev.userName ?? '—'}</td>
                <td className="px-4 py-3" style={{ color: 'var(--admin-muted)' }}>{ev.currentPosition ?? '—'}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-muted)' }}>
                  {ev.evaluationDate ? new Date(ev.evaluationDate).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="px-4 py-3">
                  <ScoreBadge pct={ev.globalScorePct ? Number(ev.globalScorePct) : null} />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/rh/performance/${ev.id}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--green)' }}>
                    Voir <ChevronRight size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
