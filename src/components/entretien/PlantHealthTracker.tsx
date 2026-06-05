'use client'

import { LineChart, Line, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import type { PlantHealthSummary } from '@/lib/db/entretien'

const STATUS_CONFIG = {
  healthy:   { label: 'Sain',     color: '#16A34A', bg: 'var(--admin-emerald-dim)' },
  attention: { label: 'Attention', color: '#D97706', bg: 'var(--admin-amber-dim)'  },
  critical:  { label: 'Critique',  color: '#DC2626', bg: 'var(--admin-red-dim)'    },
}

type Props = {
  summary: PlantHealthSummary[]
}

export function PlantHealthTracker({ summary }: Props) {
  if (summary.length === 0) {
    return (
      <p className="text-sm py-6 text-center" style={{ color: 'var(--admin-text-muted)' }}>
        Aucun enregistrement de santé végétale. Les données apparaîtront après le premier rapport de visite.
      </p>
    )
  }

  const hasAlert = summary.some((z) => z.criticalConsecutive >= 2)

  return (
    <div className="space-y-3">
      {hasAlert && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border" style={{ borderColor: 'var(--admin-red)', background: 'var(--admin-red-dim)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--admin-red)' }}>
            ⚠ Alerte : {summary.filter((z) => z.criticalConsecutive >= 2).length} zone{summary.filter((z) => z.criticalConsecutive >= 2).length > 1 ? 's' : ''} en état critique depuis 2+ visites consécutives.
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
              {['Zone végétale', 'Statut', 'Score', 'Tendance (5 dernières visites)', ''].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.map((zone) => {
              const cfg = STATUS_CONFIG[zone.currentStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.healthy
              const sparkData = [...zone.lastScores].reverse().map((s, i) => ({
                idx: i,
                score: s.score ?? 0,
              }))
              const isAlert = zone.criticalConsecutive >= 2

              return (
                <tr
                  key={zone.zoneName}
                  className={cn('transition-colors', isAlert ? '' : 'hover:bg-[var(--admin-bg)]')}
                  style={{ borderBottom: '1px solid var(--admin-border)', background: isAlert ? 'var(--admin-red-dim)' : undefined }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--admin-text)' }}>
                    {zone.zoneName}
                    {isAlert && <span className="ml-2 text-xs" style={{ color: 'var(--admin-red)' }}>⚠ {zone.criticalConsecutive} visites critiques</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold tabular-nums" style={{ color: cfg.color }}>
                      {zone.currentScore ?? '—'}/5
                    </span>
                  </td>
                  <td className="px-4 py-3 w-32">
                    {sparkData.length > 1 ? (
                      <ResponsiveContainer width="100%" height={36}>
                        <LineChart data={sparkData}>
                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke={cfg.color}
                            strokeWidth={2}
                            dot={false}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null
                              return (
                                <div className="text-xs px-2 py-1 rounded" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
                                  Score : {payload[0]?.value}
                                </div>
                              )
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>1 visite</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {zone.lastScores[0] ? new Date(zone.lastScores[0].visitDate).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' }) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
