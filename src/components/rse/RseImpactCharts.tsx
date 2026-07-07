'use client'

import { BarChart, DonutChart, BarList } from '@tremor/react'

const EVENT_TYPE_LABELS: Record<string, string> = {
  nettoyage_plage:        'Nettoyage plage',
  plantation:             'Plantation',
  sensibilisation:        'Sensibilisation',
  team_building:          'Team building',
  journee_environnement:  'Journée env.',
  autre:                  'Autre',
}

type Props = {
  yearlyData: Array<{
    year: number
    wasteKg: number
    trees: number
    participants: number
    eventCount: number
  }>
  byType: Array<{ eventType: string; count: number }>
  recentEvents: Array<{ id: string; title: string; date: Date | string; participants: number | null }>
}

const cardStyle = {
  background: 'var(--admin-surface)',
  borderColor: 'var(--admin-border)',
}

function EmptyChart() {
  return (
    <div className="h-[220px] flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucune donnée disponible</p>
    </div>
  )
}

export function RseImpactCharts({ yearlyData, byType, recentEvents }: Props) {
  const wasteData  = yearlyData.map((d) => ({ Année: String(d.year), 'Kg déchets': Number(d.wasteKg) }))
  const treesData  = yearlyData.map((d) => ({ Année: String(d.year), 'Arbres': Number(d.trees) }))

  const typeData = byType.map((d) => ({
    name:  EVENT_TYPE_LABELS[d.eventType] ?? d.eventType,
    value: Number(d.count),
  }))

  const participantsData = recentEvents
    .filter((e) => e.participants != null)
    .map((e) => ({
      name:  String(e.title).length > 28 ? String(e.title).slice(0, 28) + '…' : String(e.title),
      value: e.participants ?? 0,
    }))
    .reverse()
    .slice(0, 10)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Waste per year */}
      <div className="rounded-xl border p-5" style={cardStyle}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>
          Déchets collectés par année (kg)
        </h3>
        {wasteData.length === 0 ? <EmptyChart /> : (
          <BarChart
            data={wasteData}
            index="Année"
            categories={['Kg déchets']}
            colors={['emerald']}
            valueFormatter={(v: number) =>`${v} kg`}
            showLegend={false}
            showGridLines={false}
            className="h-[220px]"
          />
        )}
      </div>

      {/* Trees per year */}
      <div className="rounded-xl border p-5" style={cardStyle}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>
          Arbres plantés par année
        </h3>
        {treesData.length === 0 ? <EmptyChart /> : (
          <BarChart
            data={treesData}
            index="Année"
            categories={['Arbres']}
            colors={['teal']}
            valueFormatter={(v: number) =>`${v} arbres`}
            showLegend={false}
            showGridLines={false}
            className="h-[220px]"
          />
        )}
      </div>

      {/* Events by type — DonutChart */}
      <div className="rounded-xl border p-5" style={cardStyle}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>
          Événements par type
        </h3>
        {typeData.length === 0 ? <EmptyChart /> : (
          <div className="flex items-center gap-6">
            <DonutChart
              data={typeData}
              category="value"
              index="name"
              colors={['emerald', 'blue', 'amber', 'teal', 'rose', 'slate']}
              valueFormatter={(v: number) =>`${v} evt`}
              showLabel={false}
              className="h-[180px] w-[180px] shrink-0"
            />
            <ul className="space-y-1.5 min-w-0">
              {typeData.map((d) => (
                <li key={d.name} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate" style={{ color: 'var(--admin-text-muted)' }}>{d.name}</span>
                  <span className="tabular-nums font-medium shrink-0" style={{ color: 'var(--admin-text)' }}>{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Participants per event — BarList */}
      <div className="rounded-xl border p-5" style={cardStyle}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>
          Participants (10 derniers événements)
        </h3>
        {participantsData.length === 0 ? <EmptyChart /> : (
          <BarList
            data={participantsData}
            valueFormatter={(v: number) =>`${v} part.`}
            color="blue"
            className="mt-2"
          />
        )}
      </div>
    </div>
  )
}
