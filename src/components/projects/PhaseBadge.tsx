import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

type Phase = 'draft' | 'etudes' | 'realisation' | 'entretien' | 'completed' | 'cancelled'

const LABELS: Record<Phase, string> = {
  draft:       'Brouillon',
  etudes:      'Études',
  realisation: 'Réalisation',
  entretien:   'Entretien',
  completed:   'Terminé',
  cancelled:   'Annulé',
}

const STYLES: Record<Phase, string> = {
  draft:       'bg-[var(--admin-blue-dim)] text-[var(--admin-blue)] border-transparent',
  etudes:      'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)] border-transparent',
  realisation: 'bg-[var(--admin-green-dim)] text-green border-transparent',
  entretien:   'bg-[var(--admin-accent-dim)] text-[var(--admin-accent)] border-transparent',
  completed:   'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)] border-transparent',
  cancelled:   'bg-[var(--admin-red-dim)] text-[var(--admin-red)] border-transparent',
}

export function PhaseBadge({ status }: { status: string }) {
  const phase = (status as Phase) in LABELS ? (status as Phase) : 'draft'
  return (
    <Badge className={cn('text-[11px] font-medium', STYLES[phase])}>
      {LABELS[phase]}
    </Badge>
  )
}
