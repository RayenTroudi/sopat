'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { cn } from '@/lib/utils'
import {
  formatPredictionResult,
  getPredictionStatusColor,
  getPredictionStatusBg,
  type PredictionResult,
} from '@/lib/ml'

// ─── Types ────────────────────────────────────────────────────────────────────

type ModifiedBreakdown = {
  plants: number
  soil_substrates: number
  labor: number
  equipment: number
  logistics: number
}

type Props = {
  projectId: string
  predictionId: string
  result: PredictionResult
  onAccepted: (approvedAmount: number) => void
  onModified: (approvedAmount: number, reason: string) => void
  disabled?: boolean  // true once budget is already locked
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const tnd = (n: number) => `${FMT.format(Math.round(n))} TND`

const BREAKDOWN_LABELS: Record<string, string> = {
  plants:          'Végétaux',
  soil_substrates: 'Substrats',
  labor:           'Main-d\'œuvre',
  equipment:       'Équipements',
  logistics:       'Logistique',
}

const BREAKDOWN_COLORS = [
  'var(--admin-emerald)',
  'var(--admin-amber)',
  'var(--admin-blue)',
  'var(--admin-accent)',
  'var(--admin-muted)',
]

// ─── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: number }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        background: getPredictionStatusBg(score),
        color:      getPredictionStatusColor(score),
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full inline-block"
        style={{ background: getPredictionStatusColor(score) }}
      />
      Confiance {score}%
    </span>
  )
}

// ─── Breakdown bar chart ──────────────────────────────────────────────────────

function BreakdownChart({ breakdown }: { breakdown: PredictionResult['breakdown'] }) {
  const data = Object.entries(breakdown).map(([key, value]) => ({
    name:  BREAKDOWN_LABELS[key] ?? key,
    value: Math.round(value),
    key,
  }))

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: typeof data[0] }[] }) => {
    if (!active || !payload?.[0]) return null
    return (
      <div
        className="rounded-lg border px-3 py-2 text-xs shadow-sm"
        style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
      >
        <p className="font-medium">{payload[0].payload.name}</p>
        <p style={{ color: 'var(--admin-text-muted)' }}>{tnd(payload[0].payload.value)}</p>
      </div>
    )
  }

  return (
    <div style={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }} barSize={28}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--admin-bg)' }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={entry.key} fill={BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Modify form ──────────────────────────────────────────────────────────────

function ModifyForm({
  initial,
  predictionId,
  projectId,
  onDone,
  onCancel,
}: {
  initial: PredictionResult['breakdown']
  predictionId: string
  projectId: string
  onDone: (amount: number, reason: string) => void
  onCancel: () => void
}) {
  const [fields, setFields] = useState<ModifiedBreakdown>({
    plants:          Math.round(initial.plants),
    soil_substrates: Math.round(initial.soil_substrates),
    labor:           Math.round(initial.labor),
    equipment:       Math.round(initial.equipment),
    logistics:       Math.round(initial.logistics),
  })
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const total = Object.values(fields).reduce((s, v) => s + v, 0)

  function set(key: keyof ModifiedBreakdown, raw: string) {
    const v = parseInt(raw, 10)
    setFields((prev) => ({ ...prev, [key]: isNaN(v) ? 0 : v }))
  }

  async function handleSave() {
    if (!reason.trim()) { setError('La raison de modification est requise'); return }
    setSaving(true)
    setError('')
    const res = await fetch(`/api/projects/${projectId}/budget-validation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'modify',
        predictionId,
        approvedAmount: total,
        modificationReason: reason.trim(),
        modifiedValues: fields,
      }),
    })
    setSaving(false)
    if (res.ok) {
      onDone(total, reason.trim())
    } else {
      const d = await res.json()
      setError(d.error ?? 'Erreur de sauvegarde')
    }
  }

  const inputCls = 'w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green/20'
  const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
        Modifier la répartition budgétaire
      </p>

      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(fields) as (keyof ModifiedBreakdown)[]).map((key) => (
          <div key={key}>
            <label className="block text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>
              {BREAKDOWN_LABELS[key]} (TND)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={fields[key]}
              onChange={(e) => set(key, e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </div>
        ))}
      </div>

      <div
        className="flex items-center justify-between px-4 py-2.5 rounded-lg"
        style={{ background: 'var(--admin-bg)', borderColor: 'var(--admin-border)' }}
      >
        <span className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Total modifié</span>
        <span className="text-base font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
          {tnd(total)}
        </span>
      </div>

      <div>
        <label className="block text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>
          Raison de la modification <span className="text-[#2F6F4F]">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="Ex. : prix fournisseur révisé, ajout d'équipements supplémentaires…"
          className={`${inputCls} resize-none`}
          style={inputStyle}
        />
      </div>

      {error && <p className="text-xs text-[#2F6F4F]">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="text-sm font-medium px-4 py-2 rounded-lg text-white disabled:opacity-50 transition-colors"
          style={{ background: 'var(--green)' }}
        >
          {saving ? 'Sauvegarde…' : 'Enregistrer le budget modifié'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm px-4 py-2 rounded-lg border transition-colors"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
        >
          Annuler
        </button>
      </div>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function BudgetPredictionPanel({
  projectId,
  predictionId,
  result,
  onAccepted,
  onModified,
  disabled = false,
}: Props) {
  const [mode, setMode] = useState<'view' | 'modify'>('view')
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState('')

  const fmt = formatPredictionResult(result)
  const breakdownData = Object.entries(result.breakdown).map(([key, value]) => ({
    key,
    label: BREAKDOWN_LABELS[key] ?? key,
    value: Math.round(value),
    pct:   Math.round((value / result.predicted_total) * 100),
  }))

  async function handleAccept() {
    setAccepting(true)
    setAcceptError('')
    const res = await fetch(`/api/projects/${projectId}/budget-validation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'accept',
        predictionId,
        approvedAmount: result.predicted_total,
      }),
    })
    setAccepting(false)
    if (res.ok) {
      onAccepted(result.predicted_total)
    } else {
      const d = await res.json()
      setAcceptError(d.error ?? 'Erreur')
    }
  }

  if (mode === 'modify') {
    return (
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        <ModifyForm
          initial={result.breakdown}
          predictionId={predictionId}
          projectId={projectId}
          onDone={(amount, reason) => { setMode('view'); onModified(amount, reason) }}
          onCancel={() => setMode('view')}
        />
      </div>
    )
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-start justify-between gap-4 flex-wrap"
        style={{ borderBottom: '1px solid var(--admin-border)' }}
      >
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
            Prédiction ML — Coût total estimé
          </p>
          <p className="text-3xl font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
            {fmt.total}
          </p>
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Intervalle : {fmt.range}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ConfidenceBadge score={result.confidence_score} />
          {result.is_fallback && (
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{ background: 'var(--admin-amber-dim)', color: 'var(--admin-amber)' }}
            >
              Estimation manuelle (modèle indisponible)
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Breakdown chart */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--admin-text-muted)' }}>
            Répartition des coûts
          </p>
          <BreakdownChart breakdown={result.breakdown} />

          {/* Legend rows */}
          <div className="mt-3 space-y-1.5">
            {breakdownData.map((item, i) => (
              <div key={item.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ background: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length] }}
                  />
                  <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{item.label}</span>
                </div>
                <div className="flex items-center gap-3 tabular-nums">
                  <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{item.pct}%</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--admin-text)', minWidth: '7rem', textAlign: 'right' }}>
                    {tnd(item.value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cost drivers */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--admin-text-muted)' }}>
            Principaux postes de coût
          </p>
          <ol className="space-y-1">
            {result.top_cost_drivers.map((driver, i) => (
              <li key={i} className="flex items-baseline gap-2 text-sm">
                <span
                  className="text-xs font-bold w-4 flex-shrink-0 tabular-nums"
                  style={{ color: 'var(--admin-text-muted)' }}
                >
                  {i + 1}.
                </span>
                <span style={{ color: 'var(--admin-text)' }}>{driver}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Meta */}
        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          Basé sur {result.similar_projects_used} projets similaires depuis 2021
          {' · '}Modèle {result.model_version}
        </p>

        {/* Action buttons */}
        {!disabled && (
          <div className="flex items-center gap-3 pt-1 border-t" style={{ borderColor: 'var(--admin-border)' }}>
            <button
              type="button"
              disabled={accepting}
              onClick={handleAccept}
              className="text-sm font-medium px-4 py-2 rounded-lg text-white disabled:opacity-50 transition-colors"
              style={{ background: 'var(--admin-emerald)' }}
            >
              {accepting ? 'Enregistrement…' : 'Accepter ce budget'}
            </button>
            <button
              type="button"
              onClick={() => setMode('modify')}
              className="text-sm px-4 py-2 rounded-lg border transition-colors"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
            >
              Modifier le budget
            </button>
            {acceptError && <p className="text-xs text-[#2F6F4F]">{acceptError}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
