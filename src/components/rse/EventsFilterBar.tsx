'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const EVENT_TYPES = [
  { value: '', label: 'Tous les types' },
  { value: 'nettoyage_plage', label: 'Nettoyage plage' },
  { value: 'plantation', label: 'Plantation' },
  { value: 'sensibilisation', label: 'Sensibilisation' },
  { value: 'team_building', label: 'Team building' },
  { value: 'journee_environnement', label: 'Journée environnement' },
  { value: 'autre', label: 'Autre' },
]

const EVENT_STATUSES = [
  { value: '', label: 'Tous les statuts' },
  { value: 'planifie', label: 'Planifié' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' },
  { value: 'annule', label: 'Annulé' },
]

export function EventsFilterBar({ canCreate }: { canCreate: boolean }) {
  const router = useRouter()
  const sp = useSearchParams()

  function set(key: string, val: string) {
    const params = new URLSearchParams(sp.toString())
    if (val) params.set(key, val)
    else params.delete(key)
    router.push(`/admin/rse/events?${params.toString()}`)
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <select
        value={sp.get('type') ?? ''}
        onChange={(e) => set('type', e.target.value)}
        className="text-sm px-3 py-1.5 rounded-lg border"
        style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
      >
        {EVENT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      <select
        value={sp.get('status') ?? ''}
        onChange={(e) => set('status', e.target.value)}
        className="text-sm px-3 py-1.5 rounded-lg border"
        style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
      >
        {EVENT_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <select
        value={sp.get('year') ?? ''}
        onChange={(e) => set('year', e.target.value)}
        className="text-sm px-3 py-1.5 rounded-lg border"
        style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
      >
        <option value="">Toutes les années</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>{y}</option>
        ))}
      </select>

      {canCreate && (
        <a
          href="/admin/rse/events/new?step=1"
          className="ml-auto inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium"
          style={{ background: 'var(--admin-emerald)', color: '#fff' }}
        >
          + Créer un événement
        </a>
      )}
    </div>
  )
}
