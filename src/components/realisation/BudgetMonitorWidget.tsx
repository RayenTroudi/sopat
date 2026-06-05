'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

function fmt(n: number) {
  return `${FMT.format(Math.round(n))} TND`
}

type Props = {
  projectId:      string
  approvedBudget: string | null
}

type BudgetState = {
  totalSpent:   number
  mlPredicted:  number | null
  loading:      boolean
}

export function BudgetMonitorWidget({ projectId, approvedBudget }: Props) {
  const approved = approvedBudget ? parseFloat(approvedBudget) : null
  const [state, setState] = useState<BudgetState>({ totalSpent: 0, mlPredicted: null, loading: true })

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/budget-reconciliation`)
      if (!res.ok) return
      const data = await res.json() as { totalSpent: string; reconciliation: { totalSpent: string } | null }
      const spent = parseFloat(data.totalSpent ?? '0')
      setState((s) => ({ ...s, totalSpent: spent, loading: false }))
    } catch {
      setState((s) => ({ ...s, loading: false }))
    }
  }, [projectId])

  useEffect(() => { void load() }, [load])

  if (!approved) {
    return (
      <div
        className="rounded-xl border p-4 flex items-center gap-3"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        <div className="w-2 h-2 rounded-full bg-[var(--admin-text-muted)]" />
        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          Aucun budget approuvé — validez le budget en Études avant de commencer les achats.
        </p>
      </div>
    )
  }

  const pct = approved > 0 ? (state.totalSpent / approved) * 100 : 0
  const variance = state.totalSpent - approved
  const variancePct = approved > 0 ? (variance / approved) * 100 : 0
  const isOver = pct > 100
  const isAmber = pct >= 90 && pct <= 100

  const barColor = isOver
    ? 'var(--admin-red)'
    : isAmber
    ? 'var(--admin-amber)'
    : 'var(--admin-emerald)'

  return (
    <div className="space-y-3">
      {/* Alert banners */}
      {isOver && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg border"
          style={{ borderColor: 'var(--admin-red)', background: 'var(--admin-red-dim)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--admin-red)', flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="text-sm font-medium" style={{ color: 'var(--admin-red)' }}>
            Dépassement de budget — le projet a dépassé le budget approuvé de {fmt(Math.abs(variance))}.
          </span>
        </div>
      )}
      {isAmber && !isOver && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg border"
          style={{ borderColor: 'var(--admin-amber)', background: 'var(--admin-amber-dim)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--admin-amber)', flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-sm font-medium" style={{ color: 'var(--admin-amber)' }}>
            Attention&nbsp;: 90% du budget consommé — {fmt(approved - state.totalSpent)} restant.
          </span>
        </div>
      )}

      {/* Main widget */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        {/* 3-column header */}
        <div className="grid grid-cols-3 divide-x" style={{ borderColor: 'var(--admin-border)' }}>
          <BudgetColumn
            label="Budget Approuvé"
            value={fmt(approved)}
            sub="Validé en Études"
            accentColor="var(--admin-emerald)"
          />
          <BudgetColumn
            label="Dépensé à ce jour"
            value={state.loading ? '…' : fmt(state.totalSpent)}
            sub={state.loading ? '' : `${pct.toFixed(1)}% du budget`}
            accentColor={barColor}
          />
          <BudgetColumn
            label="Variance"
            value={state.loading ? '…' : `${variance >= 0 ? '+' : ''}${fmt(variance)}`}
            sub={state.loading ? '' : `${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(1)}%`}
            accentColor={isOver ? 'var(--admin-red)' : isAmber ? 'var(--admin-amber)' : 'var(--admin-text-muted)'}
          />
        </div>

        {/* Progress bar */}
        <div className="px-5 pb-4 pt-3 space-y-1.5 border-t" style={{ borderColor: 'var(--admin-border)' }}>
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            <span>Progression budgétaire</span>
            <span>{Math.min(pct, 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--admin-border)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(pct, 100)}%`,
                background: barColor,
              }}
            />
          </div>
          {isOver && (
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--admin-red-dim)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(pct - 100, 50)}%`,
                  background: 'var(--admin-red)',
                  opacity: 0.5,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BudgetColumn({
  label,
  value,
  sub,
  accentColor,
}: {
  label: string
  value: string
  sub: string
  accentColor: string
}) {
  return (
    <div className="px-5 py-4 space-y-1">
      <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
        {label}
      </p>
      <p className="text-xl font-semibold tabular-nums" style={{ color: accentColor }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
        {sub}
      </p>
    </div>
  )
}
