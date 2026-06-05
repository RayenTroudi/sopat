'use client'

const ACTION_LABELS: Record<string, string> = {
  'project.created': 'Projet créé',
  'project.updated': 'Projet mis à jour',
  'project.deleted': 'Projet supprimé',
  'project.phase_transition': 'Transition de phase',
}

type Entry = {
  id: string
  actorName: string
  action: string
  previousState: unknown
  newState: unknown
  metadata: unknown
  occurredAt: Date
}

function fmt(date: Date): string {
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ActivityLog({ entries }: { entries: Entry[] }) {
  return (
    <div
      className="rounded-xl border"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
    >
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          Journal d&apos;activité
        </h2>
      </div>

      {entries.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          Aucune activité enregistrée.
        </div>
      ) : (
        <ul className="divide-y" style={{ ['--tw-divide-opacity' as string]: '1' }}>
          {entries.map((entry) => (
            <li key={entry.id} className="px-5 py-4 flex items-start gap-4">
              {/* Icon dot */}
              <div className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--green)' }} />

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    par {entry.actorName}
                  </span>
                </div>

                {typeof entry.newState === 'object' && entry.newState !== null && (
                  <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
                    {Object.entries(entry.newState as Record<string, unknown>)
                      .map(([k, v]) => `${k}: ${String(v)}`)
                      .join(' · ')}
                  </p>
                )}
              </div>

              <time className="text-xs flex-shrink-0" style={{ color: 'var(--admin-text-muted)' }}>
                {fmt(entry.occurredAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
