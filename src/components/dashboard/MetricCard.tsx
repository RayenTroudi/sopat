import React from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Trend = { value: number; suffix?: string }

type Props = {
  title:      string
  value:      string | number
  subtitle?:  string
  trend?:     Trend
  isoClause?: string
  accent?:    'green' | 'amber' | 'red' | 'blue' | 'muted'
  icon?:      LucideIcon
  children?:  React.ReactNode
}

export function MetricCard({ title, value, subtitle, trend, accent = 'green', icon: Icon, children }: Props) {
  const accentColors = {
    green:  { value: 'var(--admin-emerald)', iconBg: 'var(--admin-emerald-dim)', iconFg: 'var(--admin-emerald)' },
    amber:  { value: 'var(--admin-amber)',   iconBg: 'var(--admin-amber-dim)',   iconFg: 'var(--admin-amber)'   },
    red:    { value: 'var(--admin-red)',     iconBg: 'var(--admin-red-dim)',     iconFg: 'var(--admin-red)'     },
    blue:   { value: 'var(--admin-blue)',    iconBg: 'var(--admin-blue-dim)',    iconFg: 'var(--admin-blue)'    },
    muted:  { value: 'var(--admin-text-muted)', iconBg: 'var(--admin-bg)',      iconFg: 'var(--admin-text-muted)' },
  }
  const colors = accentColors[accent]

  const trendUp = trend && trend.value > 0
  const trendDown = trend && trend.value < 0

  return (
    <div className="admin-card cursor-default flex flex-col">
      <div className="p-4 flex-1 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && (
              <div
                className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                style={{ background: colors.iconBg }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: colors.iconFg }} />
              </div>
            )}
            <p className="text-xs font-medium truncate" style={{ color: 'var(--admin-text-muted)' }}>
              {title}
            </p>
          </div>
          {trend !== undefined && (
            <span
              className="flex items-center gap-0.5 text-[11px] font-medium shrink-0"
              style={{ color: trendUp ? 'var(--admin-red)' : trendDown ? 'var(--admin-emerald)' : 'var(--admin-text-muted)' }}
            >
              {trendUp ? <ArrowUp className="w-3 h-3" /> : trendDown ? <ArrowDown className="w-3 h-3" /> : null}
              {trend.value > 0 ? '+' : ''}{trend.value}
            </span>
          )}
        </div>

        <div>
          <p
            className="text-2xl font-bold leading-none tabular-nums"
            style={{ color: colors.value, letterSpacing: '-0.02em' }}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-[11px] mt-1.5 leading-tight" style={{ color: 'var(--admin-text-muted)' }}>
              {subtitle}
            </p>
          )}
        </div>

        {children}
      </div>
    </div>
  )
}
