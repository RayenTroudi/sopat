import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRseImpactData } from '@/lib/db/rse-events'
import { db } from '../../../../../../db/index'
import { rsePartnerships, rsePartnershipCommitments } from '../../../../../../db/schema'
import { eq, count, sql } from 'drizzle-orm'
import { RseImpactCharts } from '@/components/rse/RseImpactCharts'
import { PrintButton } from '@/components/rse/PrintButton'
import { Recycle, Trees, Users, CalendarCheck, Handshake, ClipboardList, type LucideIcon } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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
        <KpiCard label="Kg déchets collectés" value={impactData.totals.wasteKg.toFixed(1)} unit="kg" color="var(--admin-emerald)" dimColor="var(--admin-emerald-dim)" icon={Recycle} />
        <KpiCard label="Arbres plantés" value={String(impactData.totals.trees)} unit="arbres" color="var(--green)" dimColor="var(--admin-green-dim)" icon={Trees} />
        <KpiCard label="Participants totaux" value={String(impactData.totals.participants)} unit="personnes" color="var(--admin-blue)" dimColor="var(--admin-blue-dim)" icon={Users} />
        <KpiCard label="Événements réalisés" value={String(impactData.totals.completedEvents)} unit={`/ ${impactData.totals.totalEvents}`} color="var(--admin-accent)" dimColor="var(--admin-accent-dim)" icon={CalendarCheck} />
        <KpiCard label="Partenariats actifs" value={String(activePartnerships)} unit="partenaires" color="var(--admin-amber)" dimColor="var(--admin-amber-dim)" icon={Handshake} />
        <KpiCard label="Engagements respectés" value={`${fulfillmentRate}%`} unit={`${onTimeCommitments} / ${totalCommitments}`} color="var(--admin-emerald)" dimColor="var(--admin-emerald-dim)" icon={ClipboardList} />
      </div>

      {/* Charts */}
      <RseImpactCharts
        yearlyData={impactData.yearlyData}
        byType={impactData.byType}
        recentEvents={impactData.recentEvents}
      />

      {/* Location table */}
      {impactData.byLocation.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="py-3 px-5">
            <CardTitle className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
              Répartition par lieu
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lieu</TableHead>
                <TableHead className="text-right">Événements</TableHead>
                <TableHead className="text-right">Participants totaux</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {impactData.byLocation.map((row, i) => (
                <TableRow key={i} className="even:bg-[var(--admin-bg)]/40">
                  <TableCell className="font-medium">{row.location}</TableCell>
                  <TableCell className="text-right" style={{ color: 'var(--admin-text-muted)' }}>{row.eventCount}</TableCell>
                  <TableCell className="text-right" style={{ color: 'var(--admin-text-muted)' }}>{row.totalParticipants}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
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
  dimColor,
  icon: Icon,
}: {
  label: string
  value: string
  unit: string
  color: string
  dimColor: string
  icon: LucideIcon
}) {
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-2"
      style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: dimColor }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-2xl font-bold tracking-tight" style={{ color }}>{value}</p>
      <div>
        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{unit}</p>
        <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--admin-text)' }}>{label}</p>
      </div>
    </div>
  )
}
