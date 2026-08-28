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
 *      getInternationalReport · « Réel » des pages ML · dénominateur du
 *      ratio d'engins · (fiche projet, alertes, liste projets, tableau de
 *      bord, API mobile)
 *
 *   B  volume d'achat / pièces   → left alone
 *      listes de bons de commande, totaux d'entreprise
 *
 *   C  autre métrique            → left alone
 *      montant de location d'engins seul (un terme, pas le total),
 *      dépense attribuée par phase, entrée d'entraînement du modèle
 *
 *   D  décision métier            → tranchée, voir plus bas
 *      les engins FONT partie de la règle ; « Réel » des pages ML suit la
 *      règle. Le rapprochement budgétaire (BC + engins) reste volontairement
 *      un sous-ensemble et n'est pas la consommation.
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
  equipmentRentals,
  equipmentTypes,
  extraExpenses,
  projects,
  purchaseOrders,
  supplyDeliveries,
  supplyItems,
  supplyPurchases,
  supplyRegisters,
  users,
} from '../db/schema'
import { and, eq, isNull, sql, asc, isNotNull } from 'drizzle-orm'
import { getProjectSpend, spendPercent } from '../src/lib/db/project-spend'
import { getBudgetVarianceReport, getMlAccuracyReport } from '../src/lib/db/reports'
import { getInternationalDashboardData, getInternationalReport } from '../src/lib/db/international'
import { getTotalSpent } from '../src/lib/db/realisation'
import { getEquipmentTotalCost } from '../src/lib/db/equipment'
import { ensureSupplyRegister, replaceSupplyItems } from '../src/lib/db/supply'
import { checkBudgetThresholdAndNotify } from '../src/lib/notifications'
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
    equipmentTypes: await count('equipment_types'),
    notifications: await count('notifications'),
    purchaseOrders: await count('purchase_orders'),
    extraExpenses: await count('extra_expenses'),
    supplyRegisters: await count('supply_registers'),
    supplyPurchases: await count('supply_purchases'),
    equipmentRentals: await count('equipment_rentals'),
  }

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users).where(eq(users.role, 'admin')).limit(1)
  // Sélection DÉTERMINISTE : sans ORDER BY, Postgres peut renvoyer un projet
  // différent d-une exécution à l-autre, et plusieurs sections se branchent sur
  // ses propriétés (pays, budget, prédiction ML). Le nombre d-assertions variait
  // alors entre deux exécutions identiques.
  const [project] = await db
    .select({
      id: projects.id, reference: projects.reference,
      approvedBudget: projects.approvedBudget, country: projects.country,
    })
    .from(projects)
    .where(and(isNull(projects.deletedAt), isNotNull(projects.approvedBudget)))
    .orderBy(asc(projects.reference))
    .limit(1)

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
  console.log('\n3. Termes de la règle et métriques volontairement différentes')

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

  // getEquipmentTotalCost reste UN TERME de la règle, pas le total : il ne doit
  // donc pas égaler la consommation, mais il doit s-y retrouver exactement.
  const equipment = await getEquipmentTotalCost(project.id)
  const spendNow = await getProjectSpend(project.id)
  check('getEquipmentTotalCost = le terme « engins » de la règle',
    near(equipment, spendNow.equipmentTotal), `${equipment} vs ${spendNow.equipmentTotal}`)
  check('c-est un terme, pas le total',
    spendNow.spent >= equipment, `${spendNow.spent} >= ${equipment}`)

  // Le rapprochement budgétaire additionne BC + engins : toujours un
  // sous-ensemble de la règle, par décision métier. Il ne doit pas être
  // « corrigé » en le branchant sur project-spend.ts.
  check('rapprochement (BC + engins) reste un sous-ensemble de la règle',
    near(totalSpentOnly + equipment,
      spendNow.poTotal + spendNow.equipmentTotal),
    `${totalSpentOnly + equipment}`)

  // Rapport de précision ML : « Réel » suit désormais la règle canonique, pour
  // qu-un montant ainsi étiqueté veuille dire la même chose partout.
  const ml = await getMlAccuracyReport()
  const mlRow = ml.rows.find((r) => r.projectId === project.id)
  if (mlRow) {
    const mlCanonical = (await getProjectSpend(project.id)).spent
    check('rapport ML : « Réel » = règle canonique',
      near(mlRow.actualSpend, mlCanonical), `${mlRow.actualSpend} vs ${mlCanonical}`)
    check('rapport ML : ce ne sont plus les bons de commande seuls',
      !near(mlRow.actualSpend, totalSpentOnly) || near(mlCanonical, totalSpentOnly),
      `${mlRow.actualSpend} vs ${totalSpentOnly}`)
  } else {
    console.log('  (ce projet n-a pas de prédiction acceptée — rapport ML ignoré)')
    check('le rapport ML répond sans erreur', Array.isArray(ml.rows))
  }

  // ═══ 3b. Equipment rentals — the fourth term, and the 90 % alert ════════
  //
  // Adding a term raises consumption, so it can push a chantier across the
  // alert threshold. The alert mechanism is deliberately NOT bypassed here:
  // the test drives it and checks it fires on the new figure. The budget path
  // writes in-app notification rows only — it sends no email — so this is safe
  // to exercise, and every row is removed afterwards.
  console.log('\n3b. Engins : quatrième terme et seuil d-alerte 90 %')

  const budget = project.approvedBudget ? parseFloat(project.approvedBudget) : null
  const spendBeforeEquipment = await getProjectSpend(project.id)
  const pctBefore = spendPercent(spendBeforeEquipment.spent, budget)

  // État d-alerte d-origine, restauré à la fin quoi qu-il arrive.
  const [flagsBefore] = await db
    .select({
      a90: projects.budgetAlert90NotifiedAt,
      aOver: projects.budgetAlertOverNotifiedAt,
    })
    .from(projects).where(eq(projects.id, project.id)).limit(1)
  const notifBefore = await count('notifications')

  let typeId: string | null = null
  let rentalId: string | null = null

  if (budget && budget > 0 && pctBefore !== null && pctBefore < 90) {
    // Location juste assez grosse pour franchir 90 % sans atteindre 100 %.
    const target = budget * 0.925
    const rentalCost = Math.round((target - spendBeforeEquipment.spent) * 1000) / 1000

    const [t] = await db.insert(equipmentTypes).values({
      name: 'TEST-CONSUMERS type engin',
      displayNameFr: 'TEST-CONSUMERS engin de test',
    }).returning({ id: equipmentTypes.id })
    typeId = t.id

    const [r] = await db.insert(equipmentRentals).values({
      projectId: project.id,
      equipmentTypeId: typeId,
      equipmentDescription: 'TEST-CONSUMERS location',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      rentalDays: 1,
      dailyRate: String(rentalCost),
      totalCost: String(rentalCost),
      createdBy: user.id,
    }).returning({ id: equipmentRentals.id })
    rentalId = r.id

    const withEquipment = await getProjectSpend(project.id)
    const pctAfter = spendPercent(withEquipment.spent, budget)

    check('la location entre dans le terme « engins »',
      near(withEquipment.equipmentTotal, spendBeforeEquipment.equipmentTotal + rentalCost),
      String(withEquipment.equipmentTotal))
    check('et donc dans la consommation totale',
      near(withEquipment.spent, spendBeforeEquipment.spent + rentalCost),
      String(withEquipment.spent))
    check('spent = BC + dépenses + approvisionnement + engins',
      near(withEquipment.spent, withEquipment.poTotal + withEquipment.expensesTotal
        + withEquipment.supplyTotal + withEquipment.equipmentTotal))
    check(`le projet franchit 90 % (${pctBefore} % → ${pctAfter} %)`,
      pctAfter !== null && pctBefore < 90 && pctAfter >= 90 && pctAfter < 100,
      `${pctBefore} → ${pctAfter}`)

    // Le mécanisme d-alerte doit se déclencher sur le nouveau chiffre.
    await checkBudgetThresholdAndNotify(project.id, user.id)

    const [flagsAfter] = await db
      .select({
        a90: projects.budgetAlert90NotifiedAt,
        aOver: projects.budgetAlertOverNotifiedAt,
      })
      .from(projects).where(eq(projects.id, project.id)).limit(1)
    const notifAfter = await count('notifications')

    check('l-alerte 90 % est armée par le franchissement',
      flagsAfter.a90 !== null, String(flagsAfter.a90))
    check('l-alerte de dépassement N-EST PAS armée (on reste sous 100 %)',
      flagsAfter.aOver === null, String(flagsAfter.aOver))
    check('au moins une notification a été créée',
      notifAfter > notifBefore, `${notifBefore} → ${notifAfter}`)

    // Retrait de la location : la consommation redescend et l-alerte se réarme.
    await db.delete(equipmentRentals).where(eq(equipmentRentals.id, rentalId))
    rentalId = null

    const removed = await getProjectSpend(project.id)
    check('retirer la location fait redescendre la consommation',
      near(removed.spent, spendBeforeEquipment.spent), String(removed.spent))

    await checkBudgetThresholdAndNotify(project.id, user.id)
    const [flagsReset] = await db
      .select({ a90: projects.budgetAlert90NotifiedAt })
      .from(projects).where(eq(projects.id, project.id)).limit(1)
    check('repasser sous 90 % réarme l-alerte',
      flagsReset.a90 === null, String(flagsReset.a90))

    // Nettoyage des notifications et restauration exacte des drapeaux.
    await db.execute(sql`DELETE FROM notifications
      WHERE type = 'budget_alert' AND project_id = ${project.id}`)
    await db.update(projects)
      .set({
        budgetAlert90NotifiedAt: flagsBefore.a90,
        budgetAlertOverNotifiedAt: flagsBefore.aOver,
      })
      .where(eq(projects.id, project.id))

    if (typeId) {
      await db.delete(equipmentTypes).where(eq(equipmentTypes.id, typeId))
      typeId = null
    }

    check('notifications revenues au niveau initial',
      (await count('notifications')) === notifBefore)
  } else {
    console.log(`  (projet à ${pctBefore} % ou sans budget — scénario de franchissement ignoré)`)
    check('la règle expose bien un terme « engins »',
      typeof spendBeforeEquipment.equipmentTotal === 'number')
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
  await db.execute(sql`DELETE FROM equipment_rentals WHERE equipment_description LIKE 'TEST-CONSUMERS%'`)
  await db.execute(sql`DELETE FROM equipment_types WHERE name LIKE 'TEST-CONSUMERS%'`)
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
    equipmentTypes: await count('equipment_types'),
    notifications: await count('notifications'),
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
