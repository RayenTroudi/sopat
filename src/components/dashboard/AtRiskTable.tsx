import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AtRiskProject } from '@/lib/db/dashboard'
import { EmptyState } from '@/components/ui/EmptyState'

const STATUS_LABELS: Record<string, string> = {
  etudes:      'Études',
  realisation: 'Réalisation',
  entretien:   'Entretien',
}

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export function AtRiskTable({ projects }: { projects: AtRiskProject[] }) {
  if (projects.length === 0) {
    return <EmptyState icon={ShieldCheck} title="Aucun projet à risque" description="Tous les projets sont dans les délais et dans le budget." />
  }

  return (
    <div className="overflow-x-auto -mx-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
            {['Référence', 'Projet', 'Phase', 'Budget', 'Délai', 'Risques'].map((h) => (
              <th key={h} className="text-left px-4 py-2 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const spendColor = p.spendPct !== null
              ? p.spendPct >= 100 ? 'var(--admin-red)'
              : p.spendPct >= 90  ? 'var(--admin-amber)'
              : 'var(--admin-emerald)'
              : 'var(--admin-text-muted)'

            return (
              <tr
                key={p.id}
                className="admin-tr"
                style={{ borderBottom: '1px solid var(--admin-border)' }}
              >
                <td className="px-4 py-2.5">
                  <Link href={`/admin/projects/${p.id}`} className="font-mono text-[11px] font-semibold hover:underline" style={{ color: 'var(--admin-text-muted)' }}>
                    {p.reference}
                  </Link>
                </td>
                <td className="px-4 py-2.5 max-w-[160px]">
                  <p className="truncate text-[13px] font-medium" style={{ color: 'var(--admin-text)' }}>{p.name}</p>
                  <p className="truncate text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{p.clientName}</p>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                    {STATUS_LABELS[p.status] ?? p.status}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {p.spendPct !== null ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--admin-border)' }}>
                        <div className="h-full" style={{ width: `${Math.min(p.spendPct, 100)}%`, background: spendColor }} />
                      </div>
                      <span className="text-[11px] font-medium tabular-nums" style={{ color: spendColor }}>
                        {p.spendPct.toFixed(0)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {p.estimatedDeliveryDate ? (
                    <span className="text-[11px]" style={{ color: p.daysUntilDeadline !== null && p.daysUntilDeadline <= 0 ? 'var(--admin-red)' : p.daysUntilDeadline !== null && p.daysUntilDeadline <= 7 ? 'var(--admin-amber)' : 'var(--admin-text-muted)' }}>
                      {p.daysUntilDeadline !== null && p.daysUntilDeadline <= 0 ? 'Dépassé · ' : p.daysUntilDeadline !== null ? `J+${p.daysUntilDeadline} · ` : ''}
                      {new Date(p.estimatedDeliveryDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </span>
                  ) : (
                    <span className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {p.riskReasons.map((r, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
                        {r}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
