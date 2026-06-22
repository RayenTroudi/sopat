'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
        className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2 lg:gap-3 px-4 sm:px-5 py-3 border-b"
        style={{ borderColor: 'var(--admin-border)' }}
      >
        <Select
          value={(searchParams.get('status') ?? '') === '' ? '__all__' : (searchParams.get('status') ?? '')}
          onValueChange={(v) => updateParam('status', v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="text-sm h-9 bg-white w-full lg:w-auto" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value === '' ? '__all__' : o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={(searchParams.get('partnerType') ?? '') === '' ? '__all__' : (searchParams.get('partnerType') ?? '')}
          onValueChange={(v) => updateParam('partnerType', v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="text-sm h-9 bg-white w-full lg:w-auto" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value === '' ? '__all__' : o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs sm:col-span-2 lg:col-span-1 lg:ml-auto" style={{ color: 'var(--admin-text-muted)' }}>
          {rows.length} partenariat{rows.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Mobile card list */}
      <ul className="md:hidden divide-y" style={{ borderColor: 'var(--admin-border)' }}>
        {rows.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Aucun partenariat RSE trouvé
          </li>
        ) : rows.map((row) => {
          const days = daysUntil(row.endDate)
          const expiryWarning = days !== null && days >= 0 && days <= 60
          const isExpiredActive = days !== null && days < 0 && row.status === 'actif'
          return (
            <li key={row.id} style={{ borderColor: 'var(--admin-border)' }}>
              <Link href={`/admin/rse/partnerships/${row.id}`} className="block px-4 py-3 active:bg-[var(--admin-bg)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{row.conventionReference}</span>
                      <RsePartnershipsBadge status={row.status} />
                      {row.hasOverdueCommitments && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>⚠</span>
                      )}
                    </div>
                    <p className="mt-1 font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{row.partnerName}</p>
                    <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{PARTNER_TYPE_LABELS[row.partnerType] ?? row.partnerType}</p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                      <div className="min-w-0">
                        <dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Référent</dt>
                        <dd className="truncate" style={{ color: 'var(--admin-text)' }}>{row.sopatReferentName ?? '—'}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Début</dt>
                        <dd style={{ color: 'var(--admin-text)' }}>{fmt(row.startDate)}</dd>
                      </div>
                      <div className="min-w-0 col-span-2">
                        <dt className="uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Fin / Échéance</dt>
                        <dd className="flex items-center gap-2 flex-wrap" style={{ color: 'var(--admin-text)' }}>
                          <span>{fmt(row.endDate)}</span>
                          {isExpiredActive && <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>Expiré</span>}
                          {expiryWarning && !isExpiredActive && <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--admin-amber-dim)', color: 'var(--admin-amber)' }}>J-{days}</span>}
                          {row.autoRenewal && <span className="text-[11px]" style={{ color: 'var(--admin-text-dim)' }}>↻</span>}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <span className="text-xs font-medium shrink-0 mt-1" style={{ color: 'var(--admin-emerald)' }}>→</span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
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
