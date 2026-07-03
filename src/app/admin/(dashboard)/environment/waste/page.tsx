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
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            Suivi des Déchets
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-MI-11 — Registre de gestion des déchets
          </p>
        </div>
        <Link
          href="/admin/environment/waste/new"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          + Nouveau
        </Link>
      </div>

      <div className="flex items-center gap-4">
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
        <span className="ml-auto text-[13px]" style={{ color: 'var(--admin-text-muted)' }}>
          Total <strong style={{ color: 'var(--admin-text)' }}>{year}</strong>:{' '}
          <strong style={{ color: 'var(--admin-text)' }}>{totalKg.toFixed(1)} kg</strong>
          {' '}· {records.length} enregistrements
        </span>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['Mois', 'Type de déchet', 'Qté (kg)', "Mode d'élimination", 'Prestataire', 'Coût (TND)', 'Notes'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map(({ record }) => (
                <tr key={record.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3 font-medium text-[13px]" style={{ color: 'var(--admin-text)' }}>{MONTH_NAMES[record.month - 1]}</td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--admin-text)' }}>{WASTE_TYPE_LABELS[record.wasteType] ?? record.wasteType}</td>
                  <td className="px-4 py-3 text-right font-mono text-[13px]" style={{ color: 'var(--admin-text)' }}>{record.quantityKg?.toFixed(1) ?? '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{DISPOSAL_LABELS[record.disposal] ?? record.disposal}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{record.contractor ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {record.cost ? Number(record.cost).toFixed(3) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs max-w-xs truncate" style={{ color: 'var(--admin-text-muted)' }}>{record.notes ?? '—'}</td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Aucun enregistrement pour {year}.{' '}
                    <Link href="/admin/environment/waste/new" style={{ color: 'var(--admin-accent)' }} className="hover:underline">
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
