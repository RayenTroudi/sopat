'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

type PredictionRow = {
  id:              string
  projectId:       string
  projectName:     string | null
  projectRef:      string | null
  projectStatus:   string | null
  predictedTotal:  string
  confidenceScore: number | null
  isFallback:      boolean
  modelVersion:    string | null
  status:          string
  createdAt:       string
  actualSpend:     number | null
  variancePct:     number | null
}

type EngineInfo = { version: string; completedProjects: number }

type StatusData = {
  engine:      EngineInfo | null
  predictions: PredictionRow[]
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
  return Math.abs(pct) > 15 ? 'var(--admin-red)' : Math.abs(pct) > 8 ? 'var(--admin-amber)' : 'var(--admin-emerald)'
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

// ─── Main component ───────────────────────────────────────────────────────────

export function MLSettingsClient() {
  const [data, setData]     = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    const res = await fetch('/api/ml/status')
    if (res.ok) setData(await res.json() as StatusData)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const scatterData = (data?.predictions ?? [])
    .filter((p) => p.actualSpend !== null && parseFloat(p.predictedTotal) > 0)
    .map((p) => ({
      name:      p.projectRef ?? p.projectId,
      predicted: Math.round(parseFloat(p.predictedTotal)),
      actual:    Math.round(p.actualSpend!),
    }))

  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map((i) => (
          <div key={i} className="h-32 rounded-xl border animate-pulse" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>Prédiction budgétaire</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>Moteur déterministe v2 · calibration automatique</p>
        </div>
        <Link href="/admin/settings" className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>← Paramètres</Link>
      </div>

      {/* Engine info card */}
      <Section
        title="Moteur d'estimation v2"
        subtitle="Estimation déterministe par poste, calibrée sur les coûts réels des projets terminés"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Version',                        value: data?.engine?.version ?? '—' },
            { label: 'Projets terminés (calibration)', value: String(data?.engine?.completedProjects ?? 0) },
            { label: 'Méthode',                        value: 'Bottom-up + calibration' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--admin-text)' }}>{value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs mt-4" style={{ color: 'var(--admin-text-muted)' }}>
          Chaque poste (plantes, sols &amp; substrats, main d&apos;œuvre, matériel, logistique) est calculé
          à partir de la liste végétale réelle du projet, puis calibré sur le ratio coût réel / estimation
          des projets terminés comparables. Plus de projets terminés = estimations plus précises.
          La validation humaine du chef reste requise pour chaque budget.
        </p>
      </Section>

      {/* Scatter chart: predicted vs actual */}
      {scatterData.length > 0 && (
        <Section title="Prédiction ML vs réalité"
          subtitle="Dispersion sur les projets terminés — points proches de la diagonale = modèle précis">
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <XAxis
                dataKey="actual" name="Réel" type="number"
                tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }}
                tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`}
                label={{ value: 'Réel (TND)', position: 'insideBottom', offset: -4, fontSize: 10, fill: 'var(--admin-text-muted)' }}
              />
              <YAxis
                dataKey="predicted" name="Prédit" type="number"
                tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }}
                tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`}
                label={{ value: 'Prédit (TND)', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--admin-text-muted)' }}
              />
              <Tooltip
                content={({ payload }) => {
                  if (!payload?.length) return null
                  const d = payload[0]?.payload as { name: string; actual: number; predicted: number }
                  return (
                    <div className="text-xs p-2 rounded shadow"
                      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
                      <p className="font-semibold mb-1">{d.name}</p>
                      <p>Réel : {fmtTnd(d.actual)}</p>
                      <p>Prédit : {fmtTnd(d.predicted)}</p>
                    </div>
                  )
                }}
              />
              <ReferenceLine segment={[
                { x: Math.min(...scatterData.map(d=>d.actual)), y: Math.min(...scatterData.map(d=>d.actual)) },
                { x: Math.max(...scatterData.map(d=>d.actual)), y: Math.max(...scatterData.map(d=>d.actual)) },
              ]} stroke="var(--admin-emerald)" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Scatter data={scatterData} fill="#2D5A27" opacity={0.8} />
            </ScatterChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* Prediction history table */}
      <Section title="Historique des prédictions"
        subtitle={`${data?.predictions.length ?? 0} prédictions au total`}>
        {!data?.predictions.length ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--admin-text-muted)' }}>
            Aucune prédiction effectuée pour l'instant.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Projet', 'Prédiction ML', 'Réel', 'Variance %', 'Confiance', 'Modèle', 'Date'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.predictions.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--admin-bg)]" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/projects/${p.projectId}`} className="font-mono text-xs hover:underline" style={{ color: 'var(--admin-blue)' }}>
                        {p.projectRef ?? p.projectId.slice(0, 8)}
                      </Link>
                      {p.projectName && <p className="text-xs truncate max-w-[140px]" style={{ color: 'var(--admin-text-muted)' }}>{p.projectName}</p>}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-xs text-right" style={{ color: 'var(--admin-text)' }}>
                      {fmtTnd(parseFloat(p.predictedTotal))}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-xs text-right" style={{ color: 'var(--admin-text-muted)' }}>
                      {p.actualSpend !== null ? fmtTnd(p.actualSpend) : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-sm font-semibold text-right" style={{ color: varianceColor(p.variancePct) }}>
                      {fmtPct(p.variancePct)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.confidenceScore !== null ? (
                        <span className="text-xs font-medium tabular-nums" style={{ color: p.confidenceScore >= 70 ? 'var(--admin-emerald)' : 'var(--admin-amber)' }}>
                          {p.confidenceScore}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {p.isFallback ? (
                        <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--admin-amber-dim)', color: 'var(--admin-amber)' }}>Estimée</span>
                      ) : (p.modelVersion ?? '—')}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {new Date(p.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}
