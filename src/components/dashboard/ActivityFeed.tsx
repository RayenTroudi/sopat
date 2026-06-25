import Link from 'next/link'
import { Activity, FolderPlus, ArrowRight, CheckCircle, PenLine, ShoppingCart, Camera, BarChart2, CalendarPlus, FileText, Star } from 'lucide-react'
import type { ActivityEntry } from '@/lib/db/dashboard'
import { EmptyState } from '@/components/ui/EmptyState'
import type { LucideIcon } from 'lucide-react'

const ACTION_LABELS: Record<string, string> = {
  'project.created':                     'a créé un projet',
  'project.updated':                     'a mis à jour un projet',
  'project.deleted':                     'a supprimé un projet',
  'project.phase_transition':            'a changé la phase',
  'budget.validated_by_chef':            'a validé le budget',
  'budget.modified_by_chef':             'a modifié le budget',
  'realisation.purchase_created':        'a enregistré un achat',
  'realisation.purchase_deleted':        'a supprimé un achat',
  'realisation.site_photo_uploaded':     'a téléchargé une photo',
  'realisation.budget_reconciliation_submitted': 'a soumis le rapprochement',
  'entretien.visit_scheduled':           'a planifié une visite',
  'entretien.visit_report_saved':        'a sauvegardé un rapport',
  'entretien.contract_updated':          'a mis à jour le contrat',
  'entretien.satisfaction_recorded':     'a enregistré la satisfaction',
}

const ACTION_ICONS: Record<string, LucideIcon> = {
  'project.created':                     FolderPlus,
  'project.phase_transition':            ArrowRight,
  'budget.validated_by_chef':            CheckCircle,
  'budget.modified_by_chef':             PenLine,
  'realisation.purchase_created':        ShoppingCart,
  'realisation.site_photo_uploaded':     Camera,
  'realisation.budget_reconciliation_submitted': BarChart2,
  'entretien.visit_scheduled':           CalendarPlus,
  'entretien.visit_report_saved':        FileText,
  'entretien.satisfaction_recorded':     Star,
}

function fmtTime(d: Date) {
  const now = new Date()
  const diff = Math.floor((now.getTime() - new Date(d).getTime()) / 1000)
  if (diff < 60) return 'maintenant'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return <EmptyState icon={Activity} title="Aucune activité récente" />
  }

  return (
    <div className="divide-y divide-[#C2D5C9]">
      {entries.map((entry) => {
        const Icon = ACTION_ICONS[entry.action] ?? Activity
        return (
          <div key={entry.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
            <div
              className="w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: 'var(--admin-bg)' }}
            >
              <Icon className="w-3 h-3" style={{ color: '#000000' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] leading-tight" style={{ color: 'var(--admin-text)' }}>
                <span className="font-medium">{entry.actorName}</span>
                {' '}
                <span style={{ color: 'var(--admin-text-muted)' }}>{ACTION_LABELS[entry.action] ?? entry.action}</span>
              </p>
              {(entry.projectName || entry.projectRef) && (
                <Link
                  href={`/admin/projects/${entry.projectId}`}
                  className="text-[11px] hover:underline mt-0.5 block truncate"
                  style={{ color: 'var(--admin-text-muted)' }}
                >
                  {entry.projectRef}{entry.projectRef && entry.projectName ? ' · ' : ''}{entry.projectName}
                </Link>
              )}
            </div>
            <span className="text-[11px] shrink-0 tabular-nums" style={{ color: 'var(--admin-text-dim)' }}>
              {fmtTime(entry.occurredAt)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
