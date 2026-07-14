import { getBudgetVarianceReport, getNcMonthlyBreakdown, getProjectTimeline, getMlAccuracyReport } from '@/lib/db/reports'
import { getInternationalReport } from '@/lib/db/international'
import { getEquipmentReport } from '@/lib/db/equipment'
import { getPlatformOverview, getProjectPhaseReports } from '@/lib/db/reports-overview'
import { ReportsClient } from './ReportsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Rapports | SOPAT Admin' }

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const sp = await searchParams
  const currentYear = new Date().getFullYear()
  const parsed = Number(sp.year)
  const year = Number.isInteger(parsed) && parsed >= 2000 && parsed <= currentYear + 1 ? parsed : currentYear

  const [budgetVariance, ncMonthly, timeline, mlAccuracy, international, equipment, overview, phaseReports] = await Promise.all([
    getBudgetVarianceReport(),
    getNcMonthlyBreakdown(),
    getProjectTimeline(),
    getMlAccuracyReport(),
    getInternationalReport(),
    getEquipmentReport(),
    getPlatformOverview(year),
    getProjectPhaseReports(),
  ])

  return (
    <ReportsClient
      budgetVariance={budgetVariance}
      ncMonthly={ncMonthly}
      timeline={timeline}
      mlAccuracy={mlAccuracy}
      international={international}
      equipment={equipment}
      overview={overview}
      phaseReports={phaseReports}
      year={year}
    />
  )
}
