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
  highlight?: boolean
  children?:  React.ReactNode
}

export function MetricCard({ title, value, subtitle, trend, accent = 'green', icon: Icon, highlight, children }: Props) {
  const accentColors = {
    green:  { value: '#2F6F4F',                 iconBg: 'rgba(47,111,79,0.12)', iconFg: '#2F6F4F' },
    amber:  { value: 'rgba(47,111,79,0.65)',    iconBg: 'rgba(47,111,79,0.08)', iconFg: 'rgba(47,111,79,0.65)' },
    red:    { value: 'rgba(47,111,79,0.35)',    iconBg: 'rgba(47,111,79,0.06)', iconFg: 'rgba(47,111,79,0.35)' },
    blue:   { value: '#2F6F4F',                 iconBg: 'rgba(47,111,79,0.12)', iconFg: '#2F6F4F' },
    muted:  { value: 'var(--admin-text-muted)', iconBg: 'var(--admin-bg)',      iconFg: 'var(--admin-text-muted)' },
  }
  const colors = accentColors[accent]

  const trendUp   = trend && trend.value > 0
  const trendDown = trend && trend.value < 0

  const cardStyle = highlight
    ? { background: 'linear-gradient(135deg, #2F6F4F 0%, #3a8a60 70%, #8a7a3a 100%)', border: 'none' }
    : undefined

  const highlightText  = highlight ? '#ffffff' : undefined
  const highlightMuted = highlight ? 'rgba(255,255,255,0.85)' : undefined

  return (
    <div className="admin-card cursor-default flex flex-col" style={cardStyle}>
      <div className="p-4 flex-1 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && (
              <div
                className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                style={{ background: highlight ? 'rgba(255,255,255,0.2)' : colors.iconBg }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: highlight ? '#ffffff' : '#000000' }} />
              </div>
            )}
            <p className="text-xs font-medium truncate" style={{ color: highlightMuted ?? '#000000' }}>
              {title}
            </p>
          </div>
          {trend !== undefined && (
            <span
              className="flex items-center gap-0.5 text-[11px] font-medium shrink-0"
              style={{ color: highlight ? '#ffffff' : '#000000' }}
            >
              {trendUp ? <ArrowUp className="w-3 h-3" /> : trendDown ? <ArrowDown className="w-3 h-3" /> : null}
              {trend.value > 0 ? '+' : ''}{trend.value}
            </span>
          )}
        </div>

        <div>
          <p
            className="text-2xl font-bold leading-none tabular-nums"
            style={{ color: highlightText ?? '#000000', letterSpacing: '-0.02em' }}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-[11px] mt-1.5 leading-tight" style={{ color: highlightMuted ?? '#000000' }}>
              {subtitle}
            </p>
          )}
        </div>

        {children}
      </div>
    </div>
  )
}
