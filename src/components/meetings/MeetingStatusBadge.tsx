import { AI_STATUS_COLORS, AI_STATUS_LABELS, type MeetingAiStatus } from '@/lib/meetings/status'

/**
 * Pastille de statut. Reprend les variables CSS du système admin existant
 * plutôt que d'introduire une palette propre au module.
 */
export function MeetingStatusBadge({ status }: { status: MeetingAiStatus | null | undefined }) {
  if (!status) {
    return (
      <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
        —
      </span>
    )
  }
  const colors = AI_STATUS_COLORS[status]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
      style={{ background: colors.bg, color: colors.fg }}
    >
      {AI_STATUS_LABELS[status]}
    </span>
  )
}
