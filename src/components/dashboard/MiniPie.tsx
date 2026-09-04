'use client'

import { useId } from 'react'
import { PieChart, Pie, Cell } from 'recharts'

type Slice = { name: string; value: number; color: string }

type Props = { data: Slice[]; size?: number }

/**
 * Small decorative pie for the metric cards.
 *
 * Two recharts defaults are overridden here because both differ between the
 * server pass and hydration, and either one alone breaks the whole tree:
 *
 *  - `id`: without it recharts names its clipPath from a module-level counter
 *    (`uniqueId('recharts')`), so the server emits `recharts1-clip` while the
 *    browser expects `recharts2-clip`. A `useId()` value is stable across both
 *    passes, which is exactly what that counter is not.
 *  - `isAnimationActive`: its default is `!Global.isSsr` — literally "am I in a
 *    browser" — so the server renders the plain sectors and the client renders
 *    them wrapped in an animation layer. Pinning it to a constant makes the two
 *    passes agree; the entrance sweep is not worth a hydration mismatch on a
 *    56px chart.
 */
export function MiniPie({ data, size = 64 }: Props) {
  const chartId = useId()

  if (data.every((d) => d.value === 0)) return null

  return (
    <PieChart id={chartId} width={size} height={size}>
      <Pie
        data={data}
        dataKey="value"
        cx="50%"
        cy="50%"
        innerRadius={size * 0.28}
        outerRadius={size * 0.46}
        paddingAngle={2}
        strokeWidth={0}
        isAnimationActive={false}
      >
        {data.map((slice, i) => (
          <Cell key={i} fill={slice.color} />
        ))}
      </Pie>
    </PieChart>
  )
}
