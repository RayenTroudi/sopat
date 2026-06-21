'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const EVENT_TYPE_LABELS: Record<string, string> = {
  nettoyage_plage:        'Nettoyage plage',
  plantation:             'Plantation',
  sensibilisation:        'Sensibilisation',
  team_building:          'Team building',
  journee_environnement:  'Journée env.',
  autre:                  'Autre',
}

const PIE_COLORS = [
  'var(--admin-emerald)',
  'var(--admin-blue)',
  'var(--admin-amber)',
  'var(--admin-accent)',
  'var(--admin-red)',
  'var(--admin-text-muted)',
]

// Resolved hex values for Recharts Cell (CSS vars not supported inside SVG fill)
const PIE_COLORS_HEX = ['#1C7A48', '#2563EB', '#B8870A', '#C9A84C', '#D94F4F', '#5A7A6A']

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

const wasteConfig = {
  kg: { label: 'Kg déchets', color: 'var(--admin-emerald)' },
} satisfies ChartConfig

const treesConfig = {
  trees: { label: 'Arbres', color: '#1C3D2E' },
} satisfies ChartConfig

const participantsConfig = {
  participants: { label: 'Participants', color: 'var(--admin-blue)' },
} satisfies ChartConfig

const cardStyle = {
  background: 'var(--admin-surface)',
  borderColor: 'var(--admin-border)',
}

export function RseImpactCharts({ yearlyData, byType, recentEvents }: Props) {
  const wasteData = yearlyData.map((d) => ({ year: String(d.year), kg: Number(d.wasteKg) }))
  const treesData = yearlyData.map((d) => ({ year: String(d.year), trees: Number(d.trees) }))
  const typeData = byType.map((d) => ({
    name: EVENT_TYPE_LABELS[d.eventType] ?? d.eventType,
    value: Number(d.count),
  }))
  const participantsData = recentEvents
    .filter((e) => e.participants != null)
    .map((e) => ({
      title: String(e.title).length > 20 ? String(e.title).slice(0, 20) + '…' : String(e.title),
      participants: e.participants ?? 0,
    }))
    .reverse()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Waste per year */}
      <div className="rounded-xl border p-5" style={cardStyle}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>
          Déchets collectés par année (kg)
        </h3>
        {wasteData.length === 0 ? <EmptyChart /> : (
          <ChartContainer config={wasteConfig} className="h-[220px] w-full">
            <BarChart data={wasteData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: 'var(--admin-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--admin-text-muted)' }} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="kg" fill="var(--admin-emerald)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </div>

      {/* Trees per year */}
      <div className="rounded-xl border p-5" style={cardStyle}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>
          Arbres plantés par année
        </h3>
        {treesData.length === 0 ? <EmptyChart /> : (
          <ChartContainer config={treesConfig} className="h-[220px] w-full">
            <BarChart data={treesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: 'var(--admin-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--admin-text-muted)' }} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="trees" fill="var(--green)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </div>

      {/* Events by type */}
      <div className="rounded-xl border p-5" style={cardStyle}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>
          Événements par type
        </h3>
        {typeData.length === 0 ? <EmptyChart /> : (
          <ChartContainer config={{}} className="h-[220px] w-full">
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="value"
                nameKey="name"
              >
                {typeData.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={PIE_COLORS_HEX[i % PIE_COLORS_HEX.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ChartContainer>
        )}
      </div>

      {/* Participants per event */}
      <div className="rounded-xl border p-5" style={cardStyle}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>
          Participants (10 derniers événements)
        </h3>
        {participantsData.length === 0 ? <EmptyChart /> : (
          <ChartContainer config={participantsConfig} className="h-[220px] w-full">
            <BarChart data={participantsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="title"
                type="category"
                tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }}
                width={120}
                axisLine={false}
                tickLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="participants" fill="var(--admin-blue)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="h-[220px] flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucune donnée disponible</p>
    </div>
  )
}
