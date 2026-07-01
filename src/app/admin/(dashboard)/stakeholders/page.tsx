import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getStakeholders, getStaffSuggestions } from '@/lib/db/stakeholders'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Parties Intéressées | SOPAT Admin' }

export default async function StakeholdersPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [rows, suggestions] = await Promise.all([
    getStakeholders(),
    getStaffSuggestions(),
  ])

  const pipCount = rows.filter(({ sh }) => sh.isPip).length

  const typeLabels: Record<string, string> = {
    client: 'Client',
    fournisseur: 'Fournisseur',
    partenaire: 'Partenaire',
    employe: 'Employé',
    actionnaire: 'Actionnaire',
    autorite_reglementaire: 'Autorité régl.',
    communaute: 'Communauté',
    autre: 'Autre',
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parties Intéressées</h1>
          <p className="text-sm text-gray-500 mt-1">FOR-MI-08/09 — Écoute des parties intéressées</p>
        </div>
        <Link
          href="/admin/stakeholders/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Nouvelle PI
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total PI</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{rows.length}</p>
        </div>
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-xs text-gray-500 uppercase tracking-wide">PIP (forte influence)</p>
          <p className={`text-3xl font-bold mt-1 ${pipCount > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
            {pipCount}
          </p>
        </div>
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Suggestions personnel</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{suggestions.length}</p>
        </div>
      </div>

      {/* Stakeholders table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-medium text-gray-900">Registre des parties intéressées</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Réf.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Besoins / Attentes</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Influence</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Interaction</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">PIP</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(({ sh }) => (
                <tr key={sh.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{sh.reference}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{sh.name}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{typeLabels[sh.type] ?? sh.type}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-gray-600 text-xs">{sh.needs ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">{sh.influence}</td>
                  <td className="px-4 py-3 text-center font-semibold">{sh.interaction}</td>
                  <td className="px-4 py-3 text-center">
                    {sh.isPip ? (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                        PIP
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/stakeholders/${sh.id}`}
                      className="text-blue-600 hover:underline text-xs font-medium"
                    >
                      Voir →
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    Aucune partie intéressée.{' '}
                    <Link href="/admin/stakeholders/new" className="text-blue-600 hover:underline">
                      Créer la première
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff suggestions */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-medium text-gray-900">Suggestions du personnel</h2>
          <Link
            href="/admin/stakeholders/suggestions/new"
            className="text-blue-600 text-sm hover:underline"
          >
            + Nouvelle suggestion
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {suggestions.slice(0, 10).map(({ s, creatorName }) => (
            <div key={s.id} className="px-4 py-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{s.suggestionText}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {s.dept} · {s.date} · {creatorName}
                  </p>
                </div>
                {s.responseText ? (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs ml-3 flex-shrink-0">
                    Répondu
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs ml-3 flex-shrink-0">
                    En attente
                  </span>
                )}
              </div>
            </div>
          ))}
          {suggestions.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              Aucune suggestion enregistrée.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
