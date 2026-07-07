'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'

const EVENT_TYPE_LABELS: Record<string, string> = {
  nettoyage_plage:        'Nettoyage plage',
  plantation:             'Plantation',
  sensibilisation:        'Sensibilisation',
  team_building:          'Team building',
  journee_environnement:  'Journée env.',
  autre:                  'Autre',
}

// Explicit hex palette — no Tailwind/Tremor resolution needed
const PALETTE = ['#1C7A48', '#2563EB', '#B8870A', '#0D9488', '#DC2626', '#7C3AED', '#0891B2', '#65A30D']

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

const tooltipStyle = {
  backgroundColor: 'var(--admin-surface)',
  border: '1px solid var(--admin-border)',
  borderRadius: '8px',
  color: 'var(--admin-text)',
  fontSize: '12px',
}

function EmptyChart() {
  return (
    <div className="h-[220px] flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucune donnée disponible</p>
    </div>
  )
}

// Custom bar shape with rounded top corners
function RoundedBar(props: any) {
  const { x, y, width, height, fill } = props
  if (!height || height <= 0) return null
  const r = Math.min(4, width / 2)
  return (
    <path
      d={`M${x + r},${y} h${width - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${height - r} h${-width} v${-(height - r)} a${r},${r} 0 0 1 ${r},${-r}z`}
      fill={fill}
    />
  )
}

export function RseImpactCharts({ yearlyData, byType, recentEvents }: Props) {
  const wasteData  = yearlyData.map((d) => ({ year: String(d.year), value: Number(d.wasteKg) }))
  const treesData  = yearlyData.map((d) => ({ year: String(d.year), value: Number(d.trees) }))

  const typeData = byType.map((d) => ({
    name:  EVENT_TYPE_LABELS[d.eventType] ?? d.eventType,
    value: Number(d.count),
  }))

  const participantsData = recentEvents
    .filter((e) => e.participants != null)
    .map((e) => ({
      name:  String(e.title).length > 26 ? String(e.title).slice(0, 26) + '…' : String(e.title),
      value: e.participants ?? 0,
    }))
    .reverse()
    .slice(0, 10)

  const axisStyle = { fontSize: 11, fill: 'var(--admin-text-muted)' } as const

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* Waste per year */}
      <div className="rounded-xl border p-5" style={cardStyle}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>
          Déchets collectés par année (kg)
        </h3>
        {wasteData.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={wasteData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false} />
              <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${v} kg`} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: 'rgba(28,122,72,0.06)' }}
                formatter={(v: number) => [`${v} kg`, 'Déchets']}
              />
              <Bar dataKey="value" shape={<RoundedBar />} radius={[4, 4, 0, 0]}>
                {wasteData.map((_, i) => (
                  <Cell key={i} fill="#1C7A48" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Trees per year */}
      <div className="rounded-xl border p-5" style={cardStyle}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>
          Arbres plantés par année
        </h3>
        {treesData.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={treesData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false} />
              <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${v}`} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: 'rgba(13,148,136,0.06)' }}
                formatter={(v: number) => [`${v} arbres`, 'Plantation']}
              />
              <Bar dataKey="value" shape={<RoundedBar />} radius={[4, 4, 0, 0]}>
                {treesData.map((_, i) => (
                  <Cell key={i} fill="#0D9488" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Events by type — Donut */}
      <div className="rounded-xl border p-5" style={cardStyle}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>
          Événements par type
        </h3>
        {typeData.length === 0 ? <EmptyChart /> : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={typeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={88}
                  innerRadius={48}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, name: string) => [`${v} evt`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="space-y-2 min-w-0 flex-1">
              {typeData.map((d, i) => (
                <li key={d.name} className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: PALETTE[i % PALETTE.length] }}
                    />
                    <span className="truncate" style={{ color: 'var(--admin-text-muted)' }}>{d.name}</span>
                  </div>
                  <span className="tabular-nums font-semibold shrink-0" style={{ color: 'var(--admin-text)' }}>{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Participants per event — horizontal bar */}
      <div className="rounded-xl border p-5" style={cardStyle}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>
          Participants (10 derniers événements)
        </h3>
        {participantsData.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={participantsData}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              barCategoryGap="25%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" horizontal={false} />
              <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: 'rgba(37,99,235,0.06)' }}
                formatter={(v: number) => [`${v} personnes`, 'Participants']}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#2563EB">
                {participantsData.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  )
}
