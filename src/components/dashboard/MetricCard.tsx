import React from 'react'
import { cn } from '@/lib/utils'

type Trend = { value: number; suffix?: string }

type Props = {
  title:       string
  value:       string | number
  subtitle?:   string
  trend?:      Trend
  isoClause?:  string
  accent?:     'green' | 'amber' | 'red' | 'blue' | 'muted'
  children?:   React.ReactNode  // additional content below the value
}

export function MetricCard({ title, value, subtitle, trend, isoClause, accent = 'green', children }: Props) {
  const accentColors = {
    green:  { text: 'var(--admin-emerald)', bg: 'var(--admin-emerald-dim)' },
    amber:  { text: 'var(--admin-amber)',   bg: 'var(--admin-amber-dim)'   },
    red:    { text: 'var(--admin-red)',     bg: 'var(--admin-red-dim)'     },
    blue:   { text: 'var(--admin-blue)',    bg: 'var(--admin-blue-dim)'    },
    muted:  { text: 'var(--admin-text-muted)', bg: 'var(--admin-bg)'      },
  }
  const colors = accentColors[accent]

  const trendPositive = trend && trend.value > 0
  const trendColor = trendPositive ? 'var(--admin-red)' : trend && trend.value < 0 ? 'var(--admin-emerald)' : 'var(--admin-text-muted)'

  return (
    <div
      className="rounded-xl border p-5 space-y-3"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
            {title}
          </p>
          {isoClause && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)', opacity: 0.7 }}>
              ISO {isoClause}
            </p>
          )}
        </div>
        {trend !== undefined && (
          <span className="text-xs font-medium shrink-0" style={{ color: trendColor }}>
            {trend.value > 0 ? '+' : ''}{trend.value}{trend.suffix ?? ''}
          </span>
        )}
      </div>

      <div>
        <p className="text-3xl font-bold tabular-nums" style={{ color: colors.text }}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>{subtitle}</p>
        )}
      </div>

      {children}
    </div>
  )
}
