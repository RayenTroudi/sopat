'use client'

import Link from 'next/link'

type EventCardProps = {
  id: string
  eventReference: string
  title: string
  eventType: string
  date: Date | string
  location: string
  partnerName?: string | null
  participantCountPlanned?: number | null
  status: string
}

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  nettoyage_plage:     { label: 'Nettoyage plage',   icon: '🏖', color: '#0ea5e9' },
  plantation:          { label: 'Plantation',         icon: '🌳', color: '#22c55e' },
  sensibilisation:     { label: 'Sensibilisation',    icon: '📢', color: '#f59e0b' },
  team_building:       { label: 'Team building',      icon: '🤝', color: '#8b5cf6' },
  journee_environnement: { label: 'Journée env.',    icon: '🌍', color: '#06b6d4' },
  autre:               { label: 'Autre',              icon: '⭐', color: '#6b7280' },
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  planifie:  { label: 'Planifié',   bg: '#eff6ff', text: '#1d4ed8' },
  en_cours:  { label: 'En cours',   bg: '#fefce8', text: '#a16207' },
  termine:   { label: 'Terminé',    bg: '#f0fdf4', text: '#15803d' },
  annule:    { label: 'Annulé',     bg: '#fef2f2', text: '#b91c1c' },
}

export function EventCard({
  id,
  eventReference,
  title,
  eventType,
  date,
  location,
  partnerName,
  participantCountPlanned,
  status,
}: EventCardProps) {
  const typeConf = TYPE_CONFIG[eventType] ?? TYPE_CONFIG.autre
  const statusConf = STATUS_CONFIG[status] ?? STATUS_CONFIG.planifie
  const dateStr = new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <Link
      href={`/admin/rse/events/${id}`}
      className="block rounded-xl border transition-shadow hover:shadow-md"
      style={{
        background: 'var(--admin-surface)',
        borderColor: 'var(--admin-border)',
      }}
    >
      {/* Color top bar */}
      <div className="h-1 rounded-t-xl" style={{ background: typeConf.color }} />

      <div className="p-4 space-y-3">
        {/* Type badge + status */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
            style={{ background: `${typeConf.color}18`, color: typeConf.color }}
          >
            <span>{typeConf.icon}</span>
            {typeConf.label}
          </span>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: statusConf.bg, color: statusConf.text }}
          >
            {statusConf.label}
          </span>
        </div>

        {/* Title */}
        <div>
          <p className="text-xs font-mono" style={{ color: 'var(--admin-text-muted)' }}>
            {eventReference}
          </p>
          <h3 className="font-semibold text-sm mt-0.5 leading-snug" style={{ color: 'var(--admin-text)' }}>
            {title}
          </h3>
        </div>

        {/* Meta */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            <span>📅</span>
            <span>{dateStr}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            <span>📍</span>
            <span>{location}</span>
          </div>
          {partnerName && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              <span>🤝</span>
              <span>{partnerName}</span>
            </div>
          )}
          {participantCountPlanned != null && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              <span>👥</span>
              <span>{participantCountPlanned} participants prévus</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
