'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

const TYPE_OPTIONS = [
  { value: '', label: 'Tous les secteurs' },
  { value: 'banque', label: 'Banque' },
  { value: 'hotellerie', label: 'Hôtellerie' },
  { value: 'automobile', label: 'Automobile' },
  { value: 'institutionnel_public', label: 'Institutionnel public' },
  { value: 'institutionnel_prive', label: 'Institutionnel privé' },
  { value: 'residentiel_prive', label: 'Résidentiel privé' },
  { value: 'diplomatique', label: 'Diplomatique' },
  { value: 'autre', label: 'Autre' },
]

const selectStyle = {
  background: 'var(--admin-surface)',
  borderColor: 'var(--admin-border)',
  color: 'var(--admin-text)',
}

export function ClientsFilterBar({ canCreate }: { canCreate: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const push = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, sp]
  )

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <select
        value={sp.get('type') ?? ''}
        onChange={(e) => push('type', e.target.value)}
        className="text-sm px-3 py-2 rounded-lg border focus:outline-none"
        style={selectStyle}
      >
        {TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        value={sp.get('country') ?? ''}
        onChange={(e) => push('country', e.target.value)}
        className="text-sm px-3 py-2 rounded-lg border focus:outline-none"
        style={selectStyle}
      >
        <option value="">Tous les pays</option>
        <option value="TN">🇹🇳 Tunisie</option>
        <option value="FR">🇫🇷 France</option>
        <option value="DZ">🇩🇿 Algérie</option>
        <option value="MA">🇲🇦 Maroc</option>
        <option value="QA">🇶🇦 Qatar</option>
        <option value="LY">🇱🇾 Libye</option>
        <option value="SA">🇸🇦 Arabie Saoudite</option>
        <option value="AE">🇦🇪 Émirats arabes unis</option>
      </select>

      <div className="flex-1" />

      {canCreate && (
        <a
          href="/admin/clients/new"
          className="text-sm font-medium px-4 py-2 rounded-lg text-white"
          style={{ background: 'var(--admin-emerald)' }}
        >
          + Nouveau client
        </a>
      )}
    </div>
  )
}
