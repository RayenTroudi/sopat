'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { BudgetVarianceRow, NcMonthlyRow, TimelineProject, MlAccuracySummary } from '@/lib/db/reports'

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  budgetVariance: BudgetVarianceRow[]
  ncMonthly:      NcMonthlyRow[]
  timeline:       TimelineProject[]
  mlAccuracy:     MlAccuracySummary
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

function fmtTnd(n: number) { return `${FMT.format(n)} TND` }

function fmtPct(n: number | null) {
  if (n === null) return '—'
  return `${n > 0 ? '+' : ''}${n}%`
}

function varianceColor(pct: number | null) {
  if (pct === null) return 'var(--admin-text-muted)'
  if (pct >  10)  return 'var(--admin-red)'
  if (pct >   0)  return 'var(--admin-amber)'
  return 'var(--admin-emerald)'
}

const STATUS_LABELS: Record<string, string> = {
  draft:       'Brouillon',
  etudes:      'Études',
  realisation: 'Réalisation',
  entretien:   'Entretien',
  completed:   'Terminé',
  cancelled:   'Annulé',
}

const PHASE_LABELS: Record<string, string> = {
  etudes:      'Études',
  realisation: 'Réalisation',
  entretien:   'Entretien',
}

const PHASE_COLORS: Record<string, string> = {
  etudes:      '#2D5A27',
  realisation: '#D97706',
  entretien:   '#2563EB',
}

const NC_COLORS: Record<string, string> = {
  open:        '#DC2626',
  in_progress: '#D97706',
  closed:      '#2D5A27',
  verified:    '#16A34A',
}

function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</h2>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (v: string | number | null | undefined) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers, ...rows].map((row) => row.map(escape).join(','))
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── 1. Budget Variance Report ────────────────────────────────────────────────

function BudgetVarianceReport({ rows }: { rows: BudgetVarianceRow[] }) {
  const [sort, setSort] = useState<'variance' | 'spend' | 'ref'>('variance')

  const sorted = [...rows].sort((a, b) => {
    if (sort === 'variance') return (Math.abs(b.variancePct ?? 0)) - (Math.abs(a.variancePct ?? 0))
    if (sort === 'spend')    return b.actualSpend - a.actualSpend
    return a.reference.localeCompare(b.reference)
  })

  function handleExport() {
    exportCsv('variance_budgetaire.csv',
      ['Référence', 'Projet', 'Client', 'Statut', 'Budget approuvé (TND)', 'Prédiction ML (TND)', 'Dépenses réelles (TND)', 'Variance %', 'Erreur ML %'],
      sorted.map((r) => [
        r.reference, r.name, r.clientName, STATUS_LABELS[r.status] ?? r.status,
        r.approvedBudget ?? '', r.mlPrediction ?? '', r.actualSpend,
        r.variancePct ?? '', r.mlErrorPct ?? '',
      ])
    )
  }

  return (
    <Section
      title="Variance budgétaire par projet"
      subtitle="Comparaison budget approuvé, prédiction ML et dépenses réelles"
      action={
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="text-xs px-2 py-1 rounded border"
            style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
          >
            <option value="variance">Tri : variance</option>
            <option value="spend">Tri : dépenses</option>
            <option value="ref">Tri : référence</option>
          </select>
          <button
            onClick={handleExport}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}
          >
            ↓ Exporter CSV
          </button>
        </div>
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--admin-text-muted)' }}>Aucun projet avec données budgétaires.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                {['Référence', 'Projet / Client', 'Statut', 'Budget approuvé', 'Prédiction ML', 'Dépenses réelles', 'Variance %', 'Erreur ML %'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--admin-bg)] transition-colors" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/projects/${r.id}`} className="font-mono text-xs font-semibold hover:underline" style={{ color: 'var(--admin-blue)' }}>
                      {r.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <p className="truncate font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{r.name}</p>
                    <p className="truncate text-xs" style={{ color: 'var(--admin-text-muted)' }}>{r.clientName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{STATUS_LABELS[r.status] ?? r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs" style={{ color: 'var(--admin-text)' }}>
                    {r.approvedBudget !== null ? fmtTnd(r.approvedBudget) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {r.mlPrediction !== null ? fmtTnd(r.mlPrediction) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs font-medium" style={{ color: 'var(--admin-text)' }}>
                    {fmtTnd(r.actualSpend)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-sm font-semibold" style={{ color: varianceColor(r.variancePct) }}>
                    {fmtPct(r.variancePct)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs" style={{ color: varianceColor(r.mlErrorPct) }}>
                    {fmtPct(r.mlErrorPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}

// ─── 2. NC Analysis Chart ─────────────────────────────────────────────────────

function NcAnalysisChart({ data }: { data: NcMonthlyRow[] }) {
  const last12 = data.slice(-12)

  const fmtMonth = (m: string) => {
    const [y, mo] = m.split('-')
    const d = new Date(Number(y), Number(mo) - 1, 1)
    return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
  }

  const chartData = last12.map((r) => ({
    month:       fmtMonth(r.month),
    open:        r.open,
    en_cours:    r.in_progress,
    cloturee:    r.closed,
    verifiee:    r.verified,
  }))

  const NC_LEGEND: { key: string; color: string; label: string }[] = [
    { key: 'open',     color: NC_COLORS.open,        label: 'Ouverte' },
    { key: 'en_cours', color: NC_COLORS.in_progress,  label: 'En cours' },
    { key: 'cloturee', color: NC_COLORS.closed,       label: 'Clôturée' },
    { key: 'verifiee', color: NC_COLORS.verified,     label: 'Vérifiée' },
  ]

  return (
    <Section
      title="Analyse des non-conformités"
      subtitle="Nombre de NCs par mois (12 derniers mois), par statut · ISO 9001:2015 §8.7"
    >
      {data.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--admin-text-muted)' }}>Aucune non-conformité enregistrée.</p>
      ) : (
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: 'var(--admin-text)', fontWeight: 600, marginBottom: 4 }}
                itemStyle={{ color: 'var(--admin-text)' }}
              />
              <Legend
                iconType="square"
                iconSize={10}
                formatter={(value) => NC_LEGEND.find((l) => l.key === value)?.label ?? value}
                wrapperStyle={{ fontSize: 11, color: 'var(--admin-text-muted)' }}
              />
              {NC_LEGEND.map((l) => (
                <Bar key={l.key} dataKey={l.key} stackId="a" fill={l.color} radius={l.key === 'verifiee' ? [3, 3, 0, 0] : [0, 0, 0, 0]} maxBarSize={40} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Section>
  )
}

// ─── 3. Project Timeline (Gantt-style) ───────────────────────────────────────

const PHASE_ORDER: Record<string, number> = { etudes: 0, realisation: 1, entretien: 2 }

function ProjectTimeline({ projects }: { projects: TimelineProject[] }) {
  const now = new Date()

  // Compute global date range
  const allDates = projects.flatMap((p) => [
    p.startDate,
    p.estimatedDeliveryDate,
    p.actualDeliveryDate,
    ...p.phases.flatMap((ph) => [ph.startedAt, ph.completedAt]),
  ].filter(Boolean) as Date[])

  const minDate = allDates.length > 0 ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : new Date(now.getFullYear(), 0, 1)
  const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => d.getTime()), now.getTime() + 30 * 86400000)) : new Date(now.getFullYear(), 11, 31)

  const totalMs = maxDate.getTime() - minDate.getTime()

  function pct(d: Date | null | undefined): number | null {
    if (!d) return null
    return Math.max(0, Math.min(100, ((new Date(d).getTime() - minDate.getTime()) / totalMs) * 100))
  }

  function barStyle(start: Date | null | undefined, end: Date | null | undefined, color: string) {
    const s = pct(start)
    const e = pct(end ?? now)
    if (s === null) return null
    const width = Math.max(0.5, (e ?? pct(now) ?? 0) - s)
    return { left: `${s}%`, width: `${width}%`, backgroundColor: color }
  }

  // Month tick marks
  const ticks: { label: string; pct: number }[] = []
  const cur = new Date(minDate)
  cur.setDate(1)
  while (cur <= maxDate) {
    ticks.push({ label: cur.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }), pct: pct(cur) ?? 0 })
    cur.setMonth(cur.getMonth() + 1)
  }

  const statusColors: Record<string, string> = {
    draft: '#9BB5A8', etudes: '#2D5A27', realisation: '#D97706', entretien: '#2563EB', completed: '#16A34A', cancelled: '#DC2626',
  }

  const todayPct = pct(now)

  return (
    <Section
      title="Vue chronologique des projets"
      subtitle="Phases par projet sur leur durée réelle"
    >
      {projects.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--admin-text-muted)' }}>Aucun projet.</p>
      ) : (
        <div className="overflow-x-auto">
          {/* Month scale */}
          <div className="relative mb-1" style={{ marginLeft: 220, height: 20 }}>
            {ticks.filter((_, i) => i % 2 === 0).map((t) => (
              <span
                key={t.label}
                className="absolute text-xs"
                style={{ left: `${t.pct}%`, color: 'var(--admin-text-muted)', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
              >
                {t.label}
              </span>
            ))}
          </div>

          {/* Today line + project rows */}
          <div className="space-y-1">
            {projects.map((p) => {
              const phaseColors = p.phases.map((ph) => ({
                ...ph,
                color: PHASE_COLORS[ph.phase] ?? '#9BB5A8',
              }))

              return (
                <div key={p.id} className="flex items-center gap-3" style={{ minHeight: 32 }}>
                  {/* Project label */}
                  <div className="shrink-0 flex items-center gap-2" style={{ width: 216 }}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusColors[p.status] ?? '#9BB5A8' }} />
                    <div className="min-w-0">
                      <Link href={`/admin/projects/${p.id}`} className="text-xs font-medium truncate block hover:underline" style={{ color: 'var(--admin-text)', maxWidth: 190 }}>
                        {p.reference} — {p.name}
                      </Link>
                      <p className="text-xs truncate" style={{ color: 'var(--admin-text-muted)', maxWidth: 190 }}>{p.clientName}</p>
                    </div>
                  </div>

                  {/* Timeline bar area */}
                  <div className="flex-1 relative h-7" style={{ minWidth: 400 }}>
                    {/* Background grid */}
                    <div className="absolute inset-0 rounded" style={{ background: 'var(--admin-bg)' }} />

                    {/* Today vertical line */}
                    {todayPct !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-px z-10"
                        style={{ left: `${todayPct}%`, background: 'var(--admin-red)', opacity: 0.5 }}
                      />
                    )}

                    {/* Phase bars */}
                    {phaseColors.map((ph) => {
                      const style = barStyle(ph.startedAt, ph.completedAt, ph.color)
                      if (!style) return null
                      return (
                        <div
                          key={ph.phase}
                          className="absolute top-1.5 h-4 rounded-sm"
                          style={{ ...style, opacity: ph.status === 'completed' ? 1 : 0.7 }}
                          title={`${PHASE_LABELS[ph.phase] ?? ph.phase}: ${ph.status}`}
                        />
                      )
                    })}

                    {/* Estimated delivery marker */}
                    {p.estimatedDeliveryDate && pct(p.estimatedDeliveryDate) !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5"
                        style={{ left: `${pct(p.estimatedDeliveryDate)}%`, background: 'var(--admin-amber)', opacity: 0.8 }}
                        title={`Livraison estimée: ${new Date(p.estimatedDeliveryDate).toLocaleDateString('fr-FR')}`}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 pt-4 mt-4 border-t" style={{ borderColor: 'var(--admin-border)' }}>
            {Object.entries(PHASE_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PHASE_COLORS[key] }} />
                <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-0.5 h-3" style={{ backgroundColor: 'var(--admin-red)' }} />
              <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Aujourd'hui</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-0.5 h-3" style={{ backgroundColor: 'var(--admin-amber)' }} />
              <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Livraison estimée</span>
            </div>
          </div>
        </div>
      )}
    </Section>
  )
}

// ─── 4. ML Prediction Accuracy ────────────────────────────────────────────────

function MlAccuracyReport({ data }: { data: MlAccuracySummary }) {
  function handleExport() {
    exportCsv('prediction_ml_accuracy.csv',
      ['Référence', 'Projet', 'Prédiction ML (TND)', 'Dépenses réelles (TND)', 'Erreur absolue (TND)', 'Erreur %', 'Modèle', 'Date prédiction'],
      data.rows.map((r) => [
        r.reference, r.name,
        r.predictedTotal, r.actualSpend, r.errorAbs, r.errorPct,
        r.modelVersion ?? '', r.predictionDate.toISOString().slice(0, 10),
      ])
    )
  }

  return (
    <Section
      title="Précision des prédictions ML"
      subtitle="Comparaison prédiction ML vs dépenses réelles sur les projets terminés"
      action={
        data.rows.length > 0 ? (
          <button
            onClick={handleExport}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}
          >
            ↓ Exporter CSV
          </button>
        ) : undefined
      }
    >
      {data.rows.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--admin-text-muted)' }}>
          Aucun projet terminé avec prédiction ML disponible pour le moment.
        </p>
      ) : (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)' }}>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>RMSE</p>
              <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: 'var(--admin-text)' }}>
                {data.rmse !== null ? fmtTnd(data.rmse) : '—'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>Erreur quadratique moyenne</p>
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)' }}>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Erreur moy. absolue</p>
              <p
                className="text-2xl font-bold tabular-nums mt-1"
                style={{ color: data.avgErrorPct !== null && data.avgErrorPct > 15 ? 'var(--admin-red)' : data.avgErrorPct !== null && data.avgErrorPct > 8 ? 'var(--admin-amber)' : 'var(--admin-emerald)' }}
              >
                {data.avgErrorPct !== null ? `${data.avgErrorPct}%` : '—'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>MAPE sur {data.projectCount} projet{data.projectCount !== 1 ? 's' : ''}</p>
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)' }}>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Recommandation</p>
              <p className="text-sm font-semibold mt-1" style={{ color: 'var(--admin-text)' }}>
                {data.avgErrorPct === null ? '—'
                  : data.avgErrorPct > 20 ? '🔴 Réentraîner le modèle'
                  : data.avgErrorPct > 10 ? '🟡 Surveiller les performances'
                  : '🟢 Modèle performant'}
              </p>
              <Link href="/admin/settings/ml" className="text-xs hover:underline mt-0.5 block" style={{ color: 'var(--admin-blue)' }}>
                Paramètres ML →
              </Link>
            </div>
          </div>

          {/* Scatter-style chart: predicted vs actual */}
          <div>
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--admin-text-muted)' }}>Prédiction ML vs dépenses réelles (par projet)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={data.rows.map((r) => ({
                  name:      r.reference,
                  prédit:    Math.round(r.predictedTotal),
                  réel:      Math.round(r.actualSpend),
                }))}
                margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} axisLine={false} tickLine={false} width={60}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(value) => [typeof value === 'number' ? fmtTnd(value) : String(value ?? '')]}

                />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11, color: 'var(--admin-text-muted)' }} />
                <Bar dataKey="prédit"  fill="#2D5A27" opacity={0.7} maxBarSize={24} radius={[2, 2, 0, 0]} />
                <Bar dataKey="réel"    fill="#D97706" opacity={0.9} maxBarSize={24} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Référence', 'Projet', 'Prédiction ML', 'Dépenses réelles', 'Erreur abs.', 'Erreur %', 'Modèle'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.projectId} className="hover:bg-[var(--admin-bg)] transition-colors" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/projects/${r.projectId}`} className="font-mono text-xs font-semibold hover:underline" style={{ color: 'var(--admin-blue)' }}>
                        {r.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      <p className="truncate text-sm" style={{ color: 'var(--admin-text)' }}>{r.name}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {fmtTnd(r.predictedTotal)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs font-medium" style={{ color: 'var(--admin-text)' }}>
                      {fmtTnd(r.actualSpend)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {fmtTnd(r.errorAbs)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-sm font-semibold" style={{ color: varianceColor(r.errorPct) }}>
                      {fmtPct(r.errorPct)}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {r.isFallback ? (
                        <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--admin-amber-dim)', color: 'var(--admin-amber)' }}>Estimée</span>
                      ) : (
                        r.modelVersion ?? '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Section>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReportsClient({ budgetVariance, ncMonthly, timeline, mlAccuracy }: Props) {
  const [activeTab, setActiveTab] = useState<'budget' | 'nc' | 'timeline' | 'ml'>('budget')

  const TABS: { key: typeof activeTab; label: string }[] = [
    { key: 'budget',   label: 'Variance budgétaire' },
    { key: 'nc',       label: 'Analyse NC' },
    { key: 'timeline', label: 'Chronologie' },
    { key: 'ml',       label: 'Précision ML' },
  ]

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>Rapports analytiques</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            Analyse des performances · Qualité ISO 9001:2015
          </p>
        </div>
        <Link href="/admin" className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          ← Tableau de bord
        </Link>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderColor: activeTab === tab.key ? 'var(--admin-emerald)' : 'transparent',
              color:       activeTab === tab.key ? 'var(--admin-emerald)' : 'var(--admin-text-muted)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'budget'   && <BudgetVarianceReport rows={budgetVariance} />}
      {activeTab === 'nc'       && <NcAnalysisChart data={ncMonthly} />}
      {activeTab === 'timeline' && <ProjectTimeline projects={timeline} />}
      {activeTab === 'ml'       && <MlAccuracyReport data={mlAccuracy} />}
    </div>
  )
}
