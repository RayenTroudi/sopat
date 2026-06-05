'use client'

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

type Props = {
  approvedAmount: string          // decimal string from DB
  approvedByName: string | null
  approvedAt: Date | null
  validationStatus: string        // 'validated' | 'modified'
  modificationReason?: string | null
  isAdmin: boolean
  projectId: string
  onRequestUnlock?: () => void    // admin-only action to allow re-running prediction
}

function fmt(date: Date | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function OfficialBudgetCard({
  approvedAmount,
  approvedByName,
  approvedAt,
  validationStatus,
  modificationReason,
  isAdmin,
  onRequestUnlock,
}: Props) {
  const amount = parseFloat(approvedAmount)
  const formatted = `${FMT.format(Math.round(amount))} TND`
  const wasModified = validationStatus === 'modified'

  return (
    <div
      className="rounded-xl border-2 overflow-hidden"
      style={{ borderColor: 'var(--admin-emerald)', background: 'var(--admin-surface)' }}
    >
      {/* Green top bar */}
      <div
        className="px-5 py-2.5 flex items-center justify-between"
        style={{ background: 'var(--admin-emerald)', color: 'white' }}
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-xs font-semibold uppercase tracking-wide">Budget Officiel</span>
        </div>
        {wasModified && (
          <span className="text-xs opacity-80">Modifié par le chef</span>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-3xl font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
              {formatted}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
              Approuvé par {approvedByName ?? 'Inconnu'} · {fmt(approvedAt)}
            </p>
          </div>
          {isAdmin && onRequestUnlock && (
            <button
              type="button"
              onClick={onRequestUnlock}
              className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
            >
              Modifier (admin)
            </button>
          )}
        </div>

        {wasModified && modificationReason && (
          <div
            className="rounded-lg p-3"
            style={{ background: 'var(--admin-amber-dim)' }}
          >
            <p className="text-xs font-medium" style={{ color: 'var(--admin-amber)' }}>
              Raison de la modification
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text)' }}>
              {modificationReason}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Compact variant shown in Réalisation / Entretien tabs ───────────────────

export function BudgetSummaryBanner({ approvedBudget }: { approvedBudget: string | null }) {
  if (!approvedBudget) return null
  const amount = parseFloat(approvedBudget)
  const formatted = `${FMT.format(Math.round(amount))} TND`

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-lg border"
      style={{
        borderColor: 'var(--admin-emerald)',
        background:  'var(--admin-emerald-dim)',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--admin-emerald)', flexShrink: 0 }}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <span className="text-sm" style={{ color: 'var(--admin-emerald)' }}>
        Budget approuvé en Études :{' '}
        <strong className="font-semibold">{formatted}</strong>
      </span>
    </div>
  )
}
