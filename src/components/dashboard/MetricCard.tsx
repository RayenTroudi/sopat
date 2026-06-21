import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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

export function MetricCard({ title, value, subtitle, trend, isoClause, accent = 'green', icon: Icon, children }: Props) {
  const accentColors = {
    green:  { text: 'var(--admin-emerald)', bg: 'var(--admin-emerald-dim)', bar: 'var(--admin-emerald)' },
    amber:  { text: 'var(--admin-amber)',   bg: 'var(--admin-amber-dim)',   bar: 'var(--admin-amber)'   },
    red:    { text: 'var(--admin-red)',     bg: 'var(--admin-red-dim)',     bar: 'var(--admin-red)'     },
    blue:   { text: 'var(--admin-blue)',    bg: 'var(--admin-blue-dim)',    bar: 'var(--admin-blue)'    },
    muted:  { text: 'var(--admin-text-muted)', bg: 'var(--admin-bg)',      bar: 'var(--admin-border)'  },
  }
  const colors = accentColors[accent]

  const trendPositive = trend && trend.value > 0
  const trendNegative = trend && trend.value < 0
  const trendColor = trendPositive
    ? 'var(--admin-red)'
    : trendNegative ? 'var(--admin-emerald)' : 'var(--admin-text-muted)'

  return (
    <div
      className="rounded-xl border overflow-hidden min-h-[140px] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default flex flex-col"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
    >
      {/* Top accent bar */}
      <div className="h-1 shrink-0" style={{ background: colors.bar }} />

      {/* Content */}
      <div className="p-5 space-y-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
              {title}
            </p>
            {isoClause && (
              <Badge variant="outline" className="mt-0.5 text-[10px] px-1.5 py-0" style={{ color: 'var(--admin-text-muted)', borderColor: 'var(--admin-border)' }}>
                ISO {isoClause}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {trend !== undefined && (
              <span
                className="flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full"
                style={{ color: trendColor, background: trendPositive ? 'var(--admin-red-dim)' : trendNegative ? 'var(--admin-emerald-dim)' : 'var(--admin-bg)' }}
              >
                {trendPositive
                  ? <TrendingUp className="w-3 h-3" />
                  : trendNegative ? <TrendingDown className="w-3 h-3" /> : null}
                {trend.value > 0 ? '+' : ''}{trend.value}{trend.suffix ?? ''}
              </span>
            )}
            {Icon && <Icon className="w-4 h-4" style={{ color: 'var(--admin-text-dim)' }} />}
          </div>
        </div>

        <div>
          <p className="text-3xl font-bold tabular-nums tracking-tight leading-none" style={{ color: colors.text }}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>{subtitle}</p>
          )}
        </div>

        {children}
      </div>
    </div>
  )
}
