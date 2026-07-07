'use client'

import { PieChart, Pie, Cell } from 'recharts'

type Slice = { name: string; value: number; color: string }

type Props = { data: Slice[]; size?: number }

export function MiniPie({ data, size = 64 }: Props) {
  if (data.every((d) => d.value === 0)) return null

  return (
    <PieChart width={size} height={size}>
      <Pie
        data={data}
        dataKey="value"
        cx="50%"
        cy="50%"
        innerRadius={size * 0.28}
        outerRadius={size * 0.46}
        paddingAngle={2}
        strokeWidth={0}
      >
        {data.map((slice, i) => (
          <Cell key={i} fill={slice.color} />
        ))}
      </Pie>
    </PieChart>
  )
}
