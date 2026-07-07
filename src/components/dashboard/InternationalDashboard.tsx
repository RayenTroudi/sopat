'use client'

import { BarChart } from '@tremor/react'
import type { CountryProjectSummary } from '@/lib/db/international'
import { REGION_LABELS, REGION_COLORS } from '@/lib/db/international'

const FMT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

function fmtTnd(n: number | null) {
  if (n === null) return '—'
  return `${FMT.format(n)} DT`
}

type Props = { data: CountryProjectSummary[] }

const REGIONS = ['africa', 'europe', 'middle_east'] as const

export function InternationalDashboard({ data }: Props) {
  const byRegion = Object.fromEntries(
    REGIONS.map((r) => [r, data.filter((c) => c.region === r)])
  ) as Record<typeof REGIONS[number], CountryProjectSummary[]>

  const chartData = data
    .filter((c) => c.projectCount > 0)
    .sort((a, b) => b.projectCount - a.projectCount)
    .map((c) => ({
      name:    `${c.flag} ${c.countryName}`,
      Projets: c.projectCount,
    }))

  return (
    <div className="space-y-6">
      {/* Bar chart */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Projets par pays</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            Nombre de projets — budget total en équivalent DT
          </p>
        </div>
        <div className="p-5">
          {chartData.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--admin-text-muted)' }}>Aucune donnée.</p>
          ) : (
            <BarChart
              data={chartData}
              index="name"
              categories={['Projets']}
              colors={['emerald']}
              valueFormatter={(v) => `${v} projet${v !== 1 ? 's' : ''}`}
              showLegend={false}
              showGridLines={false}
              className="h-64"
            />
          )}

          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t" style={{ borderColor: 'var(--admin-border)' }}>
            {REGIONS.map((r) => (
              <div key={r} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: REGION_COLORS[r] }} />
                <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{REGION_LABELS[r]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Regional breakdown table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Projets actifs par région</h2>
        </div>
        <div className="p-5 space-y-6">
          {REGIONS.map((region) => {
            const countries = byRegion[region]?.filter((c) => c.projectCount > 0) ?? []
            if (countries.length === 0) return null
            return (
              <div key={region}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: 'var(--admin-border)' }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: REGION_COLORS[region] }} />
                  <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: REGION_COLORS[region] }}>
                    {REGION_LABELS[region]}
                  </h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      {['Pays', 'Projets', 'Actifs', 'Budget total (DT)', 'Dépenses (DT)'].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {countries.map((c) => (
                      <tr key={c.country} className="hover:bg-[var(--admin-bg)] transition-colors" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                        <td className="px-3 py-3">
                          <span className="text-base mr-2">{c.flag}</span>
                          <span className="font-medium" style={{ color: 'var(--admin-text)' }}>{c.countryName}</span>
                        </td>
                        <td className="px-3 py-3 tabular-nums text-center" style={{ color: 'var(--admin-text)' }}>{c.projectCount}</td>
                        <td className="px-3 py-3 tabular-nums text-center">
                          <span className="text-xs px-2 py-0.5 rounded font-medium" style={{
                            background: c.activeCount > 0 ? 'var(--admin-emerald-dim)' : 'var(--admin-bg)',
                            color:      c.activeCount > 0 ? 'var(--admin-emerald)'     : 'var(--admin-text-muted)',
                          }}>
                            {c.activeCount}
                          </span>
                        </td>
                        <td className="px-3 py-3 tabular-nums text-right text-xs font-medium" style={{ color: 'var(--admin-text)' }}>{fmtTnd(c.budgetTND)}</td>
                        <td className="px-3 py-3 tabular-nums text-right text-xs" style={{ color: 'var(--admin-text-muted)' }}>{fmtTnd(c.actualSpendTND)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
