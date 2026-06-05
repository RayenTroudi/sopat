import { cn } from '@/lib/utils'

type Phase = 'draft' | 'etudes' | 'realisation' | 'entretien' | 'completed' | 'cancelled'

const LABELS: Record<Phase, string> = {
  draft: 'Brouillon',
  etudes: 'Études',
  realisation: 'Réalisation',
  entretien: 'Entretien',
  completed: 'Terminé',
  cancelled: 'Annulé',
}

const STYLES: Record<Phase, string> = {
  draft: 'bg-[var(--admin-blue-dim)] text-[var(--admin-blue)]',
  etudes: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  realisation: 'bg-[var(--admin-green-dim)] text-green',
  entretien: 'bg-[var(--admin-accent-dim)] text-[var(--admin-accent)]',
  completed: 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
  cancelled: 'bg-[var(--admin-red-dim)] text-[var(--admin-red)]',
}

export function PhaseBadge({ status }: { status: string }) {
  const phase = (status as Phase) in LABELS ? (status as Phase) : 'draft'
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        STYLES[phase]
      )}
    >
      {LABELS[phase]}
    </span>
  )
}
