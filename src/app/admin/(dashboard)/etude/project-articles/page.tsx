import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { plantListItems, projects } from '@/db/schema'
import { eq, desc, count, asc } from 'drizzle-orm'
import { ArrowLeft, ClipboardList, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Articles par projet | SOPAT Admin' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const ETUDE_ROLES = ['admin', 'direction', 'etudes_chef', 'etudes_team']

const CATEGORY_LABELS: Record<string, string> = {
  palm: 'Palmiers', tree: 'Arbres', shrub: 'Arbustes',
  grass: 'Graminées', ground_cover: 'Couvre-sol', climber: 'Grimpantes',
  aquatic: 'Aquatiques', other: 'Autre',
}

const CATEGORY_COLORS: Record<string, string> = {
  palm: '#d97706', tree: 'var(--green)', shrub: '#059669',
  grass: '#16a34a', ground_cover: '#4ade80', climber: '#a16207',
  aquatic: '#0891b2', other: '#6b7280',
}

export default async function ProjectArticlesPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session?.user) redirect('/login')

  const role = (session.user as any).role ?? ''
  if (!ETUDE_ROLES.includes(role)) redirect('/admin')

  const q = (sp.q as string) ?? ''
  const catFilter = (sp.cat as string) ?? ''

  // Get all projects that have plant list items, with aggregated stats
  const projectStats = await db
    .select({
      projectId: plantListItems.projectId,
      projectName: projects.name,
      clientName: projects.clientName,
      lineCount: count(plantListItems.id),
    })
    .from(plantListItems)
    .leftJoin(projects, eq(projects.id, plantListItems.projectId))
    .groupBy(plantListItems.projectId, projects.name, projects.clientName)
    .orderBy(desc(count(plantListItems.id)))

  // Get all items for drill-down display
  const allItems = await db
    .select({
      id: plantListItems.id,
      projectId: plantListItems.projectId,
      botanicalName: plantListItems.botanicalName,
      commonName: plantListItems.commonName,
      category: plantListItems.category,
      quantity: plantListItems.quantity,
      unit: plantListItems.unit,
      notes: plantListItems.notes,
      projectName: projects.name,
      clientName: projects.clientName,
    })
    .from(plantListItems)
    .leftJoin(projects, eq(projects.id, plantListItems.projectId))
    .orderBy(asc(plantListItems.botanicalName))

  const filtered = allItems.filter((item) => {
    const matchesQ = !q || (
      item.botanicalName.toLowerCase().includes(q.toLowerCase()) ||
      (item.commonName ?? '').toLowerCase().includes(q.toLowerCase()) ||
      (item.projectName ?? '').toLowerCase().includes(q.toLowerCase()) ||
      (item.clientName ?? '').toLowerCase().includes(q.toLowerCase())
    )
    const matchesCat = !catFilter || item.category === catFilter
    return matchesQ && matchesCat
  })

  // Aggregate: species frequency across all projects
  const speciesFreq: Record<string, { count: number; totalQty: number }> = {}
  for (const item of allItems) {
    const key = item.botanicalName
    if (!speciesFreq[key]) speciesFreq[key] = { count: 0, totalQty: 0 }
    speciesFreq[key].count++
    speciesFreq[key].totalQty += Number(item.quantity)
  }
  const topSpecies = Object.entries(speciesFreq)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)

  const totalItems = allItems.length
  const totalQty = allItems.reduce((s, i) => s + Number(i.quantity), 0)

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/etude"
          className="p-2 rounded-lg hover:opacity-70"
          style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}
        >
          <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <ClipboardList size={18} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>
              Listes des articles par projet
            </h1>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>
              FOR-ET-06 — {totalItems} lignes · {totalQty.toFixed(0)} unités au total
            </p>
          </div>
        </div>
      </div>

      {/* Top summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--admin-fg)' }}>{projectStats.length}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-muted)' }}>Projets avec liste</p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--admin-fg)' }}>{totalItems}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-muted)' }}>Lignes au total</p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--admin-fg)' }}>{totalQty.toFixed(0)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-muted)' }}>Unités totales</p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--admin-fg)' }}>{Object.keys(speciesFreq).length}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-muted)' }}>Espèces distinctes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: projects list */}
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-muted)' }}>
              Par projet
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
            {projectStats.length === 0 ? (
              <p className="p-4 text-sm" style={{ color: 'var(--admin-muted)' }}>Aucun article enregistré.</p>
            ) : (
              projectStats.map((ps) => (
                <div key={ps.projectId} className="px-4 py-3 flex items-start justify-between gap-2 hover:bg-[var(--admin-bg)] transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--admin-fg)' }}>{ps.projectName ?? '—'}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--admin-muted)' }}>{ps.clientName ?? '—'}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--admin-muted)' }}>
                      {String(ps.lineCount)} ligne{Number(ps.lineCount) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Link
                    href={`/admin/projects/${ps.projectId}/etudes`}
                    className="shrink-0 text-[11px] hover:underline"
                    style={{ color: 'var(--green)' }}
                  >
                    <ExternalLink size={12} />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: top species */}
        <div className="lg:col-span-2 space-y-4">
          {/* Top species */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-muted)' }}>
                Espèces les plus utilisées
              </p>
            </div>
            <div className="p-4 space-y-2">
              {topSpecies.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>Aucune donnée.</p>
              ) : topSpecies.map(([name, stats]) => (
                <div key={name} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[12px] italic font-medium truncate" style={{ color: 'var(--admin-fg)' }}>{name}</span>
                      <span className="text-[11px] shrink-0 ml-2" style={{ color: 'var(--admin-muted)' }}>
                        {stats.count} projet{stats.count !== 1 ? 's' : ''} · {stats.totalQty.toFixed(0)} u.
                      </span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ background: 'var(--admin-bg)' }}>
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, (stats.count / (topSpecies[0]?.[1].count ?? 1)) * 100)}%`,
                          background: 'var(--green)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Full article table with filters */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <form method="get" className="flex-1 min-w-[200px]">
            {catFilter && <input type="hidden" name="cat" value={catFilter} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Rechercher par espèce, projet, client…"
              className="w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-fg)' }}
            />
          </form>
          <div className="flex gap-1.5 flex-wrap">
            <Link
              href={q ? `?q=${encodeURIComponent(q)}` : '/admin/etude/project-articles'}
              className="px-3 py-1.5 rounded-lg border text-[12px] font-medium"
              style={!catFilter
                ? { background: 'var(--admin-fg)', color: 'var(--admin-surface)', borderColor: 'transparent' }
                : { borderColor: 'var(--admin-border)', color: 'var(--admin-muted)', background: 'var(--admin-bg)' }
              }
            >Toutes</Link>
            {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
              <Link
                key={k}
                href={q ? `?q=${encodeURIComponent(q)}&cat=${k}` : `?cat=${k}`}
                className="px-3 py-1.5 rounded-lg border text-[12px] font-medium"
                style={catFilter === k
                  ? { background: 'var(--admin-fg)', color: 'var(--admin-surface)', borderColor: 'transparent' }
                  : { borderColor: 'var(--admin-border)', color: 'var(--admin-muted)', background: 'var(--admin-bg)' }
                }
              >{label}</Link>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border p-10 text-center" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>Aucun article trouvé.</p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              <p className="text-[11px]" style={{ color: 'var(--admin-muted)' }}>{filtered.length} article(s)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    {['Espèce (botanique)', 'Nom commun', 'Catégorie', 'Qté', 'Unité', 'Projet', 'Observations', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                      <td className="px-4 py-3 italic text-[13px] font-medium" style={{ color: 'var(--admin-fg)' }}>
                        {item.botanicalName}
                      </td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-muted)' }}>
                        {item.commonName ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'var(--admin-bg)', color: CATEGORY_COLORS[item.category] ?? 'var(--admin-muted)', border: '1px solid var(--admin-border)' }}
                        >
                          {CATEGORY_LABELS[item.category] ?? item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] font-medium" style={{ color: 'var(--admin-fg)' }}>
                        {Number(item.quantity).toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-muted)' }}>
                        {item.unit}
                      </td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-muted)' }}>
                        {item.projectName ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-muted)' }}>
                        {item.notes ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/projects/${item.projectId}/etudes`}
                          className="inline-flex items-center gap-1 text-[11px] hover:underline"
                          style={{ color: 'var(--green)' }}
                        >
                          <ExternalLink size={11} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
