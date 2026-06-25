import { cn } from '@/lib/utils'

type Props = {
  approved: string | null
  spent?: string | null
}

export function BudgetBadge({ approved, spent }: Props) {
  if (!approved) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap bg-[var(--admin-blue-dim)] text-[var(--admin-blue)]">
        Non défini
      </span>
    )
  }

  const approvedNum = parseFloat(approved)
  const spentNum = spent ? parseFloat(spent) : 0
  const ratio = spentNum / approvedNum

  let label: string
  let style: string

  if (ratio <= 0.9) {
    label = `${(ratio * 100).toFixed(0)}%`
    style = 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]'
  } else if (ratio <= 1.05) {
    label = `${(ratio * 100).toFixed(0)}%`
    style = 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]'
  } else {
    label = `${(ratio * 100).toFixed(0)}% ⚠`
    style = 'bg-[var(--admin-red-dim)] text-[var(--admin-red)]'
  }

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', style)}>
      {label}
    </span>
  )
}
