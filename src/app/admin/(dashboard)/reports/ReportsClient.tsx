'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/admin/ui'
import { tnd } from '@/lib/fmt'

type PnlRow = {
  projectId: string
  projectName: string
  client: { id: string; name: string } | null
  status: string
  currency: string
  totalBudget: number
  totalDirectCosts: number
  overheadAllocated: number
  totalRevenue: number
  grossProfit: number
  netProfit: number
  budgetVariance: number
  marginPercent: number
}

type SortKey = 'totalRevenue' | 'netProfit' | 'marginPercent' | 'totalBudget'

const marginStyle = (pct: number) => ({
  color: pct > 20
    ? 'var(--admin-emerald)'
    : pct >= 5
    ? 'var(--admin-amber)'
    : 'var(--admin-red)',
  fontFamily: 'var(--font-sans)',
})

export default function ReportsClient({ rows }: { rows: PnlRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('totalRevenue')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey]
      return sortDir === 'desc' ? -diff : diff
    })
  }, [rows, sortKey, sortDir])

  const totals = rows.reduce(
    (acc, r) => ({
      totalRevenue: acc.totalRevenue + r.totalRevenue,
      totalDirectCosts: acc.totalDirectCosts + r.totalDirectCosts,
      overheadAllocated: acc.overheadAllocated + r.overheadAllocated,
      grossProfit: acc.grossProfit + r.grossProfit,
      netProfit: acc.netProfit + r.netProfit,
      totalBudget: acc.totalBudget + r.totalBudget,
    }),
    { totalRevenue: 0, totalDirectCosts: 0, overheadAllocated: 0, grossProfit: 0, netProfit: 0, totalBudget: 0 }
  )
  const totalMargin = totals.totalRevenue > 0 ? (totals.netProfit / totals.totalRevenue) * 100 : 0

  function exportCsv() {
    const header = ['Projet', 'Client', 'Statut', 'Budget', 'Coûts directs', 'Overhead', 'Revenus', 'Marge brute', 'Profit net', 'Marge %']
    const csvRows = sorted.map(r => [
      r.projectName,
      r.client?.name ?? '',
      r.status,
      r.totalBudget.toFixed(3),
      r.totalDirectCosts.toFixed(3),
      r.overheadAllocated.toFixed(3),
      r.totalRevenue.toFixed(3),
      r.grossProfit.toFixed(3),
      r.netProfit.toFixed(3),
      r.marginPercent.toFixed(1),
    ])
    const csv = [header, ...csvRows].map(row => row.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'sopat-pnl.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span style={{ color: 'var(--admin-text-dim)' }} className="ml-1">↕</span>
    return <span style={{ color: 'var(--admin-accent)' }} className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>
  }

  const summaryCards = [
    { label: 'CA total', value: tnd(totals.totalRevenue), accent: 'green' as const },
    { label: 'Coûts directs', value: tnd(totals.totalDirectCosts), accent: 'gold' as const },
    { label: 'Marge brute', value: tnd(totals.grossProfit), accent: 'blue' as const },
    { label: 'Profit net', value: tnd(totals.netProfit), accent: (totals.netProfit >= 0 ? 'green' : 'red') as 'green' | 'red' },
    { label: 'Marge nette moy.', value: `${totalMargin.toFixed(1)}%`, accent: (totalMargin > 10 ? 'green' : 'orange') as 'green' | 'orange' },
  ]

  const accentBar: Record<string, string> = {
    green: 'var(--admin-emerald)', gold: 'var(--admin-accent)',
    blue: 'var(--admin-blue)', red: 'var(--admin-red)', orange: 'var(--admin-amber)',
  }

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p
            className="text-xs uppercase tracking-widest mb-1"
            style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}
          >
            SOPAT Finance
          </p>
          <h1
            className="text-3xl font-semibold"
            style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}
          >
            Rapport P&amp;L
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
            {rows.length} projet{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg transition-all duration-150"
          style={{
            color: 'var(--admin-accent)',
            background: 'var(--admin-accent-dim)',
            border: '1px solid rgba(201,168,76,0.2)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exporter CSV
        </button>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {summaryCards.map(s => (
          <div
            key={s.label}
            className="admin-card-shine relative rounded-xl p-5"
            style={{
              background: 'var(--admin-card)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <div
              className="absolute top-0 left-5 right-5 h-px rounded-full opacity-60"
              style={{ background: `linear-gradient(to right, transparent, ${accentBar[s.accent]}, transparent)` }}
            />
            <p
              className="text-xs uppercase tracking-widest mb-2"
              style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}
            >
              {s.label}
            </p>
            <p
              className="font-semibold"
              style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)', fontSize: '1.25rem' }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        className="admin-card-shine rounded-xl overflow-hidden"
        style={{
          background: 'var(--admin-card)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <div className="overflow-x-auto admin-scroll">
          <table className="w-full" style={{ fontFamily: 'var(--font-sans)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                {[
                  { label: 'Projet', key: null, align: 'left' },
                  { label: 'Client', key: null, align: 'left' },
                  { label: 'Statut', key: null, align: 'left' },
                  { label: 'Budget', key: 'totalBudget' as SortKey, align: 'right' },
                  { label: 'Coûts', key: null, align: 'right' },
                  { label: 'Overhead', key: null, align: 'right' },
                  { label: 'Revenus', key: 'totalRevenue' as SortKey, align: 'right' },
                  { label: 'Profit net', key: 'netProfit' as SortKey, align: 'right' },
                  { label: 'Marge', key: 'marginPercent' as SortKey, align: 'right' },
                ].map((h, i) => (
                  <th
                    key={h.label}
                    className={`py-3 text-xs uppercase tracking-widest font-medium ${h.key ? 'cursor-pointer select-none' : ''}`}
                    style={{
                      color: 'var(--admin-text-dim)',
                      paddingLeft: i === 0 ? '1.25rem' : '1rem',
                      paddingRight: i === 8 ? '1.25rem' : '1rem',
                      textAlign: h.align as 'left' | 'right',
                      letterSpacing: '0.08em',
                    }}
                    onClick={() => h.key && toggleSort(h.key)}
                  >
                    {h.label}{h.key && <SortIcon k={h.key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm" style={{ color: 'var(--admin-text-dim)' }}>
                    Aucun projet
                  </td>
                </tr>
              )}
              {sorted.map(r => (
                <tr
                  key={r.projectId}
                  className="transition-colors duration-100"
                  style={{ borderBottom: '1px solid var(--admin-border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--admin-card-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="py-3.5 pl-5 pr-4">
                    <Link
                      href={`/admin/projects/${r.projectId}`}
                      className="font-medium text-sm transition-colors"
                      style={{ color: 'var(--admin-accent)', fontFamily: 'var(--font-sans)' }}
                    >
                      {r.projectName}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    {r.client?.name ?? '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge status={r.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right text-sm tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {tnd(r.totalBudget)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-sm tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {tnd(r.totalDirectCosts)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-sm tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>
                    {tnd(r.overheadAllocated)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-sm tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {tnd(r.totalRevenue)}
                  </td>
                  <td
                    className="py-3.5 px-4 text-right text-sm font-bold tabular-nums"
                    style={{ color: r.netProfit < 0 ? 'var(--admin-red)' : 'var(--admin-emerald)' }}
                  >
                    {tnd(r.netProfit)}
                  </td>
                  <td className="py-3.5 pl-4 pr-5 text-right">
                    <span className="text-sm font-bold" style={marginStyle(r.marginPercent)}>
                      {r.marginPercent.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {sorted.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--admin-border-light)', background: 'var(--admin-surface)' }}>
                  <td
                    className="py-3.5 pl-5 pr-4 font-semibold text-sm"
                    colSpan={3}
                    style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-sans)' }}
                  >
                    Totaux
                  </td>
                  <td className="py-3.5 px-4 text-right text-sm font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {tnd(totals.totalBudget)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-sm font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {tnd(totals.totalDirectCosts)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-sm font-semibold tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>
                    {tnd(totals.overheadAllocated)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-sm font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {tnd(totals.totalRevenue)}
                  </td>
                  <td
                    className="py-3.5 px-4 text-right text-sm font-bold tabular-nums"
                    style={{ color: totals.netProfit < 0 ? 'var(--admin-red)' : 'var(--admin-emerald)' }}
                  >
                    {tnd(totals.netProfit)}
                  </td>
                  <td className="py-3.5 pl-4 pr-5 text-right">
                    <span className="text-sm font-bold" style={marginStyle(totalMargin)}>
                      {totalMargin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
