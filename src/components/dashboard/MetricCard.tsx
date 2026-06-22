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
    green:  { text: 'var(--admin-emerald)', bg: 'var(--admin-emerald-dim)', bar: 'var(--admin-emerald)', iconBg: 'var(--admin-emerald-dim)', iconFg: 'var(--admin-emerald)' },
    amber:  { text: 'var(--admin-amber)',   bg: 'var(--admin-amber-dim)',   bar: 'var(--admin-amber)',   iconBg: 'var(--admin-amber-dim)',   iconFg: 'var(--admin-amber)'   },
    red:    { text: 'var(--admin-red)',     bg: 'var(--admin-red-dim)',     bar: 'var(--admin-red)',     iconBg: 'var(--admin-red-dim)',     iconFg: 'var(--admin-red)'     },
    blue:   { text: 'var(--admin-blue)',    bg: 'var(--admin-blue-dim)',    bar: 'var(--admin-blue)',    iconBg: 'var(--admin-blue-dim)',    iconFg: 'var(--admin-blue)'    },
    muted:  { text: 'var(--admin-text)',    bg: 'var(--admin-bg)',          bar: 'var(--admin-border-light)', iconBg: 'var(--admin-bg)',      iconFg: 'var(--admin-text-muted)' },
  }
  const colors = accentColors[accent]

  const trendPositive = trend && trend.value > 0
  const trendNegative = trend && trend.value < 0
  const trendColor = trendPositive
    ? 'var(--admin-red)'
    : trendNegative ? 'var(--admin-emerald)' : 'var(--admin-text-muted)'

  return (
    <div
      className="admin-card admin-card-hover overflow-hidden min-h-[140px] hover:-translate-y-0.5 cursor-default flex flex-col"
    >
      {/* Top accent bar with soft gradient */}
      <div
        className="h-1 shrink-0"
        style={{ background: `linear-gradient(to right, ${colors.bar}, ${colors.bar}cc)` }}
      />

      {/* Content */}
      <div className="p-5 space-y-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
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
            {Icon && (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: colors.iconBg }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: colors.iconFg }} />
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="t-metric leading-none" style={{ color: colors.text }}>
            {value}
          </p>
          {subtitle && (
            <p className="t-helper mt-1.5">{subtitle}</p>
          )}
        </div>

        {children}
      </div>
    </div>
  )
}
