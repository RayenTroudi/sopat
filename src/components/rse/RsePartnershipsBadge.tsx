import { cn } from '@/lib/utils'

type Status = 'actif' | 'expire' | 'resilie' | 'en_cours_de_negociation'

const LABELS: Record<Status, string> = {
  actif: 'Actif',
  expire: 'Expiré',
  resilie: 'Résilié',
  en_cours_de_negociation: 'En négociation',
}

const STYLES: Record<Status, string> = {
  actif: 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
  expire: 'bg-[var(--admin-border)] text-[var(--admin-text-muted)]',
  resilie: 'bg-[var(--admin-red-dim)] text-[var(--admin-red)]',
  en_cours_de_negociation: 'bg-[var(--admin-blue-dim)] text-[var(--admin-blue)]',
}

export function RsePartnershipsBadge({ status }: { status: string }) {
  const s = (status as Status) in LABELS ? (status as Status) : 'en_cours_de_negociation'
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', STYLES[s])}>
      {LABELS[s]}
    </span>
  )
}

type CommitmentStatus = 'respecte' | 'en_retard' | 'a_venir'

const COMMITMENT_LABELS: Record<CommitmentStatus, string> = {
  respecte: 'Respecté',
  en_retard: 'En retard',
  a_venir: 'À venir',
}

const COMMITMENT_STYLES: Record<CommitmentStatus, string> = {
  respecte: 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
  en_retard: 'bg-[var(--admin-red-dim)] text-[var(--admin-red)]',
  a_venir: 'bg-[var(--admin-blue-dim)] text-[var(--admin-blue)]',
}

export function RseCommitmentBadge({ status }: { status: string }) {
  const s = (status as CommitmentStatus) in COMMITMENT_LABELS ? (status as CommitmentStatus) : 'a_venir'
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', COMMITMENT_STYLES[s])}>
      {COMMITMENT_LABELS[s]}
    </span>
  )
}

type CommValidation = 'en_attente' | 'approuve' | 'refuse'

const COMM_LABELS: Record<CommValidation, string> = {
  en_attente: 'En attente',
  approuve: 'Approuvé',
  refuse: 'Refusé',
}

const COMM_STYLES: Record<CommValidation, string> = {
  en_attente: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  approuve: 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
  refuse: 'bg-[var(--admin-red-dim)] text-[var(--admin-red)]',
}

export function RseCommunicationBadge({ status }: { status: string }) {
  const s = (status as CommValidation) in COMM_LABELS ? (status as CommValidation) : 'en_attente'
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', COMM_STYLES[s])}>
      {COMM_LABELS[s]}
    </span>
  )
}
