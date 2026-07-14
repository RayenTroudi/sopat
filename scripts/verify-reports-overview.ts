import { getPlatformOverview, getProjectPhaseReports } from '../src/lib/db/reports-overview'

async function main() {
  const year = new Date().getFullYear()
  const overview = await getPlatformOverview(year)
  console.log('── Vue générale ──')
  console.log(JSON.stringify(overview.projects, null, 2))
  console.log(JSON.stringify(overview.money, null, 2))
  console.log('monthlySpend rows:', overview.monthlySpend.length, '(attendu: 12)')
  console.log('offersByStatus:', JSON.stringify(overview.offersByStatus))

  const reports = await getProjectPhaseReports()
  console.log('\n── Par projet ──', reports.length, 'projets')
  const withSpend = reports.find((r) => r.totalSpend > 0) ?? reports[0]
  console.log(JSON.stringify(withSpend, null, 2))

  // Cohérence : somme des dépenses par phase + hors phase = dépense totale du projet
  for (const r of reports) {
    const sum = r.phases.reduce((s, ph) => s + ph.spend, 0) + r.offPhaseSpend
    if (Math.abs(sum - r.totalSpend) > 0.01) {
      console.error(`✗ ${r.reference}: phases+horsphase=${sum} ≠ total=${r.totalSpend}`)
      process.exit(1)
    }
  }
  console.log('✓ Cohérence dépenses par phase vérifiée sur tous les projets.')
}

main().catch((e) => { console.error(e); process.exit(1) })
