import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRseImpactData } from '@/lib/db/rse-events'
import { db } from '../../../../../../db/index'
import { rsePartnerships, rsePartnershipCommitments } from '../../../../../../db/schema'
import { eq, count, sql } from 'drizzle-orm'
import { RseImpactCharts } from '@/components/rse/RseImpactCharts'
import { PrintButton } from '@/components/rse/PrintButton'

export default async function RseImpactPage() {
  const session = await auth()
  if (!session) redirect('/auth/login')

  const [impactData, partnershipStats] = await Promise.all([
    getRseImpactData(),
    Promise.all([
      db
        .select({ count: count() })
        .from(rsePartnerships)
        .where(eq(rsePartnerships.status, 'actif')),
      db
        .select({
          total: count(),
          onTime: sql<number>`COUNT(*) FILTER (WHERE status = 'respecte')`,
        })
        .from(rsePartnershipCommitments),
    ]),
  ])

  const [activePartnershipsRow, commitmentsRow] = partnershipStats
  const activePartnerships = activePartnershipsRow[0]?.count ?? 0
  const totalCommitments = Number(commitmentsRow[0]?.total ?? 0)
  const onTimeCommitments = Number(commitmentsRow[0]?.onTime ?? 0)
  const fulfillmentRate =
    totalCommitments > 0 ? Math.round((onTimeCommitments / totalCommitments) * 100) : 0

  return (
    <div className="p-6 space-y-6">
      {/* Header with print button — hidden when printing */}
      <div className="flex items-center justify-between print:hidden" data-print-hide>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
            Tableau de bord Impact RSE
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            Indicateurs environnementaux et sociaux consolidés
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Printable content block */}
      <div id="rse-impact-printable">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Kg déchets collectés" value={impactData.totals.wasteKg.toFixed(1)} unit="kg" color="#22c55e" icon="♻" />
        <KpiCard label="Arbres plantés" value={String(impactData.totals.trees)} unit="arbres" color="#16a34a" icon="🌳" />
        <KpiCard label="Participants totaux" value={String(impactData.totals.participants)} unit="personnes" color="#0ea5e9" icon="👥" />
        <KpiCard label="Événements réalisés" value={String(impactData.totals.completedEvents)} unit={`/ ${impactData.totals.totalEvents}`} color="#8b5cf6" icon="✓" />
        <KpiCard label="Partenariats actifs" value={String(activePartnerships)} unit="partenaires" color="#f59e0b" icon="🤝" />
        <KpiCard label="Engagements respectés" value={`${fulfillmentRate}%`} unit={`${onTimeCommitments} / ${totalCommitments}`} color="#06b6d4" icon="📋" />
      </div>

      {/* Charts */}
      <RseImpactCharts
        yearlyData={impactData.yearlyData}
        byType={impactData.byType}
        recentEvents={impactData.recentEvents}
      />

      {/* Location table */}
      {impactData.byLocation.length > 0 && (
        <div
          className="rounded-xl border"
          style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
        >
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>
              Répartition par lieu
            </h3>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid var(--admin-border)` }}>
                <th className="text-left px-5 py-2 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Lieu</th>
                <th className="text-right px-5 py-2 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Événements</th>
                <th className="text-right px-5 py-2 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Participants totaux</th>
              </tr>
            </thead>
            <tbody>
              {impactData.byLocation.map((row, i) => (
                <tr key={i} style={{ borderBottom: i < impactData.byLocation.length - 1 ? `1px solid var(--admin-border)` : 'none' }}>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--admin-text)' }}>{row.location}</td>
                  <td className="px-5 py-3 text-sm text-right" style={{ color: 'var(--admin-text-muted)' }}>{row.eventCount}</td>
                  <td className="px-5 py-3 text-sm text-right" style={{ color: 'var(--admin-text-muted)' }}>{row.totalParticipants}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      </div>{/* end #rse-impact-printable */}
    </div>
  )
}

function KpiCard({
  label,
  value,
  unit,
  color,
  icon,
}: {
  label: string
  value: string
  unit: string
  color: string
  icon: string
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{unit}</p>
      <p className="text-xs mt-1 font-medium" style={{ color: 'var(--admin-text)' }}>{label}</p>
    </div>
  )
}
