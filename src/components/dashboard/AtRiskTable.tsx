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
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
            {['Référence', 'Projet', 'Phase', 'Budget consommé', 'Délai', 'Risques'].map((h) => (
              <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
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
                className="hover:bg-[var(--admin-bg)] transition-colors"
                style={{ borderBottom: '1px solid var(--admin-border)' }}
              >
                <td className="px-4 py-3">
                  <Link href={`/admin/projects/${p.id}`} className="font-mono text-xs font-semibold hover:underline" style={{ color: 'var(--admin-blue)' }}>
                    {p.reference}
                  </Link>
                </td>
                <td className="px-4 py-3 max-w-[160px]">
                  <p className="truncate font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{p.name}</p>
                  <p className="truncate text-xs" style={{ color: 'var(--admin-text-muted)' }}>{p.clientName}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {STATUS_LABELS[p.status] ?? p.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {p.spendPct !== null ? (
                    <div className="space-y-1">
                      <span className="text-sm font-semibold tabular-nums" style={{ color: spendColor }}>
                        {p.spendPct.toFixed(0)}%
                      </span>
                      <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--admin-border)' }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(p.spendPct, 100)}%`, background: spendColor }} />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {p.estimatedDeliveryDate ? (
                    <span className="text-xs" style={{ color: p.daysUntilDeadline !== null && p.daysUntilDeadline <= 0 ? 'var(--admin-red)' : p.daysUntilDeadline !== null && p.daysUntilDeadline <= 7 ? 'var(--admin-amber)' : 'var(--admin-text-muted)' }}>
                      {p.daysUntilDeadline !== null && p.daysUntilDeadline <= 0 ? 'Dépassé' : p.daysUntilDeadline !== null ? `J${p.daysUntilDeadline < 0 ? '' : '+'}${p.daysUntilDeadline}` : ''}
                      {' '}
                      {new Date(p.estimatedDeliveryDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {p.riskReasons.map((r, i) => (
                      <span key={i} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
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
