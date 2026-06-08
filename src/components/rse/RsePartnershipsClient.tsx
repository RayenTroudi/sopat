'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { RsePartnershipsBadge } from './RsePartnershipsBadge'
import type { RsePartnershipListItem } from '@/lib/db/rse'

const PARTNER_TYPE_LABELS: Record<string, string> = {
  hotel: 'Hôtel',
  municipalite: 'Municipalité',
  entreprise: 'Entreprise',
  institution: 'Institution',
  autre: 'Autre',
}

function fmt(date: Date | string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function daysUntil(date: Date | string | null): number | null {
  if (!date) return null
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'actif', label: 'Actif' },
  { value: 'en_cours_de_negociation', label: 'En négociation' },
  { value: 'expire', label: 'Expiré' },
  { value: 'resilie', label: 'Résilié' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'Tous les types' },
  { value: 'hotel', label: 'Hôtel' },
  { value: 'municipalite', label: 'Municipalité' },
  { value: 'entreprise', label: 'Entreprise' },
  { value: 'institution', label: 'Institution' },
  { value: 'autre', label: 'Autre' },
]

const selectStyle = {
  background: 'var(--admin-surface)',
  borderColor: 'var(--admin-border)',
  color: 'var(--admin-text)',
}

export function RsePartnershipsClient({
  rows,
  initialStatus,
  initialPartnerType,
}: {
  rows: RsePartnershipListItem[]
  initialStatus: string
  initialPartnerType: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div>
      {/* Filters */}
      <div
        className="flex items-center gap-3 px-5 py-3 border-b flex-wrap"
        style={{ borderColor: 'var(--admin-border)' }}
      >
        <select
          value={searchParams.get('status') ?? ''}
          onChange={(e) => updateParam('status', e.target.value)}
          className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green/20"
          style={selectStyle}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={searchParams.get('partnerType') ?? ''}
          onChange={(e) => updateParam('partnerType', e.target.value)}
          className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green/20"
          style={selectStyle}
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <span className="ml-auto text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {rows.length} partenariat{rows.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
              {['Référence', 'Partenaire', 'Type', 'Référent SOPAT', 'Début', 'Fin / Échéance', 'Statut', ''].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--admin-text-muted)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="text-center py-12 text-sm"
                  style={{ color: 'var(--admin-text-muted)' }}
                >
                  Aucun partenariat RSE trouvé
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const days = daysUntil(row.endDate)
                const expiryWarning = days !== null && days >= 0 && days <= 60
                const isExpiredActive = days !== null && days < 0 && row.status === 'actif'

                return (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-[var(--admin-bg)]"
                    style={{ borderBottom: '1px solid var(--admin-border)' }}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--admin-text)' }}>
                      {row.conventionReference}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--admin-text)' }}>
                      <div className="flex items-center gap-2">
                        {row.hasOverdueCommitments && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                            style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}
                            title="Engagements en retard"
                          >
                            ⚠
                          </span>
                        )}
                        {row.partnerName}
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--admin-text-muted)' }}>
                      {PARTNER_TYPE_LABELS[row.partnerType] ?? row.partnerType}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--admin-text-muted)' }}>
                      {row.sopatReferentName ?? '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--admin-text-muted)' }}>
                      {fmt(row.startDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span style={{ color: 'var(--admin-text-muted)' }}>{fmt(row.endDate)}</span>
                        {isExpiredActive && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                            style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}
                          >
                            Expiré
                          </span>
                        )}
                        {expiryWarning && !isExpiredActive && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                            style={{ background: 'var(--admin-amber-dim)', color: 'var(--admin-amber)' }}
                          >
                            J-{days}
                          </span>
                        )}
                        {row.autoRenewal && (
                          <span
                            className="text-xs"
                            style={{ color: 'var(--admin-text-dim)' }}
                            title="Renouvellement automatique activé"
                          >
                            ↻
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RsePartnershipsBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/rse/partnerships/${row.id}`}
                        className="text-xs font-medium"
                        style={{ color: 'var(--admin-emerald)' }}
                      >
                        Voir →
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
