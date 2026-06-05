import Link from 'next/link'
import type { ActivityEntry } from '@/lib/db/dashboard'

const ACTION_LABELS: Record<string, string> = {
  'project.created':                     'Projet créé',
  'project.updated':                     'Projet mis à jour',
  'project.deleted':                     'Projet supprimé',
  'project.phase_transition':            'Transition de phase',
  'budget.validated_by_chef':            'Budget validé (chef)',
  'budget.modified_by_chef':             'Budget modifié (chef)',
  'realisation.purchase_created':        'Achat enregistré',
  'realisation.purchase_deleted':        'Achat supprimé',
  'realisation.site_photo_uploaded':     'Photo de jalon téléchargée',
  'realisation.budget_reconciliation_submitted': 'Rapprochement budgétaire soumis',
  'entretien.visit_scheduled':           'Visite planifiée',
  'entretien.visit_report_saved':        'Rapport de visite sauvegardé',
  'entretien.contract_updated':          'Contrat mis à jour',
  'entretien.satisfaction_recorded':     'Satisfaction client enregistrée',
}

const ACTION_ICONS: Record<string, string> = {
  'project.created':                     '📁',
  'project.phase_transition':            '→',
  'budget.validated_by_chef':            '✓',
  'budget.modified_by_chef':             '✎',
  'realisation.purchase_created':        '🛒',
  'realisation.site_photo_uploaded':     '📷',
  'realisation.budget_reconciliation_submitted': '📊',
  'entretien.visit_scheduled':           '📅',
  'entretien.visit_report_saved':        '📝',
  'entretien.satisfaction_recorded':     '⭐',
}

function fmtTime(d: Date) {
  const now = new Date()
  const diff = Math.floor((now.getTime() - new Date(d).getTime()) / 1000)
  if (diff < 60) return 'À l\'instant'
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
        Aucune activité récente.
      </p>
    )
  }

  return (
    <div className="space-y-0 divide-y" style={{ borderColor: 'var(--admin-border)' }}>
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
            style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}
          >
            {ACTION_ICONS[entry.action] ?? '·'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                {entry.actorName}
              </span>
              <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                {ACTION_LABELS[entry.action] ?? entry.action}
              </span>
            </div>
            {(entry.projectName || entry.projectRef) && (
              <Link
                href={`/admin/projects/${entry.projectId}`}
                className="text-xs hover:underline mt-0.5 block truncate"
                style={{ color: 'var(--admin-blue)' }}
              >
                {entry.projectRef} — {entry.projectName}
              </Link>
            )}
          </div>
          <span className="text-xs shrink-0" style={{ color: 'var(--admin-text-muted)' }}>
            {fmtTime(entry.occurredAt)}
          </span>
        </div>
      ))}
    </div>
  )
}
