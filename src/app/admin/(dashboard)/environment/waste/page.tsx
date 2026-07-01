import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getWasteRecords } from '@/lib/db/waste'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Suivi des Déchets | SOPAT Admin' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const MONTH_NAMES = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

const WASTE_TYPE_LABELS: Record<string, string> = {
  papier_carton: 'Papier / Carton',
  plastique: 'Plastique',
  verre: 'Verre',
  metal: 'Métal',
  dechets_verts: 'Déchets verts',
  dechets_chimiques: 'Déchets chimiques',
  electronique: 'Électronique',
  autre: 'Autre',
}

const DISPOSAL_LABELS: Record<string, string> = {
  tri_selectif: 'Tri sélectif',
  collecte_municipale: 'Collecte municipale',
  prestataire_agree: 'Prestataire agréé',
  incineration: 'Incinération',
  autre: 'Autre',
}

export default async function WastePage({ searchParams }: { searchParams: SearchParams }) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) redirect('/login')

  const year = sp.year ? parseInt(sp.year as string) : new Date().getFullYear()
  const records = await getWasteRecords(year)
  const totalKg = records.reduce((sum, { record }) => sum + (record.quantityKg ?? 0), 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suivi des Déchets</h1>
          <p className="text-sm text-gray-500 mt-1">FOR-MI-11 — Registre de gestion des déchets</p>
        </div>
        <Link href="/admin/environment/waste/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Nouveau
        </Link>
      </div>

      <div className="flex items-center gap-4">
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
        <span className="ml-auto text-sm text-gray-600">
          Total <strong>{year}</strong>: <strong className="text-gray-900">{totalKg.toFixed(1)} kg</strong>
          {' '}· {records.length} enregistrements
        </span>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Mois</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type de déchet</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Qté (kg)</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Mode d'élimination</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Prestataire</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Coût (TND)</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map(({ record }) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{MONTH_NAMES[record.month - 1]}</td>
                  <td className="px-4 py-3 text-gray-700">{WASTE_TYPE_LABELS[record.wasteType] ?? record.wasteType}</td>
                  <td className="px-4 py-3 text-right font-mono">{record.quantityKg?.toFixed(1) ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{DISPOSAL_LABELS[record.disposal] ?? record.disposal}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{record.contractor ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {record.cost ? Number(record.cost).toFixed(3) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{record.notes ?? '—'}</td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    Aucun enregistrement pour {year}.{' '}
                    <Link href="/admin/environment/waste/new" className="text-blue-600 hover:underline">
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
