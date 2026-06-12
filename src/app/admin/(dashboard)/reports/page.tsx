import { getBudgetVarianceReport, getNcMonthlyBreakdown, getProjectTimeline, getMlAccuracyReport } from '@/lib/db/reports'
import { getInternationalReport } from '@/lib/db/international'
import { getEquipmentReport } from '@/lib/db/equipment'
import { ReportsClient } from './ReportsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Rapports | SOPAT Admin' }

export default async function ReportsPage() {
  const [budgetVariance, ncMonthly, timeline, mlAccuracy, international, equipment] = await Promise.all([
    getBudgetVarianceReport(),
    getNcMonthlyBreakdown(),
    getProjectTimeline(),
    getMlAccuracyReport(),
    getInternationalReport(),
    getEquipmentReport(),
  ])

  return (
    <ReportsClient
      budgetVariance={budgetVariance}
      ncMonthly={ncMonthly}
      timeline={timeline}
      mlAccuracy={mlAccuracy}
      international={international}
      equipment={equipment}
    />
  )
}
