import Link from 'next/link'
import type { DeadlineAlert } from '@/lib/db/alerts'
import { AlertTriangle, Clock, FileWarning, Briefcase, ClipboardCheck } from 'lucide-react'

const KIND_ICONS = {
  nc: AlertTriangle,
  capa: ClipboardCheck,
  review_action: Clock,
  offer: Briefcase,
  document: FileWarning,
} as const

export default function DeadlineAlertsPanel({ alerts }: { alerts: DeadlineAlert[] }) {
  if (alerts.length === 0) return null
  const overdueCount = alerts.filter((a) => a.overdue).length

  return (
    <div
      className="overflow-hidden"
      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}
    >
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid var(--admin-border)' }}>
        <p className="text-[13px] font-semibold" style={{ color: 'var(--admin-text)' }}>
          Alertes &amp; échéances
        </p>
        {overdueCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
            {overdueCount} en retard
          </span>
        )}
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
        {alerts.slice(0, 8).map((a, i) => {
          const Icon = KIND_ICONS[a.kind]
          const color = a.overdue ? 'var(--admin-red)' : 'var(--admin-amber)'
          return (
            <Link
              key={i}
              href={a.href}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--admin-bg)] transition-colors"
            >
              <Icon size={15} className="shrink-0" style={{ color }} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: 'var(--admin-text)' }}>{a.label}</p>
                <p className="text-[11px] truncate" style={{ color: 'var(--admin-text-muted)' }}>{a.detail}</p>
              </div>
              {a.dueDate && (
                <span className="text-[11px] font-medium shrink-0 tabular-nums" style={{ color }}>
                  {new Date(a.dueDate).toLocaleDateString('fr-FR')}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
