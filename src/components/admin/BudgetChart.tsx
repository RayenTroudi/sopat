'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface ChartData {
  name: string
  budget: number
  actual: number
}

const fmt = (v: number) =>
  v >= 1000
    ? (v / 1000).toLocaleString('fr-TN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' k'
    : v.toLocaleString('fr-TN', { minimumFractionDigits: 0 })

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{
        background: 'var(--admin-card)',
        border: '1px solid var(--admin-border)',
        fontFamily: 'var(--font-sans)',
        minWidth: 160,
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
      }}
    >
      <p
        className="text-xs font-semibold mb-2.5 pb-2"
        style={{
          color: 'var(--admin-accent)',
          borderBottom: '1px solid var(--admin-border)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-6 mb-1 last:mb-0">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              {entry.name}
            </span>
          </div>
          <span className="text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
            {fmt(entry.value)} TND
          </span>
        </div>
      ))}
    </div>
  )
}

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload) return null
  return (
    <div className="flex items-center justify-center gap-6 mt-2">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-2">
          <span
            className="w-3 h-1.5 rounded-full"
            style={{ background: entry.color }}
          />
          <span
            className="text-xs"
            style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}
          >
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function BudgetChart({ data }: { data: ChartData[] }) {
  if (!data.length) {
    return (
      <div
        className="flex flex-col items-center justify-center h-56 gap-3"
        style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}
      >
        <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
            d="M16 8v8m-4-5v5M8 11v5M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
        <p className="text-sm">Aucun projet à afficher</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: -8, bottom: 4 }}
        barCategoryGap="30%"
        barGap={4}
      >
        <defs>
          <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4CAF80" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#2A6B47" stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8C96A" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#9A7020" stopOpacity={0.7} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="0"
          stroke="var(--admin-border)"
          vertical={false}
          strokeWidth={1}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fontFamily: 'var(--font-sans)', fill: 'var(--admin-text-muted)' }}
          axisLine={{ stroke: 'var(--admin-border)' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={fmt}
          tick={{ fontSize: 10, fontFamily: 'var(--font-sans)', fill: 'var(--admin-text-muted)' }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(201, 168, 76, 0.04)', radius: 4 }}
        />
        <Legend content={<CustomLegend />} />
        <Bar dataKey="budget" name="Budget" fill="url(#budgetGrad)" radius={[5, 5, 0, 0]} maxBarSize={32} />
        <Bar dataKey="actual" name="Coûts réels" fill="url(#actualGrad)" radius={[5, 5, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  )
}
