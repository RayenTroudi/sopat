/**
 * Every project budget-consumption consumer agrees with `project-spend.ts` —
 * and the consumers that are deliberately a DIFFERENT metric do not.
 *
 * The second half matters as much as the first. `getTotalSpent`,
 * `getEquipmentTotalCost` and the ML accuracy figures are not the canonical
 * rule, on purpose, and this suite states why so a future reader does not
 * "fix" them by pointing them at project-spend.ts.
 *
 * Classification, as established by the audit:
 *
 *   A  consommation budgétaire  → must equal getProjectSpend().spent
 *      getBudgetVarianceReport · getInternationalDashboardData
 *      getInternationalReport · (already migrated: fiche projet, alertes,
 *      liste projets, tableau de bord, API mobile)
 *
 *   B  volume d'achat / pièces   → left alone
 *      listes de bons de commande, totaux d'entreprise
 *
 *   C  autre métrique            → left alone
 *      coût de location d'engins, dépense attribuée par phase
 *
 *   D  décision métier requise   → left alone, reported
 *      rapprochement budgétaire (inclut les engins, ignore les extra et
 *      FOR-AC-10) · « Réel » des pages ML (cible du modèle ou consommation
 *      officielle ?)
 *
 * The fixture is built under an EXISTING project, then removed, with opening
 * counts and the project's own consumption asserted restored. No reference
 * number is allocated.
 */
import './lib/enable-async-local-storage'
import { selectTestTarget } from './lib/test-target'

const target = selectTestTarget(false)
console.log(`Cible : ${target.label}\n`)

import { db } from '../db/index'
import {
  extraExpenses,
  projects,
  purchaseOrders,
  supplyDeliveries,
  supplyItems,
  supplyPurchases,
  supplyRegisters,
  users,
} from '../db/schema'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { getProjectSpend } from '../src/lib/db/project-spend'
import { getBudgetVarianceReport, getMlAccuracyReport } from '../src/lib/db/reports'
import { getInternationalDashboardData, getInternationalReport } from '../src/lib/db/international'
import { getTotalSpent } from '../src/lib/db/realisation'
import { getEquipmentTotalCost } from '../src/lib/db/equipment'
import { ensureSupplyRegister, replaceSupplyItems } from '../src/lib/db/supply'
import type { AuditActor } from '../src/lib/audit-record'

let passed = 0
let failed = 0

function check(label: string, ok: boolean, detail = '') {
  if (ok) { passed++; console.log(`  ok   ${label}`) }
  else { failed++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`) }
}

function near(a: number | null, b: number | null, eps = 1e-6): boolean {
  if (a === null || b === null) return a === b
  return Math.abs(a - b) < eps
}

async function count(table: string): Promise<number> {
  const r = await db.execute<{ n: string }>(sql.raw(`SELECT count(*)::text AS n FROM ${table}`))
  return Number(r.rows[0].n)
}

async function main() {
  const before = {
    projects: await count('projects'),
    purchaseOrders: await count('purchase_orders'),
    extraExpenses: await count('extra_expenses'),
    supplyRegisters: await count('supply_registers'),
    supplyPurchases: await count('supply_purchases'),
    equipmentRentals: await count('equipment_rentals'),
  }

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users).where(eq(users.role, 'admin')).limit(1)
  const [project] = await db
    .select({
      id: projects.id, reference: projects.reference,
      approvedBudget: projects.approvedBudget, country: projects.country,
    })
    .from(projects).where(isNull(projects.deletedAt)).limit(1)

  if (!user || !project) {
    console.log('  (aucun projet ou administrateur — suite ignorée)')
    console.log(`\n${passed} réussis, ${failed} échoués`)
    process.exit(failed === 0 ? 0 : 1)
  }

  const actor: AuditActor = { userId: user.id, name: user.name, email: user.email, role: user.role }
  const baseline = await getProjectSpend(project.id)
  console.log(`Projet ${project.reference} — consommation de départ ${baseline.spent}\n`)

  const poIds: string[] = []
  const expenseIds: string[] = []
  let registerId: string | null = null

  // Le rapport international agrège par PAYS : sa ligne se compare à la somme
  // des consommations canoniques de tous les projets du pays du projet testé.
  const countryProjectIds = (await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(isNull(projects.deletedAt), eq(projects.country, project.country)))
  ).map((r) => r.id)

  // `international.ts` arrondit ses totaux pays au dinar (Math.round) ; on
  // compare donc à la même précision, sinon l-écart mesuré serait celui de
  // l-arrondi et non celui de la règle.
  const canonicalCountryTotal = async () => {
    let total = 0
    for (const id of countryProjectIds) total += (await getProjectSpend(id)).spent
    return Math.round(total)
  }

  /** Every migrated consumer's figure for the test project. */
  const readAll = async () => {
    const [variance, intlDash, intlReport, canonical, countryTotal] = await Promise.all([
      getBudgetVarianceReport(),
      getInternationalDashboardData(),
      getInternationalReport(),
      getProjectSpend(project.id),
      canonicalCountryTotal(),
    ])
    return {
      canonical: canonical.spent,
      countryTotal,
      variance: variance.find((r) => r.id === project.id)?.actualSpend ?? null,
      variancePct: variance.find((r) => r.id === project.id)?.variancePct ?? null,
      intlDash,
      intlCountry: intlReport.find((r) => r.country === project.country) ?? null,
    }
  }

  // ═══ 1. Baseline agreement, before any fixture ══════════════════════════
  console.log('1. Concordance au point de départ')
  let all = await readAll()
  check('rapport « Dépenses réelles » = règle canonique',
    near(all.variance, all.canonical), `${all.variance} vs ${all.canonical}`)
  check('rapport international (par pays) = somme des règles canoniques',
    near(all.intlCountry?.actualSpendTND ?? null, all.countryTotal),
    `${all.intlCountry?.actualSpendTND} vs ${all.countryTotal}`)

  // ═══ 2. Term by term, through every migrated consumer ═══════════════════
  console.log('\n2. Terme par terme')

  // (a) bon de commande seul
  const [po] = await db.insert(purchaseOrders).values({
    projectId: project.id,
    itemDescription: 'TEST-CONSUMERS bon de commande',
    quantityPurchased: '1', unitPricePaid: '1000.000', totalCost: '1000.000',
    purchaseDate: new Date(), purchasedBy: user.id, createdBy: user.id,
  }).returning({ id: purchaseOrders.id })
  poIds.push(po.id)

  all = await readAll()
  check('(a) BC 1 000 : canonique', near(all.canonical, baseline.spent + 1000), String(all.canonical))
  check('(a) rapport variance suit', near(all.variance, all.canonical), String(all.variance))
  check('(a) rapport international suit',
    near(all.intlCountry?.actualSpendTND ?? null, all.countryTotal),
    String(all.intlCountry?.actualSpendTND))

  // (b) dépenses : approuvée comptée, en attente et rejetée exclues
  const stamp = Date.now()
  for (const [suffix, amount, status] of [
    ['A', '200.000', 'approved'],
    ['P', '500.000', 'pending'],
    ['R', '300.000', 'rejected'],
  ] as const) {
    const [row] = await db.insert(extraExpenses).values({
      reference: `TEST-CONSUMERS-${suffix}-${stamp}`,
      projectId: project.id,
      expenseDate: new Date().toISOString().slice(0, 10),
      description: `TEST-CONSUMERS ${status}`,
      amount, status, createdBy: user.id,
    }).returning({ id: extraExpenses.id })
    expenseIds.push(row.id)
  }

  all = await readAll()
  check('(b) dépense approuvée comptée, en attente et rejetée exclues',
    near(all.canonical, baseline.spent + 1200), String(all.canonical))
  check('(b) rapport variance suit', near(all.variance, all.canonical), String(all.variance))
  check('(b) rapport international suit',
    near(all.intlCountry?.actualSpendTND ?? null, all.countryTotal),
    String(all.intlCountry?.actualSpendTND))

  // (c) FOR-AC-10 : non rattaché compté, rattaché exclu
  registerId = await ensureSupplyRegister(project.id, user.id, actor)
  await replaceSupplyItems(registerId, [{
    designation: 'TEST-CONSUMERS ligne',
    plannedQuantity: 1, plannedUnitPriceHtva: 1,
    deliveries: [],
    purchases: [
      { quantity: 1, unitPriceHtva: 150, vatRate: 0 },
      { quantity: 1, unitPriceHtva: 250, vatRate: 0, purchaseOrderId: po.id },
    ],
  }], user.id, actor)

  all = await readAll()
  check('(c) achat FOR-AC-10 non rattaché compté, rattaché exclu → 1 350',
    near(all.canonical, baseline.spent + 1350), String(all.canonical))
  check('(c) rapport variance suit', near(all.variance, all.canonical), String(all.variance))
  check('(c) rapport international suit',
    near(all.intlCountry?.actualSpendTND ?? null, all.countryTotal),
    String(all.intlCountry?.actualSpendTND))
  check('(c) aucun consommateur n-affiche 1 200 (FOR-AC-10 ignoré)',
    !near(all.variance, baseline.spent + 1200))
  check('(c) aucun consommateur n-affiche 1 600 (rattaché compté deux fois)',
    !near(all.variance, baseline.spent + 1600))

  // (d) registre supprimé → sa contribution disparaît partout
  await db.update(supplyRegisters).set({ deletedAt: new Date() })
    .where(eq(supplyRegisters.id, registerId))
  all = await readAll()
  check('(d) registre supprimé : canonique retombe à 1 200',
    near(all.canonical, baseline.spent + 1200), String(all.canonical))
  check('(d) rapport variance suit', near(all.variance, all.canonical), String(all.variance))
  check('(d) rapport international suit',
    near(all.intlCountry?.actualSpendTND ?? null, all.countryTotal),
    String(all.intlCountry?.actualSpendTND))
  await db.update(supplyRegisters).set({ deletedAt: null })
    .where(eq(supplyRegisters.id, registerId))

  // (e) variance % cohérente avec le budget approuvé
  all = await readAll()
  const approvedBudget = project.approvedBudget ? parseFloat(project.approvedBudget) : null
  if (approvedBudget && approvedBudget > 0) {
    const expectedPct = Math.round(((all.canonical - approvedBudget) / approvedBudget) * 1000) / 10
    check('(e) variance % du rapport = (réel − budget) / budget',
      near(all.variancePct, expectedPct), `${all.variancePct} vs ${expectedPct}`)
  } else {
    check('(e) sans budget approuvé, la variance est nulle', all.variancePct === null)
  }

  // (f) le tableau de bord international agrège les mêmes chiffres
  const country = all.intlDash.byCountry.find((c) => c.country === project.country)
  if (country) {
    check('(f) tableau de bord international : total pays = somme canonique',
      near(country.actualSpendTND, all.countryTotal),
      `${country.actualSpendTND} vs ${all.countryTotal}`)
  } else {
    check('(f) le tableau de bord international répond',
      Array.isArray(all.intlDash.byCountry))
  }

  // ═══ 3. Consumers that are deliberately a DIFFERENT metric ══════════════
  //
  // These MUST NOT equal the canonical rule. Asserting the difference is the
  // point: it records the classification so nobody "corrects" them later.
  console.log('\n3. Métriques volontairement différentes')

  const canonicalNow = (await getProjectSpend(project.id)).spent

  // getTotalSpent : bons de commande SEULS, additionnés aux engins par le
  // rapprochement budgétaire. Ni les dépenses extra ni FOR-AC-10.
  const totalSpentOnly = parseFloat(await getTotalSpent(project.id))
  check('getTotalSpent ne compte que les bons de commande',
    near(totalSpentOnly, baseline.poTotal + 1000), String(totalSpentOnly))
  check('getTotalSpent DIFFÈRE de la règle canonique (décision métier en attente)',
    !near(totalSpentOnly, canonicalNow), `${totalSpentOnly} vs ${canonicalNow}`)
  check('la différence vaut exactement les dépenses approuvées + FOR-AC-10',
    near(canonicalNow - totalSpentOnly,
      (baseline.expensesTotal + 200) + (baseline.supplyTotal + 150)),
    String(canonicalNow - totalSpentOnly))

  // getEquipmentTotalCost : locations d'engins, absentes de la règle canonique.
  const equipment = await getEquipmentTotalCost(project.id)
  check('getEquipmentTotalCost est un montant de location, pas une consommation',
    typeof equipment === 'number' && Number.isFinite(equipment), String(equipment))
  check('les engins n-entrent PAS dans la règle canonique',
    near(canonicalNow, baseline.spent + 1350), String(canonicalNow))

  // Rapport de précision ML : « Réel » y sert à mesurer le modèle. Il reste
  // sur les bons de commande seuls tant que la décision n-est pas prise.
  const ml = await getMlAccuracyReport()
  const mlRow = ml.rows.find((r) => r.projectId === project.id)
  if (mlRow) {
    check('rapport ML : « Réel » reste les bons de commande seuls',
      near(mlRow.actualSpend, totalSpentOnly), `${mlRow.actualSpend} vs ${totalSpentOnly}`)
  } else {
    check('le rapport ML répond sans erreur', Array.isArray(ml.rows))
  }

  // ═══ 4. Cleanup and restoration ════════════════════════════════════════
  console.log('\n4. Nettoyage et restauration')
  await db.delete(supplyDeliveries).where(sql`item_id IN (
    SELECT id FROM supply_items WHERE register_id = ${registerId})`)
  await db.delete(supplyPurchases).where(sql`item_id IN (
    SELECT id FROM supply_items WHERE register_id = ${registerId})`)
  await db.delete(supplyItems).where(eq(supplyItems.registerId, registerId))
  await db.delete(supplyRegisters).where(eq(supplyRegisters.id, registerId))
  await db.execute(sql`DELETE FROM record_audit_log
    WHERE entity_type = 'supply_register' AND entity_id = ${registerId}`)
  for (const id of expenseIds) await db.delete(extraExpenses).where(eq(extraExpenses.id, id))
  for (const id of poIds) await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id))
  await db.execute(sql`DELETE FROM extra_expenses WHERE description LIKE 'TEST-CONSUMERS%'`)
  await db.execute(sql`DELETE FROM purchase_orders WHERE item_description LIKE 'TEST-CONSUMERS%'`)

  const restored = await readAll()
  check('la règle canonique revient à son point de départ',
    near(restored.canonical, baseline.spent), `${restored.canonical} vs ${baseline.spent}`)
  check('le rapport de variance aussi', near(restored.variance, baseline.spent))
  check('le rapport international aussi',
    near(restored.intlCountry?.actualSpendTND ?? null, restored.countryTotal))

  const noRegister = await db
    .select({ id: supplyRegisters.id })
    .from(supplyRegisters)
    .where(and(eq(supplyRegisters.projectId, project.id), isNull(supplyRegisters.deletedAt)))
  check('aucun registre de test ne subsiste', noRegister.length === 0)

  // ═══ 5. Nothing pre-existing moved ═════════════════════════════════════
  console.log('\n5. Données existantes inchangées')
  const after = {
    projects: await count('projects'),
    purchaseOrders: await count('purchase_orders'),
    extraExpenses: await count('extra_expenses'),
    supplyRegisters: await count('supply_registers'),
    supplyPurchases: await count('supply_purchases'),
    equipmentRentals: await count('equipment_rentals'),
  }
  for (const key of Object.keys(before) as (keyof typeof before)[]) {
    check(`${key} : ${before[key]} → ${after[key]}`, before[key] === after[key])
  }

  console.log(`\n${passed} réussis, ${failed} échoués`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
