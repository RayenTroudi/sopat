import type { getSmqKpis } from '@/lib/db/kpi-smq'
import Link from 'next/link'

type SmqKpis = Awaited<ReturnType<typeof getSmqKpis>>

function KpiCard({
  label,
  value,
  subtext,
  color = 'var(--admin-text)',
  href,
}: {
  label: string
  value: string | number
  subtext?: string
  color?: string
  href?: string
}) {
  const content = (
    <div className="rounded-xl border p-4 transition-shadow hover:shadow-sm" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
      {subtext && <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-muted)' }}>{subtext}</p>}
    </div>
  )
  if (href) return <Link href={href}>{content}</Link>
  return content
}

export function SmqDashboard({ kpis, year }: { kpis: SmqKpis; year: number }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>Tableau de bord SMQ</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>FOR-MI-10 — Indicateurs qualité {year}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="NC ouvertes"
          value={kpis.ncOpen}
          subtext={`${kpis.ncTotal} total cette année`}
          color={kpis.ncOpen > 5 ? 'var(--admin-red)' : kpis.ncOpen > 0 ? 'var(--admin-amber)' : 'var(--admin-emerald)'}
          href="/admin/nc"
        />
        <KpiCard
          label="Taux clôture NC"
          value={`${kpis.ncRate}%`}
          subtext={`${kpis.ncClosed} / ${kpis.ncTotal} clôturées`}
          color={kpis.ncRate >= 80 ? 'var(--admin-emerald)' : kpis.ncRate >= 50 ? 'var(--admin-amber)' : 'var(--admin-red)'}
          href="/admin/nc"
        />
        <KpiCard
          label="Efficacité CAPA"
          value={`${kpis.capaRate}%`}
          subtext={`${kpis.capaEffective} / ${kpis.capaTotal} clôturées`}
          color={kpis.capaRate >= 80 ? 'var(--admin-emerald)' : kpis.capaRate >= 50 ? 'var(--admin-amber)' : 'var(--admin-red)'}
        />
        <KpiCard
          label="Réalisation audits"
          value={`${kpis.auditRate}%`}
          subtext={`${kpis.auditDone} / ${kpis.auditTotal} réalisés`}
          color={kpis.auditRate >= 80 ? 'var(--admin-emerald)' : kpis.auditRate >= 50 ? 'var(--admin-amber)' : 'var(--admin-red)'}
          href="/admin/audit-programs"
        />
        <KpiCard
          label="Risques critiques (≥12)"
          value={kpis.risksHigh}
          subtext="Criticité gravité×probabilité"
          color={kpis.risksHigh > 3 ? 'var(--admin-red)' : kpis.risksHigh > 0 ? 'var(--admin-amber)' : 'var(--admin-emerald)'}
          href="/admin/risks-opportunities?type=risk"
        />
        <KpiCard
          label="Déchets tracés"
          value={`${kpis.wasteKg.toFixed(0)} kg`}
          subtext={`Année ${year}`}
          color="var(--admin-text)"
          href="/admin/environment/waste"
        />
        <KpiCard
          label="Conformité HSE"
          value={kpis.hseTotal > 0 ? `${kpis.hseRate}%` : '—'}
          subtext={`${kpis.hseTotal} soumissions`}
          color={kpis.hseRate >= 90 ? 'var(--admin-emerald)' : kpis.hseRate >= 70 ? 'var(--admin-amber)' : 'var(--admin-red)'}
          href="/admin/environment/hse-checklist"
        />
      </div>

      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--admin-text-muted)' }}>Modules SMQ</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: 'Risques & Opportunités', href: '/admin/risks-opportunities' },
            { label: 'Parties Intéressées', href: '/admin/stakeholders' },
            { label: 'Veille Réglementaire', href: '/admin/regulatory-watch' },
            { label: 'Auditeurs Internes', href: '/admin/auditors' },
            { label: 'Déchets', href: '/admin/environment/waste' },
            { label: 'Checklist HSE', href: '/admin/environment/hse-checklist' },
            { label: 'Plan de Management', href: '/admin/management-plan' },
            { label: 'Non-Conformités', href: '/admin/nc' },
          ].map(({ label, href }) => (
            <Link key={href} href={href}
              className="px-3 py-2 rounded-lg border text-[13px] transition-colors hover:opacity-80"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)', background: 'var(--admin-bg)' }}>
              {label} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
