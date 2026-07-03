import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  getManagementPlanActivities,
  getExecutionsForYear,
  getCommunicationPlan,
} from '@/lib/db/management-plan'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Plan de Management | SOPAT Admin' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const STATUS_COLORS: Record<string, string> = {
  planifie: 'var(--admin-accent-dim)',
  realise_dans_delai: 'var(--admin-emerald)',
  realise_avec_retard: 'var(--admin-amber)',
  non_realise: 'var(--admin-red)',
  cloture: 'var(--admin-text-muted)',
}

export default async function ManagementPlanPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) redirect('/login')

  const year = sp.year ? parseInt(sp.year as string) : new Date().getFullYear()

  const [activities, executions, commEntries] = await Promise.all([
    getManagementPlanActivities(year),
    getExecutionsForYear(year),
    getCommunicationPlan(year),
  ])

  const execMap: Record<string, string> = {}
  for (const exec of executions) {
    execMap[`${exec.activityId}-${exec.week}`] = exec.status
  }

  const weeks = Array.from({ length: 52 }, (_, i) => i + 1)

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            Plan de Management Annuel
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            PLA-MI-01 / PLA-MI-02 — Plan et communication
          </p>
        </div>
        <Link
          href="/admin/management-plan/new"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          + Nouvelle activité
        </Link>
      </div>

      <div className="flex gap-2">
        {[year - 1, year, year + 1].map((y) => (
          <Link key={y} href={`?year=${y}`}
            className="px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-colors"
            style={y === year
              ? { background: 'var(--admin-text)', color: 'var(--admin-surface)', borderColor: 'transparent' }
              : { borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }
            }
          >
            {y}
          </Link>
        ))}
      </div>

      <div className="flex gap-4 text-xs">
        {[
          { key: 'planifie', label: 'Planifié' },
          { key: 'realise_dans_delai', label: 'Réalisé dans délai' },
          { key: 'realise_avec_retard', label: 'Réalisé avec retard' },
          { key: 'non_realise', label: 'Non réalisé' },
          { key: 'cloture', label: 'Clôturé' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: STATUS_COLORS[key] }} />
            <span style={{ color: 'var(--admin-text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse" style={{ minWidth: '1800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                <th className="text-left px-3 py-2 text-[11px] font-medium min-w-[220px] sticky left-0 z-10"
                  style={{ color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}>
                  Objectif / Action
                </th>
                <th className="text-left px-3 py-2 text-[11px] font-medium min-w-[60px]" style={{ color: 'var(--admin-text-muted)' }}>Dept</th>
                <th className="text-left px-3 py-2 text-[11px] font-medium min-w-[100px]" style={{ color: 'var(--admin-text-muted)' }}>Responsable</th>
                {weeks.map((w) => (
                  <th key={w} className={`px-0.5 py-2 text-[11px] font-medium w-6 text-center ${w % 4 === 0 ? 'border-r' : ''}`}
                    style={{ color: 'var(--admin-text-muted)', borderColor: 'var(--admin-border)' }}>
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activities.map(({ activity }) => {
                const planned = (activity.plannedWeeks as number[]) ?? []
                return (
                  <tr key={activity.id} className="hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                    <td className="px-3 py-2 sticky left-0 z-10 border-r" style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}>
                      <p className="font-medium truncate max-w-[200px]" style={{ color: 'var(--admin-text)' }}>{activity.objective}</p>
                      <p className="truncate max-w-[200px]" style={{ color: 'var(--admin-text-muted)' }}>{activity.action}</p>
                    </td>
                    <td className="px-3 py-2" style={{ color: 'var(--admin-text-muted)' }}>{activity.dept}</td>
                    <td className="px-3 py-2 truncate max-w-[90px]" style={{ color: 'var(--admin-text-muted)' }}>{activity.responsible ?? '—'}</td>
                    {weeks.map((w) => {
                      const isPlanned = planned.includes(w)
                      const execStatus = execMap[`${activity.id}-${w}`]
                      const bg = execStatus
                        ? STATUS_COLORS[execStatus]
                        : isPlanned
                        ? 'var(--admin-accent-dim)'
                        : undefined
                      return (
                        <td key={w} className={`h-8 ${w % 4 === 0 ? 'border-r' : ''}`}
                          style={{ background: bg, borderColor: 'var(--admin-border)' }} />
                      )
                    })}
                  </tr>
                )
              })}
              {activities.length === 0 && (
                <tr>
                  <td colSpan={55} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Aucune activité pour {year}.{' '}
                    <Link href="/admin/management-plan/new" style={{ color: 'var(--admin-accent)' }} className="hover:underline">
                      Créer la première
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <h2 className="text-[13px] font-semibold" style={{ color: 'var(--admin-text)' }}>Plan de Communication (PLA-MI-02)</h2>
          <Link href="/admin/management-plan/communication/new" className="text-[13px] font-medium hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-accent)' }}>
            + Ajouter
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Direction', 'Sujet', 'Cible', 'Moyen', 'Fréquence', 'Responsable', 'Date prévue'].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {commEntries.map(({ comm }) => (
              <tr key={comm.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    comm.direction === 'interne'
                      ? 'bg-[var(--admin-accent-dim)] text-[var(--admin-accent)]'
                      : 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]'
                  }`}>
                    {comm.direction === 'interne' ? 'Interne' : 'Externe'}
                  </span>
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="truncate text-[13px]" style={{ color: 'var(--admin-text)' }}>{comm.subject}</p>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{comm.target ?? '—'}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{comm.channel ?? '—'}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{comm.frequency ?? '—'}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{comm.responsible ?? '—'}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{comm.plannedDate ?? '—'}</td>
              </tr>
            ))}
            {commEntries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                  Aucune entrée pour {year}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
