import type { getSmqKpis } from '@/lib/db/kpi-smq'
import Link from 'next/link'

type SmqKpis = Awaited<ReturnType<typeof getSmqKpis>>

function KpiCard({
  label,
  value,
  subtext,
  color = 'text-gray-900',
  href,
}: {
  label: string
  value: string | number
  subtext?: string
  color?: string
  href?: string
}) {
  const content = (
    <div className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
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
          <h2 className="text-lg font-semibold text-gray-900">Tableau de bord SMQ</h2>
          <p className="text-sm text-gray-500">FOR-MI-10 — Indicateurs qualité {year}</p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="NC ouvertes"
          value={kpis.ncOpen}
          subtext={`${kpis.ncTotal} total cette année`}
          color={kpis.ncOpen > 5 ? 'text-red-600' : kpis.ncOpen > 0 ? 'text-orange-500' : 'text-green-600'}
          href="/admin/nc"
        />
        <KpiCard
          label="Taux clôture NC"
          value={`${kpis.ncRate}%`}
          subtext={`${kpis.ncClosed} / ${kpis.ncTotal} clôturées`}
          color={kpis.ncRate >= 80 ? 'text-green-600' : kpis.ncRate >= 50 ? 'text-orange-500' : 'text-red-600'}
          href="/admin/nc"
        />
        <KpiCard
          label="Efficacité CAPA"
          value={`${kpis.capaRate}%`}
          subtext={`${kpis.capaEffective} / ${kpis.capaTotal} clôturées`}
          color={kpis.capaRate >= 80 ? 'text-green-600' : kpis.capaRate >= 50 ? 'text-orange-500' : 'text-red-600'}
        />
        <KpiCard
          label="Réalisation audits"
          value={`${kpis.auditRate}%`}
          subtext={`${kpis.auditDone} / ${kpis.auditTotal} réalisés`}
          color={kpis.auditRate >= 80 ? 'text-green-600' : kpis.auditRate >= 50 ? 'text-orange-500' : 'text-red-600'}
          href="/admin/audit-programs"
        />
        <KpiCard
          label="Risques critiques (≥12)"
          value={kpis.risksHigh}
          subtext="Criticité gravité×probabilité"
          color={kpis.risksHigh > 3 ? 'text-red-600' : kpis.risksHigh > 0 ? 'text-orange-500' : 'text-green-600'}
          href="/admin/risks-opportunities?type=risk"
        />
        <KpiCard
          label="Déchets tracés"
          value={`${kpis.wasteKg.toFixed(0)} kg`}
          subtext={`Année ${year}`}
          color="text-gray-700"
          href="/admin/environment/waste"
        />
        <KpiCard
          label="Conformité HSE"
          value={kpis.hseTotal > 0 ? `${kpis.hseRate}%` : '—'}
          subtext={`${kpis.hseTotal} soumissions`}
          color={kpis.hseRate >= 90 ? 'text-green-600' : kpis.hseRate >= 70 ? 'text-orange-500' : 'text-red-600'}
          href="/admin/environment/hse-checklist"
        />
      </div>

      {/* Quick links */}
      <div className="border rounded-lg p-4 bg-white">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Modules SMQ</p>
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
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors">
              {label} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
