import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listPlantSpecies } from '@/lib/db/plant-species'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Palette Végétale | SOPAT Admin' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const CATEGORY_LABELS: Record<string, string> = {
  tree: 'Arbres',
  shrub: 'Arbustes',
  ground_cover: 'Couvre-sol',
  climber: 'Grimpantes',
  palm: 'Palmiers',
  grass: 'Graminées',
  aquatic: 'Aquatiques',
  other: 'Autre',
}

export default async function PlantSpeciesPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) redirect('/login')

  const query = (sp.q as string) ?? ''
  const categoryFilter = (sp.cat as string) ?? ''

  const allSpecies = await listPlantSpecies(query || undefined)
  const species = categoryFilter
    ? allSpecies.filter((s) => s.category === categoryFilter)
    : allSpecies

  const byCat: Record<string, typeof species> = {}
  for (const s of species) {
    if (!byCat[s.category]) byCat[s.category] = []
    byCat[s.category].push(s)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            Palette Végétale
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            LIS-ET-02 / LIS-ET-03 — Référentiel des espèces végétales ({allSpecies.length} espèces)
          </p>
        </div>
        <Link
          href="/admin/etude/plant-species/new"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          + Nouvelle espèce
        </Link>
      </div>

      {/* Search + category filter */}
      <div className="flex gap-2 flex-wrap">
        <form method="get" className="flex-1 min-w-[200px]">
          <input
            name="q"
            defaultValue={query}
            placeholder="Rechercher par nom latin ou commun…"
            className="w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]"
            style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
          />
        </form>
        <div className="flex gap-1.5 flex-wrap">
          <Link href="/admin/etude/plant-species"
            className="px-3 py-1.5 rounded-lg border text-[12px] font-medium"
            style={!categoryFilter
              ? { background: 'var(--admin-text)', color: 'var(--admin-surface)', borderColor: 'transparent' }
              : { borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }
            }
          >Toutes</Link>
          {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
            <Link key={k} href={`?cat=${k}`}
              className="px-3 py-1.5 rounded-lg border text-[12px] font-medium"
              style={categoryFilter === k
                ? { background: 'var(--admin-text)', color: 'var(--admin-surface)', borderColor: 'transparent' }
                : { borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }
              }
            >{label}</Link>
          ))}
        </div>
      </div>

      {/* Table */}
      {species.length === 0 ? (
        <div className="rounded-xl border p-12 text-center" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Aucune espèce trouvée.{' '}
            <Link href="/admin/etude/plant-species/new" style={{ color: 'var(--admin-accent)' }} className="hover:underline">
              Ajouter la première
            </Link>
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['Code', 'Nom latin', 'Nom commun', 'Catégorie', 'Hauteur adulte', 'Période plantation', 'Floraison', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {species.map((s) => (
                <tr key={s.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3">
                    {s.lisCode ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
                        {s.lisCode}
                      </span>
                    ) : <span style={{ color: 'var(--admin-text-muted)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium italic text-[13px]" style={{ color: 'var(--admin-text)' }}>{s.botanicalName}</span>
                  </td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--admin-text-muted)' }}>{s.commonNameFr ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)' }}>
                      {CATEGORY_LABELS[s.category] ?? s.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>
                    {s.heightAdultMin && s.heightAdultMax
                      ? `${s.heightAdultMin}–${s.heightAdultMax} m`
                      : s.heightAdultMax ? `≤ ${s.heightAdultMax} m` : '—'}
                  </td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>{s.plantingPeriod ?? '—'}</td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>
                    {s.hasFlowers ? (s.floweringPeriod ?? 'Oui') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/etude/plant-species/${s.id}`}
                      className="text-[12px] hover:underline" style={{ color: 'var(--admin-accent)' }}>
                      Détails →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
