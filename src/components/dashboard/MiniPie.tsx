'use client'

import { DonutChart } from '@tremor/react'

type Slice = { name: string; value: number; color: string }

type Props = { data: Slice[]; size?: number }

export function MiniPie({ data, size = 64 }: Props) {
  if (data.every((d) => d.value === 0)) return null

  return (
    <div style={{ width: size, height: size }}>
      <DonutChart
        data={data}
        category="value"
        index="name"
        colors={['emerald', 'blue', 'amber']}
        showLabel={false}
        className="h-full w-full"
      />
    </div>
  )
}
