/**
 * The ML calibration target is the canonical project consumption.
 *
 * `getSimilarCompletedProjects` feeds `/api/ml/predict`: for each comparable
 * finished chantier it computes `ratio = actualCost / computeBottomUp(project)`,
 * and the median of those ratios becomes the correction factor applied to every
 * new estimate.
 *
 * That denominator — `computeBottomUp` — estimates plants + terre + main
 * d'œuvre + ENGINS + logistique. While `actualCost` summed only the bons de
 * commande and the approved extra expenses, the ratio compared an estimate that
 * priced machinery against an actual that did not, biasing the factor downward
 * and under-predicting precisely the most mechanised chantiers. `actualCost` is
 * now `getProjectSpend().spent`.
 *
 * Why this suite builds a synthetic project
 * ----------------------------------------
 * The real corpus cannot demonstrate the change: of three completed projects
 * only one carries a plant list (the eligibility rule), and approved expenses,
 * equipment rentals and FOR-AC-10 purchases are all zero across every one of
 * them. A test against production data would pass without exercising a single
 * new term. So the fixture is built here, sized against the engine's own
 * estimate so both the old and the new ratio land inside the [0.7, 1.4] clamp
 * and are distinguishable, then removed in full.
 *
 * NOT under test, and deliberately unchanged: the factor formula, its clamp,
 * the spread, the sample-size logic and the project-selection criteria.
 */
import { selectTestTarget } from './lib/test-target'

const target = selectTestTarget(false)
console.log(`Cible : ${target.label}\n`)

import { db } from '../db/index'
import {
  budgetPredictions,
  equipmentRentals,
  equipmentTypes,
  extraExpenses,
  plantListItems,
  projects,
  purchaseOrders,
  supplyDeliveries,
  supplyItems,
  supplyPurchases,
  supplyRegisters,
  users,
} from '../db/schema'
import { asc, eq, sql } from 'drizzle-orm'
import { getSimilarCompletedProjects } from '../src/lib/db/budget-calibration'
import { getProjectSpend } from '../src/lib/db/project-spend'
import { computeBottomUp, computeCalibration, DEFAULT_ENGINE_CONFIG } from '../src/lib/budget-engine'
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

/** Stable fingerprint of every stored prediction, to prove none was touched. */
async function predictionFingerprint(): Promise<string> {
  const rows = await db
    .select({
      id: budgetPredictions.id,
      total: budgetPredictions.predictedTotal,
      status: budgetPredictions.status,
    })
    .from(budgetPredictions)
    .orderBy(asc(budgetPredictions.id))
  return rows.map((r) => `${r.id}:${r.total}:${r.status}`).join('|')
}

const SITE_AREA = 1000
const PROJECT_TYPE = 'hotelier_touristique' as const

async function main() {
  const before = {
    projects: await count('projects'),
    plantListItems: await count('plant_list_items'),
    purchaseOrders: await count('purchase_orders'),
    extraExpenses: await count('extra_expenses'),
    equipmentTypes: await count('equipment_types'),
    equipmentRentals: await count('equipment_rentals'),
    supplyRegisters: await count('supply_registers'),
    supplyPurchases: await count('supply_purchases'),
    budgetPredictions: await count('budget_predictions'),
  }
  const fingerprintBefore = await predictionFingerprint()

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users).where(eq(users.role, 'admin')).limit(1)
  if (!user) {
    console.log('  (aucun administrateur — suite ignorée)')
    console.log(`\n${passed} réussis, ${failed} échoués`)
    process.exit(0)
  }
  const actor: AuditActor = { userId: user.id, name: user.name, email: user.email, role: user.role }

  const stamp = Date.now()
  let projectId: string | null = null
  let typeId: string | null = null
  let registerId: string | null = null

  try {
    // ═══ 1. Synthetic completed chantier ══════════════════════════════════
    console.log('1. Chantier terminé synthétique')

    const [proj] = await db.insert(projects).values({
      // Référence littérale : aucun générateur de séquence n-est sollicité,
      // donc aucun numéro de production n-est consommé.
      reference: `TEST-CALIB-${stamp}`,
      name: 'TEST-CALIB chantier de calibration',
      clientName: 'TEST-CALIB client',
      siteAddress: 'TEST-CALIB adresse',
      siteAreaM2: String(SITE_AREA),
      projectType: PROJECT_TYPE,
      status: 'completed',
      createdBy: user.id,
    }).returning({ id: projects.id })
    projectId = proj.id
    check('projet terminé créé', typeof projectId === 'string')

    // Liste de plantes : condition d-éligibilité, et base de l-estimation.
    const plants = [
      { botanicalName: 'TEST-CALIB Olea europaea', category: 'tree' as const, quantity: '20', unit: 'unit' as const, unitPriceEstimate: '450.000' },
      { botanicalName: 'TEST-CALIB Washingtonia', category: 'palm' as const, quantity: '10', unit: 'unit' as const, unitPriceEstimate: '900.000' },
      { botanicalName: 'TEST-CALIB Paspalum',     category: 'grass' as const, quantity: '600', unit: 'm2' as const, unitPriceEstimate: '18.000' },
    ]
    await db.insert(plantListItems).values(
      plants.map((p) => ({ ...p, projectId: projectId!, createdBy: user.id }))
    )
    check('liste de plantes créée (règle d-éligibilité inchangée)',
      (await count('plant_list_items')) === before.plantListItems + 3)

    // ═══ 2. Estimation bottom-up, qui sert de dénominateur ════════════════
    console.log('\n2. Estimation bottom-up (dénominateur du ratio)')

    const enginePlants = plants.map((p) => ({
      name: p.botanicalName,
      category: p.category,
      quantity: parseFloat(p.quantity),
      unit: p.unit,
      unitPrice: parseFloat(p.unitPriceEstimate),
    }))
    const est = computeBottomUp(
      { projectType: 'commercial', siteAreaM2: SITE_AREA, region: 'tunis', season: 'spring', plantList: enginePlants },
      DEFAULT_ENGINE_CONFIG,
    )
    check('estimation strictement positive', est.total > 0, String(est.total))
    check('l-estimation comporte bien un poste « engins »',
      est.breakdown.equipment > 0, String(est.breakdown.equipment))
    console.log(`  (estimé ${est.total} dont engins ${est.breakdown.equipment})`)

    // ═══ 3. Dépenses réelles, dimensionnées sur l-estimation ══════════════
    //
    // Ancienne cible (BC + dépenses approuvées) = 0,75 × estimé
    // Nouvelle cible (règle canonique)          = 1,20 × estimé
    // Les deux ratios tombent dans le clamp [0,7 ; 1,4] et sont distincts,
    // donc le facteur produit est réellement différent.
    console.log('\n3. Dépenses réelles du chantier')

    const poAmount     = Math.round(est.total * 0.55 * 1000) / 1000
    const exApproved   = Math.round(est.total * 0.20 * 1000) / 1000
    const equipAmount  = Math.round(est.total * 0.15 * 1000) / 1000
    const supplyAmount = Math.round(est.total * 0.30 * 1000) / 1000

    await db.insert(purchaseOrders).values({
      projectId, itemDescription: 'TEST-CALIB bon de commande',
      quantityPurchased: '1', unitPricePaid: String(poAmount), totalCost: String(poAmount),
      purchaseDate: new Date(), purchasedBy: user.id, createdBy: user.id,
    })

    await db.insert(extraExpenses).values([
      { reference: `TEST-CALIB-A-${stamp}`, projectId,
        expenseDate: new Date().toISOString().slice(0, 10),
        description: 'TEST-CALIB dépense approuvée', amount: String(exApproved),
        status: 'approved', createdBy: user.id },
      // Doit rester hors du total : la direction peut encore la rejeter.
      { reference: `TEST-CALIB-P-${stamp}`, projectId,
        expenseDate: new Date().toISOString().slice(0, 10),
        description: 'TEST-CALIB dépense en attente', amount: '99999.000',
        status: 'pending', createdBy: user.id },
    ])

    const [t] = await db.insert(equipmentTypes).values({
      name: `TEST-CALIB type ${stamp}`, displayNameFr: 'TEST-CALIB engin',
    }).returning({ id: equipmentTypes.id })
    typeId = t.id
    await db.insert(equipmentRentals).values({
      projectId, equipmentTypeId: typeId,
      equipmentDescription: 'TEST-CALIB location',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      rentalDays: 1, dailyRate: String(equipAmount), totalCost: String(equipAmount),
      createdBy: user.id,
    })

    // Registre FOR-AC-10 : un achat autonome (compté) et un achat déjà porté
    // par le bon de commande (exclu, sinon double comptage).
    const [linkedPo] = await db.insert(purchaseOrders).values({
      projectId, itemDescription: 'TEST-CALIB BC de rattachement',
      quantityPurchased: '1', unitPricePaid: '1000.000', totalCost: '1000.000',
      purchaseDate: new Date(), purchasedBy: user.id, createdBy: user.id,
    }).returning({ id: purchaseOrders.id })

    registerId = await ensureSupplyRegister(projectId, user.id, actor)
    await replaceSupplyItems(registerId, [{
      designation: 'TEST-CALIB ligne',
      plannedQuantity: 1, plannedUnitPriceHtva: 1,
      deliveries: [],
      purchases: [
        { quantity: 1, unitPriceHtva: supplyAmount, vatRate: 0 },
        { quantity: 1, unitPriceHtva: 5000, vatRate: 0, purchaseOrderId: linkedPo.id },
      ],
    }], user.id, actor)

    const spend = await getProjectSpend(projectId)
    const expectedCanonical = poAmount + 1000 + exApproved + equipAmount + supplyAmount
    check('consommation canonique = BC + dépenses + engins + FOR-AC-10',
      near(spend.spent, expectedCanonical), `${spend.spent} vs ${expectedCanonical}`)
    check('les quatre termes sont non nuls',
      spend.poTotal > 0 && spend.expensesTotal > 0 &&
      spend.equipmentTotal > 0 && spend.supplyTotal > 0,
      JSON.stringify(spend))
    check('la dépense en attente est exclue', !near(spend.spent, expectedCanonical + 99999))
    check('l-achat FOR-AC-10 rattaché à un BC est exclu',
      near(spend.supplyTotal, supplyAmount), String(spend.supplyTotal))

    // ═══ 4. La calibration lit bien la règle canonique ════════════════════
    console.log('\n4. Cible de calibration')

    const similar = await getSimilarCompletedProjects({
      excludeProjectId: '00000000-0000-0000-0000-000000000000',
      projectType: PROJECT_TYPE,
      siteAreaM2: SITE_AREA,
    })
    const mine = similar.find((s) => s.projectId === projectId)

    check('le chantier synthétique est retenu comme comparable', mine !== undefined,
      `${similar.length} projet(s) retenu(s)`)

    if (mine) {
      check('actualCost === getProjectSpend().spent',
        near(mine.actualCost, spend.spent), `${mine.actualCost} vs ${spend.spent}`)

      const oldTarget = poAmount + 1000 + exApproved      // BC + dépenses approuvées
      check('actualCost n-est PAS l-ancienne cible (BC + dépenses seules)',
        !near(mine.actualCost, oldTarget), `${mine.actualCost} vs ${oldTarget}`)
      check('la différence vaut exactement engins + FOR-AC-10',
        near(mine.actualCost - oldTarget, equipAmount + supplyAmount),
        String(mine.actualCost - oldTarget))
      check('la liste de plantes est transmise au moteur', mine.plantList.length === 3)
      check('la surface est transmise', near(mine.siteAreaM2, SITE_AREA))

      // ═══ 5. Effet sur le facteur ═══════════════════════════════════════
      console.log('\n5. Facteur de correction')

      const estOfMine = computeBottomUp(
        { projectType: 'commercial', siteAreaM2: mine.siteAreaM2, region: 'tunis', season: 'spring',
          plantList: mine.plantList },
        DEFAULT_ENGINE_CONFIG,
      ).total

      const newRatio = mine.actualCost / estOfMine
      const oldRatio = oldTarget / estOfMine
      const newFactor = computeCalibration([newRatio]).factor
      const oldFactor = computeCalibration([oldRatio]).factor

      console.log(`  (ratio ancien ${oldRatio.toFixed(3)} → facteur ${oldFactor.toFixed(3)} ; ` +
        `ratio canonique ${newRatio.toFixed(3)} → facteur ${newFactor.toFixed(3)})`)

      check('les deux ratios tombent dans le clamp [0,7 ; 1,4] — comparaison non triviale',
        oldRatio > 0.7 && oldRatio < 1.4 && newRatio > 0.7 && newRatio < 1.4,
        `${oldRatio.toFixed(3)} / ${newRatio.toFixed(3)}`)
      check('le facteur canonique est strictement supérieur à l-ancien',
        newFactor > oldFactor, `${newFactor} vs ${oldFactor}`)
      check('l-écart de facteur reflète engins + FOR-AC-10',
        near(newFactor - oldFactor, (equipAmount + supplyAmount) / estOfMine, 1e-9),
        String(newFactor - oldFactor))
      check('le clamp et le calcul du facteur sont inchangés',
        near(newFactor, Math.min(1.4, Math.max(0.7, newRatio))))
    }

    // ═══ 6. Aucune prédiction historique touchée ═════════════════════════
    console.log('\n6. Prédictions historiques')
    check('aucune prédiction créée ou modifiée',
      (await predictionFingerprint()) === fingerprintBefore)
    check('le nombre de prédictions est inchangé',
      (await count('budget_predictions')) === before.budgetPredictions)
    check('aucune migration requise : la calibration ne persiste rien',
      (await count('budget_predictions')) === before.budgetPredictions)
  } finally {
    // ═══ 7. Démontage complet ════════════════════════════════════════════
    console.log('\n7. Démontage')
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
    await db.execute(sql`DELETE FROM equipment_rentals WHERE equipment_description LIKE 'TEST-CALIB%'`)
    await db.execute(sql`DELETE FROM equipment_types   WHERE name LIKE 'TEST-CALIB%'`)
    await db.execute(sql`DELETE FROM extra_expenses    WHERE description LIKE 'TEST-CALIB%'`)
    await db.execute(sql`DELETE FROM purchase_orders   WHERE item_description LIKE 'TEST-CALIB%'`)
    await db.execute(sql`DELETE FROM plant_list_items  WHERE botanical_name LIKE 'TEST-CALIB%'`)
    if (projectId) {
      await db.execute(sql`DELETE FROM project_activity_log WHERE project_id = ${projectId}`)
      await db.delete(projects).where(eq(projects.id, projectId))
    }
  }

  // ═══ 8. Retour exact à l-état initial ═══════════════════════════════════
  console.log('\n8. Données existantes inchangées')
  const after = {
    projects: await count('projects'),
    plantListItems: await count('plant_list_items'),
    purchaseOrders: await count('purchase_orders'),
    extraExpenses: await count('extra_expenses'),
    equipmentTypes: await count('equipment_types'),
    equipmentRentals: await count('equipment_rentals'),
    supplyRegisters: await count('supply_registers'),
    supplyPurchases: await count('supply_purchases'),
    budgetPredictions: await count('budget_predictions'),
  }
  for (const key of Object.keys(before) as (keyof typeof before)[]) {
    check(`${key} : ${before[key]} → ${after[key]}`, before[key] === after[key])
  }
  check('empreinte des prédictions identique',
    (await predictionFingerprint()) === fingerprintBefore)

  console.log(`\n${passed} réussis, ${failed} échoués`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
