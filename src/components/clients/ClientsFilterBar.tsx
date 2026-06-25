'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

export function ClientsFilterBar() {
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
      <Select
        value={(sp.get('type') ?? '') === '' ? '__all__' : (sp.get('type') ?? '')}
        onValueChange={(v) => push('type', v === '__all__' ? '' : v)}
      >
        <SelectTrigger className="text-sm h-9 bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
          {TYPE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value === '' ? '__all__' : o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={(sp.get('country') ?? '') === '' ? '__all__' : (sp.get('country') ?? '')}
        onValueChange={(v) => push('country', v === '__all__' ? '' : v)}
      >
        <SelectTrigger className="text-sm h-9 bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
          <SelectItem value="__all__">Tous les pays</SelectItem>
          <SelectItem value="TN">🇹🇳 Tunisie</SelectItem>
          <SelectItem value="FR">🇫🇷 France</SelectItem>
          <SelectItem value="DZ">🇩🇿 Algérie</SelectItem>
          <SelectItem value="MA">🇲🇦 Maroc</SelectItem>
          <SelectItem value="QA">🇶🇦 Qatar</SelectItem>
          <SelectItem value="LY">🇱🇾 Libye</SelectItem>
          <SelectItem value="SA">🇸🇦 Arabie Saoudite</SelectItem>
          <SelectItem value="AE">🇦🇪 Émirats arabes unis</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex-1" />
    </div>
  )
}
