'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type ZoneRow = {
  zoneName: string
  zoneType: string
  floorNumber?: number
  surfaceM2?: string
  plantPaletteNotes?: string
  lightingNotes?: string
}

const ZONE_TYPE_OPTIONS = [
  { value: 'entree', label: 'Entrée' },
  { value: 'piscine', label: 'Piscine' },
  { value: 'rooftop', label: 'Rooftop' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'aquapark', label: 'Aquapark' },
  { value: 'acces_plage', label: 'Accès plage' },
  { value: 'etage', label: 'Étage' },
  { value: 'cour_interieure', label: 'Cour intérieure' },
  { value: 'parking', label: 'Parking' },
  { value: 'jardin_chef', label: 'Jardin chef' },
  { value: 'autre', label: 'Autre' },
]

const inputClass = 'text-sm px-2 py-1.5 rounded border focus:outline-none focus:ring-1 focus:ring-green/30 w-full'
const inputStyle = {
  background: 'var(--admin-surface)',
  borderColor: 'var(--admin-border)',
  color: 'var(--admin-text)',
}

type Props = {
  value: ZoneRow[]
  onChange: (zones: ZoneRow[]) => void
  showFloor?: boolean
}

export function ZoneBuilder({ value, onChange, showFloor = false }: Props) {
  function addZone() {
    onChange([...value, { zoneName: '', zoneType: 'autre' }])
  }

  function removeZone(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }

  function updateZone(i: number, patch: Partial<ZoneRow>) {
    onChange(value.map((z, idx) => idx === i ? { ...z, ...patch } : z))
  }

  return (
    <div className="space-y-2">
      {value.map((zone, i) => (
        <div key={i} className="flex items-start gap-2 flex-wrap">
          <input
            className={inputClass}
            style={{ ...inputStyle, minWidth: 140 }}
            placeholder="Nom de la zone"
            value={zone.zoneName}
            onChange={(e) => updateZone(i, { zoneName: e.target.value })}
          />
          <Select value={zone.zoneType} onValueChange={(v) => updateZone(i, { zoneType: v })}>
            <SelectTrigger className="text-sm h-9 bg-white" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)', minWidth: 130 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
              {ZONE_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showFloor && (
            <input
              className={inputClass}
              style={{ ...inputStyle, width: 72 }}
              type="number"
              placeholder="Étage"
              value={zone.floorNumber ?? ''}
              onChange={(e) => updateZone(i, { floorNumber: e.target.value ? parseInt(e.target.value) : undefined })}
            />
          )}
          <input
            className={inputClass}
            style={{ ...inputStyle, width: 80 }}
            type="number"
            step="0.01"
            placeholder="m²"
            value={zone.surfaceM2 ?? ''}
            onChange={(e) => updateZone(i, { surfaceM2: e.target.value || undefined })}
          />
          <button
            type="button"
            onClick={() => removeZone(i)}
            className="text-xs px-2 py-1.5 rounded border"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addZone}
        className="text-xs px-3 py-1.5 rounded border transition-colors hover:bg-[var(--admin-bg)]"
        style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
      >
        + Ajouter une zone
      </button>
    </div>
  )
}
