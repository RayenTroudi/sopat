import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRisksOpportunities } from '@/lib/db/risks-opportunities'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Risques & Opportunités | SOPAT Admin' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function RisksOpportunitiesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) redirect('/login')

  const type = typeof sp.type === 'string' ? (sp.type as 'risk' | 'opportunity') : undefined
  const status = typeof sp.status === 'string' ? sp.status : undefined

  const rows = await getRisksOpportunities({ type, status })

  const risks = rows.filter(({ ro }) => ro.type === 'risk')
  const opps = rows.filter(({ ro }) => ro.type === 'opportunity')
  const highCriticality = risks.filter(({ ro }) => (ro.criticality ?? 0) >= 12).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Risques &amp; Opportunités</h1>
          <p className="text-sm text-gray-500 mt-1">FOR-MI-07 — Registre des risques et opportunités</p>
        </div>
        <Link
          href="/admin/risks-opportunities/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Nouveau
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{rows.length}</p>
        </div>
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Risques</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{risks.length}</p>
        </div>
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Opportunités</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{opps.length}</p>
        </div>
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Criticité élevée (&ge;12)</p>
          <p className={`text-3xl font-bold mt-1 ${highCriticality > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {highCriticality}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { label: 'Tous', value: undefined },
          { label: 'Risques', value: 'risk' },
          { label: 'Opportunités', value: 'opportunity' },
        ].map(({ label, value }) => (
          <Link
            key={label}
            href={value ? `/admin/risks-opportunities?type=${value}` : '/admin/risks-opportunities'}
            className={`px-4 py-1.5 rounded-full text-sm border font-medium transition-colors ${
              type === value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 text-gray-600 hover:border-gray-400'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Réf.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Catégorie</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Score</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Responsable</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(({ ro }) => {
                const displayScore = ro.type === 'risk' ? ro.criticality : ro.score
                const scoreColor =
                  displayScore != null && displayScore >= 12
                    ? 'text-red-600 font-bold'
                    : displayScore != null && displayScore >= 6
                    ? 'text-orange-500 font-medium'
                    : 'text-green-600'
                const statusColors: Record<string, string> = {
                  identified: 'bg-yellow-100 text-yellow-700',
                  treated: 'bg-blue-100 text-blue-700',
                  monitored: 'bg-purple-100 text-purple-700',
                  closed: 'bg-gray-100 text-gray-600',
                }
                return (
                  <tr key={ro.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{ro.reference}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          ro.type === 'risk'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {ro.type === 'risk' ? 'Risque' : 'Opportunité'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{ro.category.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate text-gray-900">{ro.description}</p>
                    </td>
                    <td className={`px-4 py-3 ${scoreColor}`}>
                      {displayScore ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[ro.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ro.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{ro.owner ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/risks-opportunities/${ro.id}`}
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        Voir →
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    Aucun enregistrement. <Link href="/admin/risks-opportunities/new" className="text-blue-600 hover:underline">Créer le premier</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
