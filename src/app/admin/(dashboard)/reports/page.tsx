import { getBudgetVarianceReport, getNcMonthlyBreakdown, getProjectTimeline, getMlAccuracyReport } from '@/lib/db/reports'
import { ReportsClient } from './ReportsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Rapports | SOPAT Admin' }

export default async function ReportsPage() {
  const [budgetVariance, ncMonthly, timeline, mlAccuracy] = await Promise.all([
    getBudgetVarianceReport(),
    getNcMonthlyBreakdown(),
    getProjectTimeline(),
    getMlAccuracyReport(),
  ])

  return (
    <ReportsClient
      budgetVariance={budgetVariance}
      ncMonthly={ncMonthly}
      timeline={timeline}
      mlAccuracy={mlAccuracy}
    />
  )
}
