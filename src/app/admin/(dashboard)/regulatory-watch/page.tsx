import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRegulatoryWatchEntries } from '@/lib/db/regulatory-watch'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Veille Réglementaire | SOPAT Admin' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function RegulatoryWatchPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) redirect('/login')

  const status = typeof sp.status === 'string' ? sp.status : undefined
  const entries = await getRegulatoryWatchEntries(status)

  const applicable = entries.filter(({ entry }) => entry.status === 'applicable').length
  const enVeille = entries.filter(({ entry }) => entry.status === 'en_veille').length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Veille Réglementaire</h1>
          <p className="text-sm text-gray-500 mt-1">LIS-MI-07 — Registre des exigences légales et réglementaires</p>
        </div>
        <Link
          href="/admin/regulatory-watch/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Nouveau texte
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{entries.length}</p>
        </div>
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Applicables</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{applicable}</p>
        </div>
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-xs text-gray-500 uppercase tracking-wide">En veille</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">{enVeille}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {[
          { label: 'Tous', value: undefined },
          { label: 'Applicable', value: 'applicable' },
          { label: 'En veille', value: 'en_veille' },
          { label: 'Non applicable', value: 'non_applicable' },
        ].map(({ label, value }) => (
          <Link
            key={label}
            href={value ? `/admin/regulatory-watch?status=${value}` : '/admin/regulatory-watch'}
            className={`px-4 py-1.5 rounded-full text-sm border font-medium transition-colors ${
              status === value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 text-gray-600 hover:border-gray-400'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Réf.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Titre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Domaine</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Organisme</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date effet</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Prochaine révision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map(({ entry }) => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{entry.reference ?? '—'}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-medium text-gray-900 truncate">{entry.title}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{entry.domain ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{entry.issuingBody ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{entry.effectiveDate ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      entry.status === 'applicable'
                        ? 'bg-green-100 text-green-700'
                        : entry.status === 'en_veille'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {entry.status === 'applicable' ? 'Applicable' : entry.status === 'en_veille' ? 'En veille' : 'Non applicable'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{entry.nextReviewDate ?? '—'}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    Aucun texte réglementaire enregistré.{' '}
                    <Link href="/admin/regulatory-watch/new" className="text-blue-600 hover:underline">
                      Ajouter le premier
                    </Link>
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
