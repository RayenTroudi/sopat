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
  planifie: 'bg-blue-100',
  realise_dans_delai: 'bg-green-400',
  realise_avec_retard: 'bg-orange-400',
  non_realise: 'bg-red-400',
  cloture: 'bg-gray-400',
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
          <h1 className="text-2xl font-bold text-gray-900">Plan de Management Annuel</h1>
          <p className="text-sm text-gray-500 mt-1">PLA-MI-01 / PLA-MI-02 — Plan et communication</p>
        </div>
        <Link href="/admin/management-plan/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Nouvelle activité
        </Link>
      </div>

      {/* Year selector */}
      <div className="flex gap-2">
        {[year - 1, year, year + 1].map((y) => (
          <Link key={y} href={`?year=${y}`}
            className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
              y === year ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-gray-400'
            }`}>
            {y}
          </Link>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs">
        {[
          { key: 'planifie', label: 'Planifié' },
          { key: 'realise_dans_delai', label: 'Réalisé dans délai' },
          { key: 'realise_avec_retard', label: 'Réalisé avec retard' },
          { key: 'non_realise', label: 'Non réalisé' },
          { key: 'cloture', label: 'Clôturé' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${STATUS_COLORS[key]}`} />
            <span className="text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Gantt table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse" style={{ minWidth: '1800px' }}>
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-3 py-2 font-medium text-gray-600 min-w-[220px] sticky left-0 bg-gray-50 z-10">Objectif / Action</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 min-w-[60px]">Dept</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 min-w-[100px]">Responsable</th>
                {weeks.map((w) => (
                  <th key={w} className={`px-0.5 py-2 font-medium text-gray-500 w-6 text-center ${w % 4 === 0 ? 'border-r border-gray-200' : ''}`}>
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activities.map(({ activity }) => {
                const planned = (activity.plannedWeeks as number[]) ?? []
                return (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 sticky left-0 bg-white hover:bg-gray-50 z-10 border-r border-gray-100">
                      <p className="font-medium text-gray-900 truncate max-w-[200px]">{activity.objective}</p>
                      <p className="text-gray-500 truncate max-w-[200px]">{activity.action}</p>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{activity.dept}</td>
                    <td className="px-3 py-2 text-gray-500 truncate max-w-[90px]">{activity.responsible ?? '—'}</td>
                    {weeks.map((w) => {
                      const isPlanned = planned.includes(w)
                      const execStatus = execMap[`${activity.id}-${w}`]
                      const colorClass = execStatus
                        ? STATUS_COLORS[execStatus]
                        : isPlanned
                        ? 'bg-blue-200'
                        : ''
                      return (
                        <td key={w} className={`h-8 ${colorClass} ${w % 4 === 0 ? 'border-r border-gray-200' : ''}`} />
                      )
                    })}
                  </tr>
                )
              })}
              {activities.length === 0 && (
                <tr>
                  <td colSpan={55} className="px-4 py-10 text-center text-gray-400">
                    Aucune activité pour {year}.{' '}
                    <Link href="/admin/management-plan/new" className="text-blue-600 hover:underline">Créer la première</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Communication plan */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Plan de Communication (PLA-MI-02)</h2>
          <Link href="/admin/management-plan/communication/new" className="text-blue-600 text-sm hover:underline">
            + Ajouter
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Direction</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Sujet</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Cible</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Moyen</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Fréquence</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Responsable</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date prévue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {commEntries.map(({ comm }) => (
              <tr key={comm.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    comm.direction === 'interne' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {comm.direction === 'interne' ? 'Interne' : 'Externe'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-900 max-w-xs">
                  <p className="truncate">{comm.subject}</p>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">{comm.target ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{comm.channel ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{comm.frequency ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{comm.responsible ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{comm.plannedDate ?? '—'}</td>
              </tr>
            ))}
            {commEntries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
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
