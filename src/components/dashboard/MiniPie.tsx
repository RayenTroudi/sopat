'use client'

import { PieChart, Pie, Cell, Tooltip } from 'recharts'

type Slice = { name: string; value: number; color: string }

type Props = { data: Slice[]; size?: number }

export function MiniPie({ data, size = 64 }: Props) {
  if (data.every((d) => d.value === 0)) return null

  return (
    <PieChart width={size} height={size}>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={size * 0.28}
        outerRadius={size * 0.48}
        dataKey="value"
        strokeWidth={0}
      >
        {data.map((entry, i) => (
          <Cell key={i} fill={entry.color} />
        ))}
      </Pie>
      <Tooltip
        content={({ active, payload }) => {
          if (!active || !payload?.length) return null
          const d = payload[0]?.payload as Slice
          return (
            <div
              className="text-xs px-2 py-1 rounded shadow"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
            >
              {d.name} : {d.value}
            </div>
          )
        }}
      />
    </PieChart>
  )
}
