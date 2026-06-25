'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 lg:items-center">
      <Select
        value={(sp.get('type') ?? '') === '' ? '__all__' : (sp.get('type') ?? '')}
        onValueChange={(v) => set('type', v === '__all__' ? '' : v)}
      >
        <SelectTrigger className="text-sm h-9 bg-[#F4F8F5] w-full lg:w-auto" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
          {EVENT_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value === '' ? '__all__' : t.value}>{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={(sp.get('status') ?? '') === '' ? '__all__' : (sp.get('status') ?? '')}
        onValueChange={(v) => set('status', v === '__all__' ? '' : v)}
      >
        <SelectTrigger className="text-sm h-9 bg-[#F4F8F5] w-full lg:w-auto" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
          {EVENT_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value === '' ? '__all__' : s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={(sp.get('year') ?? '') === '' ? '__all__' : (sp.get('year') ?? '')}
        onValueChange={(v) => set('year', v === '__all__' ? '' : v)}
      >
        <SelectTrigger className="text-sm h-9 bg-[#F4F8F5] w-full lg:w-auto" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
          <SelectItem value="__all__">Toutes les années</SelectItem>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {canCreate && (
        <a
          href="/admin/rse/events/new?step=1"
          className="sm:col-span-2 lg:col-span-1 lg:ml-auto inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium w-full lg:w-auto"
          style={{ background: 'var(--admin-emerald)', color: '#fff' }}
        >
          + Créer un événement
        </a>
      )}
    </div>
  )
}
