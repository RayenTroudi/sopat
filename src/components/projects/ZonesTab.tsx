'use client'

import { useEffect, useState } from 'react'

type Zone = {
  id: string
  zoneName: string
  zoneType: string
  floorNumber: number | null
  surfaceM2: string | null
  status: string
  plantPaletteNotes: string | null
  lightingNotes: string | null
}

const ZONE_TYPE_LABELS: Record<string, string> = {
  entree: 'Entrée', piscine: 'Piscine', rooftop: 'Rooftop',
  restaurant: 'Restaurant', aquapark: 'Aquapark', acces_plage: 'Accès plage',
  etage: 'Étage', cour_interieure: 'Cour intérieure', parking: 'Parking',
  jardin_chef: 'Jardin chef', autre: 'Autre',
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  etude:       { label: 'Étude', color: '#f59e0b' },
  realisation: { label: 'Réalisation', color: '#10b981' },
  entretien:   { label: 'Entretien', color: '#6366f1' },
  termine:     { label: 'Terminé', color: '#6b7280' },
}

export function ZonesTab({ projectId }: { projectId: string }) {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/zones`)
      .then((r) => r.json())
      .then((data) => setZones(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) {
    return <p className="text-sm py-8 text-center" style={{ color: 'var(--admin-text-muted)' }}>Chargement…</p>
  }

  if (zones.length === 0) {
    return (
      <p className="text-sm py-8 text-center" style={{ color: 'var(--admin-text-muted)' }}>
        Aucune zone définie pour ce projet.
      </p>
    )
  }

  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
            {['Zone', 'Type', 'Étage', 'Surface', 'Statut', 'Palette', 'Éclairage'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {zones.map((zone, i) => {
            const s = STATUS_LABELS[zone.status] ?? { label: zone.status, color: '#6b7280' }
            return (
              <tr key={zone.id} style={{ borderBottom: i < zones.length - 1 ? '1px solid var(--admin-border)' : undefined }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--admin-text)' }}>{zone.zoneName}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  {ZONE_TYPE_LABELS[zone.zoneType] ?? zone.zoneType}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  {zone.floorNumber != null ? `Niv. ${zone.floorNumber}` : '—'}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  {zone.surfaceM2 ? `${zone.surfaceM2} m²` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${s.color}20`, color: s.color }}>
                    {s.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  {zone.plantPaletteNotes ?? '—'}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  {zone.lightingNotes ?? '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
