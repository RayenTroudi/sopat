'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

const EVENT_TYPE_LABELS: Record<string, string> = {
  nettoyage_plage: 'Nettoyage plage',
  plantation: 'Plantation',
  sensibilisation: 'Sensibilisation',
  team_building: 'Team building',
  journee_environnement: 'Journée env.',
  autre: 'Autre',
}

const PIE_COLORS = ['#22c55e', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

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

  const chartStyle = {
    background: 'var(--admin-surface)',
    borderColor: 'var(--admin-border)',
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Waste per year */}
      <div className="rounded-xl border p-4" style={chartStyle}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>
          Déchets collectés par année (kg)
        </h3>
        {wasteData.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={wasteData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: 'var(--admin-text-muted)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--admin-text-muted)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--admin-text)' }}
              />
              <Bar dataKey="kg" name="Kg déchets" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Trees per year */}
      <div className="rounded-xl border p-4" style={chartStyle}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>
          Arbres plantés par année
        </h3>
        {treesData.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={treesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: 'var(--admin-text-muted)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--admin-text-muted)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--admin-text)' }}
              />
              <Bar dataKey="trees" name="Arbres" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Events by type */}
      <div className="rounded-xl border p-4" style={chartStyle}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>
          Événements par type
        </h3>
        {typeData.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
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
                {typeData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 8 }}
              />
              <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Participants per event */}
      <div className="rounded-xl border p-4" style={chartStyle}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>
          Participants (10 derniers événements)
        </h3>
        {participantsData.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={participantsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }} />
              <YAxis dataKey="title" type="category" tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }} width={120} />
              <Tooltip
                contentStyle={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--admin-text)' }}
              />
              <Bar dataKey="participants" name="Participants" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
