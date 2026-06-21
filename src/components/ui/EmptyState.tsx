import type { LucideIcon } from 'lucide-react'

type Props = {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="admin-fade-in flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
      <Icon className="w-10 h-10" style={{ color: 'var(--admin-text-dim)' }} />
      <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>{title}</p>
      {description && (
        <p className="text-xs max-w-xs" style={{ color: 'var(--admin-text-muted)' }}>{description}</p>
      )}
      {action}
    </div>
  )
}
