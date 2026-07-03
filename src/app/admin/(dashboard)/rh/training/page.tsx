import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { listTrainingSessions } from '@/lib/db/rh'
import { GraduationCap, Plus, ChevronRight } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  planifie: 'Planifié', en_cours: 'En cours', realise: 'Réalisé', reporte: 'Reporté', annule: 'Annulé',
}
const STATUS_COLORS: Record<string, string> = {
  planifie: '#3b82f6', en_cours: 'var(--green)', realise: '#6b7280', reporte: '#f59e0b', annule: '#ef4444',
}

const CURRENT_YEAR = new Date().getFullYear()

export default async function TrainingPage({ searchParams }: { searchParams: { year?: string; status?: string } }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const year = searchParams.year ? parseInt(searchParams.year) : CURRENT_YEAR
  const status = searchParams.status || ''
  const sessions = await listTrainingSessions(year, status || undefined)

  const years = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <GraduationCap size={20} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Plan de formation</h1>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>PLA-RH-02 — {sessions.length} action(s) en {year}</p>
          </div>
        </div>
        <Link
          href="/admin/rh/training/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          <Plus size={16} /> Nouvelle action
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1">
          {years.map(y => (
            <Link key={y}
              href={`/admin/rh/training?year=${y}${status ? `&status=${status}` : ''}`}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={year === y
                ? { background: 'var(--green)', color: 'var(--ivory)' }
                : { background: 'var(--admin-bg)', color: 'var(--admin-muted)', border: '1px solid var(--admin-border)' }}
            >
              {y}
            </Link>
          ))}
        </div>
        <div className="flex gap-1">
          {[{ key: '', label: 'Tous' }, ...Object.entries(STATUS_LABELS).map(([k, v]) => ({ key: k, label: v }))].map(tab => (
            <Link key={tab.key}
              href={`/admin/rh/training?year=${year}${tab.key ? `&status=${tab.key}` : ''}`}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={status === tab.key
                ? { background: 'var(--admin-bg)', color: 'var(--admin-fg)', border: '1px solid var(--green)', fontWeight: 600 }
                : { background: 'var(--admin-bg)', color: 'var(--admin-muted)', border: '1px solid var(--admin-border)' }}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Réf.', 'Thème', 'Thématique', 'Organisme', 'Période prévue', 'Statut', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--admin-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center" style={{ color: 'var(--admin-muted)' }}>
                  Aucune action de formation pour {year}
                </td>
              </tr>
            )}
            {sessions.map((s) => (
              <tr key={s.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors"
                style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--admin-muted)' }}>{s.refCode ?? '—'}</td>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--admin-fg)' }}>{s.theme}</td>
                <td className="px-4 py-3" style={{ color: 'var(--admin-muted)' }}>{s.thematic ?? '—'}</td>
                <td className="px-4 py-3" style={{ color: 'var(--admin-muted)' }}>{s.trainingOrg ?? '—'}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-muted)' }}>
                  {s.plannedStartDate ? new Date(s.plannedStartDate).toLocaleDateString('fr-FR') : '—'}
                  {s.plannedEndDate && ` → ${new Date(s.plannedEndDate).toLocaleDateString('fr-FR')}`}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-medium text-white"
                    style={{ background: STATUS_COLORS[s.status] ?? '#6b7280' }}>
                    {STATUS_LABELS[s.status] ?? s.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/rh/training/${s.id}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--green)' }}>
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
