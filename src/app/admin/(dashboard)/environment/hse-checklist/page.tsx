import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getHseSubmissions } from '@/lib/db/hse'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Checklist HSE | SOPAT Admin' }

export default async function HseChecklistPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const submissions = await getHseSubmissions()
  const conformes = submissions.filter(({ submission }) => submission.overallStatus === 'conforme').length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklist HSE</h1>
          <p className="text-sm text-gray-500 mt-1">FOR-MI-12 — Suivi hygiène, sécurité et environnement</p>
        </div>
        <Link href="/admin/environment/hse-checklist/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Nouvelle soumission
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total soumissions</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{submissions.length}</p>
        </div>
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Conformes</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{conformes}</p>
        </div>
        <div className="border rounded-lg p-4 bg-white">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Taux conformité</p>
          <p className={`text-3xl font-bold mt-1 ${
            submissions.length === 0 ? 'text-gray-400' :
            conformes / submissions.length >= 0.9 ? 'text-green-600' : 'text-orange-500'
          }`}>
            {submissions.length > 0 ? `${Math.round((conformes / submissions.length) * 100)}%` : '—'}
          </p>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Département</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Statut global</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Soumis par</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {submissions.map(({ submission, creatorName }) => (
              <tr key={submission.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">{submission.submittedDate}</td>
                <td className="px-4 py-3 text-gray-600">{submission.dept}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    submission.overallStatus === 'conforme' ? 'bg-green-100 text-green-700' :
                    submission.overallStatus === 'partiel' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {submission.overallStatus === 'conforme' ? 'Conforme' :
                     submission.overallStatus === 'partiel' ? 'Partiel' : 'Non conforme'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">{creatorName}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/environment/hse-checklist/${submission.id}`}
                    className="text-blue-600 hover:underline text-xs font-medium">
                    Voir →
                  </Link>
                </td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  Aucune soumission.{' '}
                  <Link href="/admin/environment/hse-checklist/new" className="text-blue-600 hover:underline">
                    Créer la première
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
