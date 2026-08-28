/**
 * The canonical project budget-consumption rule.
 *
 * `src/lib/db/project-spend.ts` is the single definition of
 *
 *   spent = Σ purchase_orders.total_cost
 *         + Σ approved extra_expenses.amount
 *         + Σ FOR-AC-10 purchase lines TTC WHERE purchase_order_id IS NULL
 *
 * and this suite proves that every screen agrees with it, term by term, and
 * that no term is counted twice. Before the fix the rule existed in four
 * places: the project page and the alerts summed all three terms, the projects
 * list summed two, and the two dashboard KPIs summed one.
 *
 * The suite creates its own throwaway records under an EXISTING project — no
 * project, client or supplier is created — then removes every one of them and
 * proves the opening counts and the project's own consumption are restored.
 * It allocates no reference number, so it consumes no production sequence.
 */
import { selectTestTarget } from './lib/test-target'

// Must run before the first database operation: `db` is a lazy Proxy that
// resolves DATABASE_URL on first use, not on import.
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
import {
  getProjectSpend,
  getProjectSpendMap,
  spendPercent,
  ZERO_SPEND,
} from '../src/lib/db/project-spend'
import { getProjectAchats } from '../src/lib/db/achat'
import { getAtRiskProjects } from '../src/lib/db/dashboard'
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
    equipmentTypes: await count('equipment_types'),
    equipmentRentals: await count('equipment_rentals'),
    suppliers: await count('suppliers'),
    purchaseOrders: await count('purchase_orders'),
    extraExpenses: await count('extra_expenses'),
    supplyRegisters: await count('supply_registers'),
    supplyPurchases: await count('supply_purchases'),
    nonConformances: await count('non_conformances'),
  }

  // ═══ 1. Pure arithmetic of the percentage helper ═════════════════════════
  console.log('1. spendPercent')
  check('50 sur 200 = 25 %', spendPercent(50, 200) === 25)
  check('arrondi au dixième', spendPercent(1, 3) === 33.3, String(spendPercent(1, 3)))
  check('budget nul → null, jamais Infinity', spendPercent(100, 0) === null)
  check('budget absent → null', spendPercent(100, null) === null)
  check('budget négatif → null', spendPercent(100, -10) === null)
  check('dépense nulle → 0 %', spendPercent(0, 500) === 0)
  check('dépassement → au-dessus de 100 %', spendPercent(600, 500) === 120)

  // ═══ 2. Empty inputs ════════════════════════════════════════════════════
  console.log('\n2. Entrées vides')
  const emptyMap = await getProjectSpendMap([])
  check('aucun projet demandé → map vide', emptyMap.size === 0)
  check('ZERO_SPEND est bien à zéro',
    ZERO_SPEND.spent === 0 && ZERO_SPEND.poTotal === 0 &&
    ZERO_SPEND.expensesTotal === 0 && ZERO_SPEND.supplyTotal === 0)

  // ═══ 3. Term-by-term, against a real project ════════════════════════════
  console.log('\n3. Règle canonique, terme par terme')

  // Le widget « projets à risque » ne considère que les chantiers actifs, donc
  // le projet de test doit en être un pour que la comparaison soit exercée.
  const [project] = await db
    .select({ id: projects.id, reference: projects.reference, approvedBudget: projects.approvedBudget })
    .from(projects)
    .where(and(
      isNull(projects.deletedAt),
      isNotNull(projects.approvedBudget),
      sql`${projects.status} IN ('etudes','realisation','entretien')`,
    ))
    .orderBy(asc(projects.reference))
    .limit(1)
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users).limit(1)

  if (!project || !user) {
    console.log('  (aucun projet ou utilisateur existant — sections 3 à 6 ignorées)')
  } else {
    const actor: AuditActor = {
      userId: user.id, name: user.name, email: user.email, role: user.role,
    }

    const baseline = await getProjectSpend(project.id)
    console.log(`  (référence ${project.reference} : consommation de départ ${baseline.spent})`)

    const createdPoIds: string[] = []
    const createdExpenseIds: string[] = []
    let registerId: string | null = null

    // ── (a) bons de commande seuls ──
    const [po] = await db.insert(purchaseOrders).values({
      projectId: project.id,
      itemDescription: 'TEST-SPEND bon de commande',
      quantityPurchased: '10',
      unitPricePaid: '100.000',
      totalCost: '1000.000',
      purchaseDate: new Date(),
      purchasedBy: user.id,
      createdBy: user.id,
    }).returning({ id: purchaseOrders.id })
    createdPoIds.push(po.id)

    let spend = await getProjectSpend(project.id)
    check('(a) un BC de 1 000 s-ajoute au terme BC',
      near(spend.poTotal, baseline.poTotal + 1000), String(spend.poTotal))
    check('(a) et au total consommé',
      near(spend.spent, baseline.spent + 1000), String(spend.spent))
    check('(a) sans toucher aux autres termes',
      near(spend.expensesTotal, baseline.expensesTotal) &&
      near(spend.supplyTotal, baseline.supplyTotal))

    // ── (b) dépenses extra : approuvée comptée, en attente non ──
    const [approvedEx] = await db.insert(extraExpenses).values({
      reference: `TEST-SPEND-A-${Date.now()}`,
      projectId: project.id,
      expenseDate: new Date().toISOString().slice(0, 10),
      description: 'TEST-SPEND dépense approuvée',
      amount: '250.000',
      status: 'approved',
      createdBy: user.id,
    }).returning({ id: extraExpenses.id })
    createdExpenseIds.push(approvedEx.id)

    const [pendingEx] = await db.insert(extraExpenses).values({
      reference: `TEST-SPEND-P-${Date.now()}`,
      projectId: project.id,
      expenseDate: new Date().toISOString().slice(0, 10),
      description: 'TEST-SPEND dépense en attente',
      amount: '9999.000',
      status: 'pending',
      createdBy: user.id,
    }).returning({ id: extraExpenses.id })
    createdExpenseIds.push(pendingEx.id)

    const [rejectedEx] = await db.insert(extraExpenses).values({
      reference: `TEST-SPEND-R-${Date.now()}`,
      projectId: project.id,
      expenseDate: new Date().toISOString().slice(0, 10),
      description: 'TEST-SPEND dépense rejetée',
      amount: '5555.000',
      status: 'rejected',
      createdBy: user.id,
    }).returning({ id: extraExpenses.id })
    createdExpenseIds.push(rejectedEx.id)

    spend = await getProjectSpend(project.id)
    check('(b) la dépense approuvée compte',
      near(spend.expensesTotal, baseline.expensesTotal + 250), String(spend.expensesTotal))
    check('(b) la dépense en attente ne compte PAS',
      near(spend.spent, baseline.spent + 1000 + 250), String(spend.spent))
    check('(b) mais elle est rapportée à part',
      near(spend.pendingTotal, baseline.pendingTotal + 9999), String(spend.pendingTotal))
    check('(b) la dépense rejetée est ignorée partout',
      !near(spend.spent, baseline.spent + 1000 + 250 + 5555))

    // ── (c) achats FOR-AC-10 non rattachés ──
    registerId = await ensureSupplyRegister(project.id, user.id, actor)
    await replaceSupplyItems(registerId, [{
      designation: 'TEST-SPEND ligne',
      plannedQuantity: 1,
      plannedUnitPriceHtva: 1,
      deliveries: [],
      purchases: [
        // Non rattaché → compté, TTC = 1 000 × 1,19 = 1 190
        { quantity: 10, unitPriceHtva: 100, vatRate: 0.19 },
      ],
    }], user.id, actor)

    spend = await getProjectSpend(project.id)
    check('(c) un achat FOR-AC-10 non rattaché compte en TTC',
      near(spend.supplyTotal, baseline.supplyTotal + 1190), String(spend.supplyTotal))
    check('(c) et entre dans le total consommé',
      near(spend.spent, baseline.spent + 1000 + 250 + 1190), String(spend.spent))

    // ── (d) achat rattaché à un bon de commande ──
    await replaceSupplyItems(registerId, [{
      designation: 'TEST-SPEND ligne',
      plannedQuantity: 1,
      plannedUnitPriceHtva: 1,
      deliveries: [],
      purchases: [
        { quantity: 10, unitPriceHtva: 100, vatRate: 0.19 },
        // Rattaché au BC créé plus haut → exclu, sinon les 1 000 seraient
        // comptés deux fois : une fois par purchase_orders, une fois ici.
        { quantity: 10, unitPriceHtva: 100, vatRate: 0, purchaseOrderId: po.id },
      ],
    }], user.id, actor)

    spend = await getProjectSpend(project.id)
    check('(d) l-achat rattaché à un BC est exclu',
      near(spend.supplyTotal, baseline.supplyTotal + 1190), String(spend.supplyTotal))
    check('(d) le total ne bouge pas malgré la ligne ajoutée',
      near(spend.spent, baseline.spent + 1000 + 250 + 1190), String(spend.spent))

    // ── (f) preuve directe de l-absence de double comptage ──
    const naiveTotal = baseline.spent + 1000 + 250 + 1190 + 1000
    check('(f) pas de double comptage : le BC n-est pas compté deux fois',
      !near(spend.spent, naiveTotal), `${spend.spent} vs ${naiveTotal}`)
    const rawSupply = await db.execute<{ n: string }>(sql`
      SELECT coalesce(sum(
        (sp.quantity::numeric * sp.unit_price_htva::numeric) * (1 + sp.vat_rate::numeric)
      ), 0)::text AS n
      FROM supply_purchases sp
      JOIN supply_items si ON si.id = sp.item_id
      WHERE si.register_id = ${registerId}`)
    check('(f) la somme brute des achats est bien supérieure au montant retenu',
      Number(rawSupply.rows[0].n) > spend.supplyTotal - baseline.supplyTotal,
      `${rawSupply.rows[0].n} > ${spend.supplyTotal - baseline.supplyTotal}`)

    // ── (e) dépense mixte : les trois termes ensemble ──
    check('(e) spent = BC + dépenses approuvées + approvisionnement',
      near(spend.spent, spend.poTotal + spend.expensesTotal + spend.supplyTotal),
      String(spend.spent))

    // ── Toutes les lectures doivent donner le même chiffre ──
    console.log('\n4. Concordance entre les écrans')

    const achats = await getProjectAchats(project.id)
    check('fiche projet : même consommation que la règle',
      near(achats.budget.spent, spend.spent), `${achats.budget.spent} vs ${spend.spent}`)
    check('fiche projet : même terme BC', near(achats.budget.poTotal, spend.poTotal))
    check('fiche projet : même terme dépenses',
      near(achats.budget.expensesTotal, spend.expensesTotal))
    check('fiche projet : même terme approvisionnement',
      near(achats.budget.supplyTotal, spend.supplyTotal))
    check('fiche projet : même montant en attente',
      near(achats.budget.pendingTotal, spend.pendingTotal))

    const mapped = await getProjectSpendMap([project.id])
    check('la version par lot donne le même résultat que la version unitaire',
      near(mapped.get(project.id)!.spent, spend.spent))
    check('et les mêmes termes',
      near(mapped.get(project.id)!.poTotal, spend.poTotal) &&
      near(mapped.get(project.id)!.expensesTotal, spend.expensesTotal) &&
      near(mapped.get(project.id)!.supplyTotal, spend.supplyTotal))

    // Le widget « projets à risque » ne liste un chantier qu-à partir de 90 %
    // (ou d-un délai/NC). Pour que la comparaison tableau de bord ↔ règle soit
    // réellement exercée et non sautée, on pousse volontairement le projet
    // au-dessus du seuil avec une location d-engins, puis on la retire.
    const approved = project.approvedBudget ? parseFloat(project.approvedBudget) : null
    let typeId: string | null = null
    let rentalId: string | null = null

    if (approved && approved > 0) {
      const current = await getProjectSpend(project.id)
      const needed = Math.round((approved * 0.95 - current.spent) * 1000) / 1000
      if (needed > 0) {
        const [t] = await db.insert(equipmentTypes).values({
          name: 'TEST-SPEND type engin',
          displayNameFr: 'TEST-SPEND engin de test',
        }).returning({ id: equipmentTypes.id })
        typeId = t.id
        const [r] = await db.insert(equipmentRentals).values({
          projectId: project.id,
          equipmentTypeId: typeId,
          equipmentDescription: 'TEST-SPEND location',
          startDate: new Date().toISOString().slice(0, 10),
          endDate: new Date().toISOString().slice(0, 10),
          rentalDays: 1,
          dailyRate: String(needed),
          totalCost: String(needed),
          createdBy: user.id,
        }).returning({ id: equipmentRentals.id })
        rentalId = r.id
      }
    }

    const spendAtRisk = await getProjectSpend(project.id)
    const atRisk = await getAtRiskProjects()
    const row = atRisk.find((r) => r.id === project.id)

    check('le projet est bien listé « à risque » une fois au-dessus de 90 %',
      row !== undefined || approved === null,
      `pct=${spendPercent(spendAtRisk.spent, approved)}`)

    if (row) {
      check('tableau de bord « projets à risque » : même consommation',
        near(parseFloat(row.totalSpent ?? '0'), spendAtRisk.spent),
        `${row.totalSpent} vs ${spendAtRisk.spent}`)
      check('tableau de bord : même pourcentage que la règle',
        near(row.spendPct, spendPercent(spendAtRisk.spent, approved)),
        `${row.spendPct} vs ${spendPercent(spendAtRisk.spent, approved)}`)
      check('la location d-engins est bien comptée par le tableau de bord',
        near(parseFloat(row.totalSpent ?? '0'),
          spend.spent + spendAtRisk.equipmentTotal - spend.equipmentTotal),
        String(row.totalSpent))
    } else {
      console.log('  (projet sans budget approuvé — comparaison du widget ignorée)')
      check('le widget « à risque » s-exécute sans erreur', Array.isArray(atRisk))
    }

    // Retrait immédiat : le seuil d-alerte est réévalué par la suite normale.
    if (rentalId) await db.delete(equipmentRentals).where(eq(equipmentRentals.id, rentalId))
    if (typeId) await db.delete(equipmentTypes).where(eq(equipmentTypes.id, typeId))
    await db.update(projects)
      .set({ budgetAlert90NotifiedAt: null, budgetAlertOverNotifiedAt: null })
      .where(eq(projects.id, project.id))

    // ── Cleanup ──
    console.log('\n5. Nettoyage et restauration')
    if (registerId) {
      await db.delete(supplyDeliveries).where(sql`item_id IN (
        SELECT id FROM supply_items WHERE register_id = ${registerId})`)
      await db.delete(supplyPurchases).where(sql`item_id IN (
        SELECT id FROM supply_items WHERE register_id = ${registerId})`)
      await db.delete(supplyItems).where(eq(supplyItems.registerId, registerId))
      await db.delete(supplyRegisters).where(eq(supplyRegisters.id, registerId))
      await db.execute(sql`DELETE FROM record_audit_log
        WHERE entity_type = 'supply_register' AND entity_id = ${registerId}`)
    }
    for (const id of createdExpenseIds) {
      await db.delete(extraExpenses).where(eq(extraExpenses.id, id))
    }
    for (const id of createdPoIds) {
      await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id))
    }
    await db.execute(sql`DELETE FROM equipment_rentals WHERE equipment_description LIKE 'TEST-SPEND%'`)
    await db.execute(sql`DELETE FROM equipment_types WHERE name LIKE 'TEST-SPEND%'`)

    const restored = await getProjectSpend(project.id)
    check('la consommation revient exactement à son point de départ',
      near(restored.spent, baseline.spent), `${restored.spent} vs ${baseline.spent}`)
    check('terme BC restauré', near(restored.poTotal, baseline.poTotal))
    check('terme dépenses restauré', near(restored.expensesTotal, baseline.expensesTotal))
    check('terme approvisionnement restauré', near(restored.supplyTotal, baseline.supplyTotal))
    check('montant en attente restauré', near(restored.pendingTotal, baseline.pendingTotal))

    const noRegister = await db
      .select({ id: supplyRegisters.id })
      .from(supplyRegisters)
      .where(and(eq(supplyRegisters.projectId, project.id), isNull(supplyRegisters.deletedAt)))
    check('aucun registre de test ne subsiste', noRegister.length === 0)
  }

  // ═══ 6. Rien d-existant n-a bougé ════════════════════════════════════════
  console.log('\n6. Données existantes inchangées')
  const after = {
    projects: await count('projects'),
    equipmentTypes: await count('equipment_types'),
    equipmentRentals: await count('equipment_rentals'),
    suppliers: await count('suppliers'),
    purchaseOrders: await count('purchase_orders'),
    extraExpenses: await count('extra_expenses'),
    supplyRegisters: await count('supply_registers'),
    supplyPurchases: await count('supply_purchases'),
    nonConformances: await count('non_conformances'),
  }
  for (const key of Object.keys(before) as (keyof typeof before)[]) {
    check(`${key} : ${before[key]} → ${after[key]}`, before[key] === after[key])
  }

  console.log(`\n${passed} réussis, ${failed} échoués`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
