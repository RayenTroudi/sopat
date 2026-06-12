import { db } from '../../../db/index'
import { projects, purchaseOrders, exchangeRates } from '../../../db/schema'
import { eq, and, isNull, desc, sql, lte } from 'drizzle-orm'
import type { Currency } from '@/lib/currency'

// ─── Country metadata ─────────────────────────────────────────────────────────

export const COUNTRY_INFO: Record<string, { name: string; flag: string; region: 'africa' | 'europe' | 'middle_east'; currency: Currency }> = {
  TN: { name: 'Tunisie',       flag: '🇹🇳', region: 'africa',      currency: 'TND' },
  FR: { name: 'France',        flag: '🇫🇷', region: 'europe',      currency: 'EUR' },
  CI: { name: "Côte d'Ivoire", flag: '🇨🇮', region: 'africa',      currency: 'XOF' },
  MR: { name: 'Mauritanie',    flag: '🇲🇷', region: 'africa',      currency: 'XOF' },
  OM: { name: 'Oman',          flag: '🇴🇲', region: 'middle_east', currency: 'OMR' },
  QA: { name: 'Qatar',         flag: '🇶🇦', region: 'middle_east', currency: 'QAR' },
  LY: { name: 'Libye',         flag: '🇱🇾', region: 'middle_east', currency: 'LYD' },
}

export const REGION_LABELS: Record<string, string> = {
  africa:      'Afrique',
  europe:      'Europe',
  middle_east: 'Moyen-Orient',
}

export const REGION_COLORS: Record<string, string> = {
  africa:      '#16A34A',  // green
  europe:      '#2563EB',  // blue
  middle_east: '#D97706',  // amber
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type CountryProjectSummary = {
  country:         string
  countryName:     string
  flag:            string
  region:          'africa' | 'europe' | 'middle_east'
  projectCount:    number
  activeCount:     number
  budgetTND:       number | null  // total approved budget converted to TND
  actualSpendTND:  number
}

export type InternationalDashboardData = {
  byCountry:   CountryProjectSummary[]
  totalForeign: number  // project count outside TN
}

// ─── Exchange rate helper ─────────────────────────────────────────────────────

async function getLatestRate(fromCurrency: Currency): Promise<number | null> {
  if (fromCurrency === 'TND') return 1
  const today = new Date().toISOString().slice(0, 10)
  const row = await db
    .select({ rate: exchangeRates.rate })
    .from(exchangeRates)
    .where(
      and(
        eq(exchangeRates.fromCurrency, fromCurrency),
        lte(exchangeRates.effectiveDate, today)
      )
    )
    .orderBy(desc(exchangeRates.effectiveDate))
    .limit(1)
  return row[0]?.rate ? parseFloat(row[0].rate) : null
}

// ─── Main query ───────────────────────────────────────────────────────────────

export async function getInternationalDashboardData(): Promise<InternationalDashboardData> {
  const allProjects = await db
    .select({
      id:             projects.id,
      country:        projects.country,
      currency:       projects.currency,
      status:         projects.status,
      approvedBudget: projects.approvedBudget,
    })
    .from(projects)
    .where(isNull(projects.deletedAt))

  // Group by country
  const byCountry: Record<string, {
    country: string
    projectIds: string[]
    activeIds: string[]
    currencies: Record<string, number>  // currency -> total budget
  }> = {}

  for (const p of allProjects) {
    const code = p.country ?? 'TN'
    if (!byCountry[code]) {
      byCountry[code] = { country: code, projectIds: [], activeIds: [], currencies: {} }
    }
    byCountry[code].projectIds.push(p.id)

    const isActive = ['etudes', 'realisation', 'entretien'].includes(p.status)
    if (isActive) byCountry[code].activeIds.push(p.id)

    if (p.approvedBudget) {
      const curr = (p.currency ?? 'TND') as Currency
      byCountry[code].currencies[curr] = (byCountry[code].currencies[curr] ?? 0) + parseFloat(p.approvedBudget)
    }
  }

  // Get spend per project (in project currency — approximate as TND for now)
  const spendRows = await db
    .select({
      projectId: purchaseOrders.projectId,
      total:     sql<string>`sum(total_cost::numeric)::text`,
    })
    .from(purchaseOrders)
    .groupBy(purchaseOrders.projectId)

  const spendByProject: Record<string, number> = {}
  for (const s of spendRows) spendByProject[s.projectId] = parseFloat(s.total ?? '0')

  // Pre-fetch rates for all currencies we need
  const rateCache: Record<string, number | null> = {}
  const uniqueCurrencies = [...new Set(allProjects.map((p) => (p.currency ?? 'TND') as Currency))]
  await Promise.all(
    uniqueCurrencies.map(async (c) => {
      rateCache[c] = await getLatestRate(c)
    })
  )

  // Build result
  const result: CountryProjectSummary[] = Object.values(byCountry).map((c) => {
    const info = COUNTRY_INFO[c.country]

    let budgetTND: number | null = null
    for (const [curr, amount] of Object.entries(c.currencies)) {
      const rate = rateCache[curr]
      if (rate !== null && rate !== undefined) {
        budgetTND = (budgetTND ?? 0) + amount * rate
      }
    }

    const actualSpendTND = c.projectIds.reduce((sum, pid) => sum + (spendByProject[pid] ?? 0), 0)

    return {
      country:      c.country,
      countryName:  info?.name ?? c.country,
      flag:         info?.flag ?? '🌐',
      region:       info?.region ?? 'africa',
      projectCount: c.projectIds.length,
      activeCount:  c.activeIds.length,
      budgetTND:    budgetTND !== null ? Math.round(budgetTND) : null,
      actualSpendTND: Math.round(actualSpendTND),
    }
  })

  const totalForeign = result
    .filter((r) => r.country !== 'TN')
    .reduce((s, r) => s + r.projectCount, 0)

  return { byCountry: result, totalForeign }
}

// ─── International performance report ────────────────────────────────────────

export type InternationalReportRow = {
  country:         string
  countryName:     string
  flag:            string
  region:          string
  projectCount:    number
  completedCount:  number
  completionRate:  number | null  // %
  avgVariancePct:  number | null  // budget variance %
  budgetTND:       number | null
  actualSpendTND:  number
}

export async function getInternationalReport(): Promise<InternationalReportRow[]> {
  const allProjects = await db
    .select({
      id:             projects.id,
      country:        projects.country,
      currency:       projects.currency,
      status:         projects.status,
      approvedBudget: projects.approvedBudget,
    })
    .from(projects)
    .where(isNull(projects.deletedAt))

  const spendRows = await db
    .select({
      projectId: purchaseOrders.projectId,
      total:     sql<string>`sum(total_cost::numeric)::text`,
    })
    .from(purchaseOrders)
    .groupBy(purchaseOrders.projectId)

  const spendByProject: Record<string, number> = {}
  for (const s of spendRows) spendByProject[s.projectId] = parseFloat(s.total ?? '0')

  const rateCache: Record<string, number | null> = {}
  const uniqueCurrencies = [...new Set(allProjects.map((p) => (p.currency ?? 'TND') as Currency))]
  await Promise.all(
    uniqueCurrencies.map(async (c) => {
      rateCache[c] = await getLatestRate(c)
    })
  )

  const grouped: Record<string, typeof allProjects> = {}
  for (const p of allProjects) {
    const code = p.country ?? 'TN'
    if (!grouped[code]) grouped[code] = []
    grouped[code].push(p)
  }

  return Object.entries(grouped).map(([country, ps]) => {
    const info = COUNTRY_INFO[country]
    let budgetTND: number | null = null
    let totalVariance = 0
    let varianceCount = 0

    for (const p of ps) {
      const spend = spendByProject[p.id] ?? 0
      const rate = rateCache[(p.currency ?? 'TND') as Currency]

      if (p.approvedBudget && rate !== null && rate !== undefined) {
        const budgetConverted = parseFloat(p.approvedBudget) * rate
        budgetTND = (budgetTND ?? 0) + budgetConverted

        if (p.status === 'completed' && parseFloat(p.approvedBudget) > 0) {
          const variance = ((spend - parseFloat(p.approvedBudget)) / parseFloat(p.approvedBudget)) * 100
          totalVariance += variance
          varianceCount++
        }
      }
    }

    const completedCount = ps.filter((p) => p.status === 'completed').length
    const actualSpendTND = ps.reduce((sum, p) => sum + (spendByProject[p.id] ?? 0), 0)

    return {
      country,
      countryName:    info?.name ?? country,
      flag:           info?.flag ?? '🌐',
      region:         info?.region ?? 'africa',
      projectCount:   ps.length,
      completedCount,
      completionRate: ps.length > 0 ? Math.round((completedCount / ps.length) * 100) : null,
      avgVariancePct: varianceCount > 0 ? Math.round((totalVariance / varianceCount) * 10) / 10 : null,
      budgetTND:      budgetTND !== null ? Math.round(budgetTND) : null,
      actualSpendTND: Math.round(actualSpendTND),
    }
  })
}
