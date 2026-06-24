import type { LucideIcon } from 'lucide-react'

type Props = {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
      <div
        className="w-8 h-8 rounded flex items-center justify-center mb-1"
        style={{ background: 'var(--admin-bg)' }}
      >
        <Icon className="w-4 h-4" style={{ color: 'var(--admin-text-dim)' }} />
      </div>
      <p className="text-[13px] font-medium" style={{ color: 'var(--admin-text)' }}>{title}</p>
      {description && (
        <p className="text-[12px] max-w-xs leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
