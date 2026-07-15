'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ProjectPhaseReport, PhaseReport } from '@/lib/db/reports-overview'

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtMoney = (n: number, currency: string) => `${FMT.format(n)} ${currency}`

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', etudes: 'Études', realisation: 'Réalisation',
  entretien: 'Entretien', completed: 'Terminé', cancelled: 'Annulé',
}
const PHASE_LABELS: Record<PhaseReport['phase'], string> = {
  etudes: 'Études', realisation: 'Réalisation', entretien: 'Entretien',
}
const PHASE_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', in_progress: 'En cours',
  awaiting_signoff: 'Attente validation', completed: 'Terminée',
}
const PHASE_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending:          { bg: 'var(--admin-blue-dim)',    fg: 'var(--admin-blue)' },
  in_progress:      { bg: 'var(--admin-amber-dim)',   fg: 'var(--admin-amber)' },
  awaiting_signoff: { bg: 'var(--admin-accent-dim)',  fg: 'var(--admin-accent)' },
  completed:        { bg: 'var(--admin-emerald-dim)', fg: 'var(--admin-emerald)' },
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
}

function varianceColor(pct: number | null) {
  if (pct === null) return 'var(--admin-text-muted)'
  if (pct > 10) return 'var(--admin-red)'
  if (pct > 0)  return 'var(--admin-amber)'
  return 'var(--admin-emerald)'
}

function exportCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (v: string | number | null | undefined) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers, ...rows].map((row) => row.map(escape).join(','))
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── Carte de phase ───────────────────────────────────────────────────────────

// Thème « SOPAT Portfolio » : cartes de phase vert foncé, texte blanc.
const BRAND_DARK = '#346158'
const BRAND_SOFT = '#D9EAE5'
const BRAND_ALERT_RED = '#FFC9C2'
const BRAND_ALERT_AMBER = '#F7DFA8'
const BRAND_LIGHT_GREEN = '#B9E8D4'
const CARD_DIVIDER = 'rgba(255,255,255,0.25)'

function PhaseCard({ report, phase, currency }: { report: ProjectPhaseReport; phase: PhaseReport; currency: string }) {
  const colors = PHASE_STATUS_COLORS[phase.status] ?? PHASE_STATUS_COLORS.pending
  const budget = report.approvedBudget
  const spendPct = phase.phase === 'realisation' && budget && budget > 0
    ? Math.min(150, Math.round((phase.spend / budget) * 100))
    : null

  return (
    <div className="rounded-lg p-4 space-y-3" style={{ background: BRAND_DARK }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">{PHASE_LABELS[phase.phase]}</p>
        <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: colors.bg, color: colors.fg }}>
          {PHASE_STATUS_LABELS[phase.status] ?? phase.status}
        </span>
      </div>

      <div className="space-y-1 text-xs" style={{ color: BRAND_SOFT }}>
        <p>Début : <span className="text-white">{fmtDate(phase.startedAt)}</span></p>
        <p>Fin : <span className="text-white">{fmtDate(phase.completedAt)}</span></p>
        <p>Durée : <span className="text-white">
          {phase.durationDays !== null ? `${phase.durationDays} j${phase.completedAt ? '' : ' (en cours)'}` : '—'}
        </span></p>
        <p>Dépenses : <span className="font-semibold tabular-nums" style={{ color: phase.spend > 0 ? '#FFFFFF' : BRAND_SOFT }}>
          {phase.spend > 0 ? fmtMoney(phase.spend, currency) : '—'}
        </span></p>
      </div>

      {/* Indicateurs propres à la phase */}
      {phase.phase === 'etudes' && (
        <div className="pt-2 border-t space-y-1 text-xs" style={{ borderColor: CARD_DIVIDER, color: BRAND_SOFT }}>
          <p>Liste végétale : <span className="text-white">{phase.plantItemCount ?? 0} article(s)</span></p>
          <p>Prédiction budgétaire : <span className="text-white">
            {phase.predictionTotal !== null ? fmtMoney(phase.predictionTotal, currency) : '—'}
          </span>{phase.predictionVersion ? ` (${phase.predictionVersion})` : ''}</p>
          <p>Budget validé : <span className="text-white">
            {budget !== null ? fmtMoney(budget, currency) : '—'}
          </span></p>
        </div>
      )}

      {phase.phase === 'realisation' && (
        <div className="pt-2 border-t space-y-2 text-xs" style={{ borderColor: CARD_DIVIDER, color: BRAND_SOFT }}>
          <p>Bons d&apos;achat : <span className="text-white">{phase.poCount}</span></p>
          {spendPct !== null && (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Dépensé vs budget</span>
                <span className="font-semibold tabular-nums" style={{ color: spendPct > 100 ? BRAND_ALERT_RED : spendPct > 90 ? BRAND_ALERT_AMBER : BRAND_LIGHT_GREEN }}>
                  {spendPct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, spendPct)}%`,
                    background: spendPct > 100 ? BRAND_ALERT_RED : spendPct > 90 ? BRAND_ALERT_AMBER : BRAND_LIGHT_GREEN,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {phase.phase === 'entretien' && (
        <div className="pt-2 border-t text-xs" style={{ borderColor: CARD_DIVIDER, color: BRAND_SOFT }}>
          <p>Visites de maintenance : <span className="text-white">{phase.maintenanceVisitCount ?? 0}</span></p>
        </div>
      )}
    </div>
  )
}

// ─── Onglet Par projet ────────────────────────────────────────────────────────

export function ProjectPhaseTab({ reports }: { reports: ProjectPhaseReport[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  function handleExport() {
    exportCsv(
      `rapport-phases-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Référence', 'Projet', 'Client', 'Statut projet', 'Phase', 'Statut phase', 'Début', 'Fin', 'Durée (j)', 'Dépenses', 'Devise'],
      reports.flatMap((r) =>
        r.phases.map((ph) => [
          r.reference, r.name, r.clientName, STATUS_LABELS[r.status] ?? r.status,
          PHASE_LABELS[ph.phase], PHASE_STATUS_LABELS[ph.status] ?? ph.status,
          ph.startedAt ? ph.startedAt.slice(0, 10) : '', ph.completedAt ? ph.completedAt.slice(0, 10) : '',
          ph.durationDays ?? '', ph.spend, r.currency,
        ])
      ),
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Rapports par projet et par phase</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            Cliquez sur un projet pour le détail Études · Réalisation · Entretien
          </p>
        </div>
        <button
          onClick={handleExport}
          className="text-xs px-3 py-1.5 rounded-lg font-medium shrink-0"
          style={{ background: 'var(--admin-blue-dim)', color: 'var(--admin-blue)' }}
        >
          ↓ Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[760px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Projet', 'Client', 'Statut', 'Budget approuvé', 'Dépensé', 'Écart', ''].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => {
              const isOpen = expanded === r.id
              return (
                <ProjectRows
                  key={r.id}
                  report={r}
                  isOpen={isOpen}
                  onToggle={() => setExpanded(isOpen ? null : r.id)}
                />
              )
            })}
            {reports.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucun projet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProjectRows({ report: r, isOpen, onToggle }: { report: ProjectPhaseReport; isOpen: boolean; onToggle: () => void }) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer hover:bg-[var(--admin-bg)] transition-colors"
        style={{ borderBottom: '1px solid var(--admin-border)' }}
      >
        <td className="px-4 py-3">
          <p className="font-mono text-xs" style={{ color: 'var(--admin-blue)' }}>{r.reference}</p>
          <p className="text-xs truncate max-w-[220px]" style={{ color: 'var(--admin-text)' }}>{r.name}</p>
        </td>
        <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{r.clientName}</td>
        <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text)' }}>{STATUS_LABELS[r.status] ?? r.status}</td>
        <td className="px-4 py-3 text-xs text-right tabular-nums" style={{ color: 'var(--admin-text)' }}>
          {r.approvedBudget !== null ? fmtMoney(r.approvedBudget, r.currency) : '—'}
        </td>
        <td className="px-4 py-3 text-xs text-right tabular-nums" style={{ color: 'var(--admin-text)' }}>
          {r.totalSpend > 0 ? fmtMoney(r.totalSpend, r.currency) : '—'}
        </td>
        <td className="px-4 py-3 text-xs text-right tabular-nums font-semibold" style={{ color: varianceColor(r.variancePct) }}>
          {r.variancePct !== null ? `${r.variancePct > 0 ? '+' : ''}${r.variancePct}%` : '—'}
        </td>
        <td className="px-4 py-3 text-xs text-center" style={{ color: 'var(--admin-text-muted)' }}>{isOpen ? '▾' : '▸'}</td>
      </tr>
      {isOpen && (
        <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <td colSpan={7} className="px-4 py-4" style={{ background: 'var(--admin-surface)' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {r.phases.map((ph) => (
                <PhaseCard key={ph.phase} report={r} phase={ph} currency={r.currency} />
              ))}
            </div>
            {r.offPhaseSpend > 0 && (
              <p className="text-xs mt-3" style={{ color: 'var(--admin-text-muted)' }}>
                Hors phase : <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-amber)' }}>{fmtMoney(r.offPhaseSpend, r.currency)}</span>
                {' '}— dépenses non attribuables à une fenêtre de phase (dates manquantes ou antérieures au démarrage).
              </p>
            )}
            <div className="mt-3">
              <Link href={`/admin/projects/${r.id}`} className="text-xs font-medium hover:underline" style={{ color: 'var(--green)' }}>
                Ouvrir le projet →
              </Link>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
