'use client'

import Link from 'next/link'

type ClientCardProps = {
  id: string
  companyName: string
  displayName: string
  clientType: string
  country: string
  logoUrl?: string | null
  projectCount: number
  lastProjectDate?: Date | null
  totalRevenueTND: number
  dmsDocumentCode?: string | null
  isMasked?: boolean
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  banque:                { label: 'Banque',                color: '#3b82f6', icon: '🏦' },
  hotellerie:            { label: 'Hôtellerie',            color: '#f59e0b', icon: '🏨' },
  automobile:            { label: 'Automobile',            color: '#6b7280', icon: '🚗' },
  institutionnel_public: { label: 'Institutionnel public', color: '#8b5cf6', icon: '🏛' },
  institutionnel_prive:  { label: 'Institutionnel privé',  color: '#ec4899', icon: '🏢' },
  residentiel_prive:     { label: 'Résidentiel privé',     color: '#22c55e', icon: '🏡' },
  diplomatique:          { label: 'Diplomatique',          color: '#0ea5e9', icon: '🌐' },
  autre:                 { label: 'Autre',                 color: '#a3a3a3', icon: '⭐' },
}

const COUNTRY_FLAGS: Record<string, string> = {
  TN: '🇹🇳', FR: '🇫🇷', DZ: '🇩🇿', MA: '🇲🇦', QA: '🇶🇦',
  SA: '🇸🇦', AE: '🇦🇪', LY: '🇱🇾', SN: '🇸🇳', CI: '🇨🇮',
}

function fmtRevenue(tnd: number): string {
  if (tnd === 0) return '—'
  if (tnd >= 1_000_000) return `${(tnd / 1_000_000).toFixed(1)} M TND`
  if (tnd >= 1_000) return `${(tnd / 1_000).toFixed(0)} k TND`
  return `${tnd.toFixed(0)} TND`
}

function toInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
}

export function ClientCard({
  id,
  displayName,
  clientType,
  country,
  logoUrl,
  projectCount,
  totalRevenueTND,
  dmsDocumentCode,
  isMasked,
}: ClientCardProps) {
  const typeConf = TYPE_CONFIG[clientType] ?? TYPE_CONFIG.autre
  const flag = COUNTRY_FLAGS[country] ?? '🌍'
  const shownName = isMasked
    ? displayName.split(/\s+/).map((w) => (w[0]?.toUpperCase() ?? '') + '.').join(' ')
    : displayName

  return (
    <Link
      href={`/admin/clients/${id}`}
      className="block rounded-xl border transition-shadow hover:shadow-md"
      style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
    >
      <div className="h-1 rounded-t-xl" style={{ background: typeConf.color }} />

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={shownName}
              className="w-10 h-10 rounded-lg object-contain border"
              style={{ borderColor: 'var(--admin-border)' }}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold text-white shrink-0"
              style={{ background: typeConf.color }}
            >
              {toInitials(displayName)}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--admin-text)' }}>
              {shownName}
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              {flag} {country}
            </p>
          </div>
        </div>

        <span
          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: `${typeConf.color}18`, color: typeConf.color }}
        >
          <span>{typeConf.icon}</span>
          {typeConf.label}
        </span>

        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          <span>{projectCount} projet{projectCount !== 1 ? 's' : ''}</span>
          <span>{fmtRevenue(totalRevenueTND)}</span>
        </div>

        {dmsDocumentCode && (
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}>
            {dmsDocumentCode}
          </span>
        )}
      </div>
    </Link>
  )
}
