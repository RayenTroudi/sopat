/**
 * FOR-AC-10 — « Suivi d'approvisionnement de chantier ».
 *
 * Covers the twenty areas the feature was specified against: the register's
 * relations, the calculations, the guards, and the promise that nothing
 * pre-existing moved.
 *
 * The calculation sections are pure — they run the engine over fixtures taken
 * from the reference workbook and compare against the values Excel itself
 * cached in the file. That is the strongest available evidence the business
 * rules were reproduced rather than reinvented. Those fixtures live in memory
 * only; nothing from the example chantier is written anywhere.
 *
 * The persistence sections write a register under an EXISTING project, read it
 * back through the real data layer, then delete it and prove the counts return
 * to their opening values. No project, client or supplier is created.
 */
import { selectTestTarget } from './lib/test-target'

// Must run before the first database operation. `db` is a lazy Proxy that
// resolves DATABASE_URL on first use, not on import, so the static imports
// below are safe once the target has been chosen here.
const target = selectTestTarget(false)
console.log(`Cible : ${target.label}\n`)

import { db } from '../db/index'
import {
  projects,
  suppliers,
  supplyDeliveries,
  supplyItems,
  supplyPurchases,
  supplyRegisters,
  users,
} from '../db/schema'
import { and, eq, isNull, sql } from 'drizzle-orm'
import {
  computeItem,
  computePurchase,
  computeRegister,
  formatMoney,
  formatPercent,
  formatQuantity,
  num,
  numOrNull,
  safeRatio,
  varianceTone,
} from '../src/lib/supply-calc'
import {
  supplyItemSchema,
  supplyItemsSchema,
  supplyObservationsSchema,
} from '../src/lib/validation/supply'
import {
  canEditSupplyRegister,
  ensureSupplyRegister,
  getProjectPurchaseOrdersForSelect,
  getSupplyRegister,
  replaceSupplyItems,
  SUPPLY_WRITE_ROLES,
  updateSupplyRegisterObservations,
} from '../src/lib/db/supply'
import { getProjectAchats } from '../src/lib/db/achat'
import { getProjectSpend } from '../src/lib/db/project-spend'


/** FOR-AC-10's own contribution, read through the canonical rule. */
const supplyContribution = async (projectId: string) =>
  (await getProjectSpend(projectId)).supplyTotal
import type { AuditActor } from '../src/lib/audit-record'
import type { SupplyRegisterRow } from '../src/lib/db/supply'
import { buildSupplyWorkbook } from '../src/lib/export/supply-workbook'
import { parseSupplyWorkbook, toInputRow } from '../src/lib/import/supply-import'
import { computeItem as ci } from '../src/lib/supply-calc'
import ExcelJS from 'exceljs'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

/** Builds one export-fixture line together with its computed totals. */
function exportItem(
  designation: string, norme: string | null, q: number, pu: number,
  actual: number | null, deliveries: number[],
  purchases: { q: number; pu: number; vat: number }[],
) {
  return {
    id: 'x', position: 0, designation, norme,
    plannedQuantity: q, plannedUnitPriceHtva: pu,
    actualUnitPriceHtva: actual, observations: null,
    deliveries: deliveries.map((quantity, i) => ({
      id: `d${i}`, position: i, deliveryDate: '2025-10-22',
      supplierId: null, supplierLabel: 'SAMI', supplierName: 'SAMI',
      blNumber: '****', deliveryNoteId: null, quantity,
    })),
    purchases: purchases.map((p, i) => ({
      id: `p${i}`, position: i, supplierId: null, supplierLabel: 'SAMI',
      supplierName: 'SAMI', norme: 'Semi', quantity: p.q,
      unitPriceHtva: p.pu, vatRate: p.vat,
      totalHtva: p.q * p.pu, vatAmount: p.q * p.pu * p.vat,
      totalTtc: p.q * p.pu * (1 + p.vat),
    })),
    totals: ci({
      plannedQuantity: q, plannedUnitPriceHtva: pu, actualUnitPriceHtva: actual,
      deliveries: deliveries.map((quantity) => ({ quantity })),
      purchases: purchases.map((p) => ({ quantity: p.q, unitPriceHtva: p.pu, vatRate: p.vat })),
    }),
  }
}

let passed = 0
let failed = 0

function check(label: string, ok: boolean, detail = '') {
  if (ok) { passed++; console.log(`  ok   ${label}`) }
  else { failed++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`) }
}

/** Float comparison at the workbook's three-decimal money precision. */
function near(a: number | null, b: number | null, eps = 1e-6): boolean {
  if (a === null || b === null) return a === b
  return Math.abs(a - b) < eps
}

async function count(table: string): Promise<number> {
  const r = await db.execute<{ n: string }>(sql.raw(`SELECT count(*)::text AS n FROM ${table}`))
  return Number(r.rows[0].n)
}

async function main() {
  // ── Opening state, for §17-§20 ───────────────────────────────────────────
  const before = {
    projects: await count('projects'),
    clients: await count('clients'),
    suppliers: await count('suppliers'),
    purchaseOrders: await count('purchase_orders'),
    deliveryNotes: await count('delivery_notes'),
    extraExpenses: await count('extra_expenses'),
    nonConformances: await count('non_conformances'),
    correctiveActions: await count('corrective_actions'),
    auditProgramItems: await count('audit_program_items'),
    registers: await count('supply_registers'),
    items: await count('supply_items'),
    deliveries: await count('supply_deliveries'),
    purchases: await count('supply_purchases'),
  }

  // ═══ 1. Calculations, against the reference workbook's own cached values ═══
  //
  // Villa Mr Somrani, sheet RDC. Each fixture quotes the row it comes from and
  // the value Excel stored for the derived cells.
  console.log('\n1. Calculs — comparés aux valeurs mises en cache par le classeur')

  // Row 10: « Fourniture et pose de la terre végétale », 6 livraisons, 6 achats.
  // C=120 m³, D=55. Livraisons 40+20+40+20+7+2 = 129.
  const terreVegetale = computeItem({
    plannedQuantity: 120,
    plannedUnitPriceHtva: 55,
    actualUnitPriceHtva: null, // L10 = =D10
    deliveries: [40, 20, 40, 20, 7, 2].map((q) => ({ quantity: q })),
    purchases: [
      { quantity: 2, unitPriceHtva: 600, vatRate: 0 },
      { quantity: 1, unitPriceHtva: 600, vatRate: 0 },
      { quantity: 2, unitPriceHtva: 600, vatRate: 0 },
      { quantity: 1, unitPriceHtva: 600, vatRate: 0 },
      { quantity: 1, unitPriceHtva: 240, vatRate: 0 },
      { quantity: 1, unitPriceHtva: 140, vatRate: 0 },
    ],
  })
  check('E10 prix total prévu = 6 600', near(terreVegetale.plannedTotalHtva, 6600), String(terreVegetale.plannedTotalHtva))
  check('Σ I10:I15 quantité livrée = 129', near(terreVegetale.deliveredQuantity, 129), String(terreVegetale.deliveredQuantity))
  check('J10 écart de quantité = 9', near(terreVegetale.quantityVariance, 9), String(terreVegetale.quantityVariance))
  check('K10 % écart quantité = 7,50 %', near(terreVegetale.quantityVariancePct, 0.075), String(terreVegetale.quantityVariancePct))
  check('L10 P.U. réel = 55 (hérité du devis)', near(terreVegetale.actualUnitPriceHtva, 55))
  check('M10 écart PU = 0', near(terreVegetale.unitPriceVariance, 0))
  check('N10 écart PU = 0 % — (L-D)/D, pas le ratio L/D du classeur',
    near(terreVegetale.unitPriceVariancePct, 0), String(terreVegetale.unitPriceVariancePct))
  check('O10 prix total réel = 7 095', near(terreVegetale.actualTotalHtva, 7095), String(terreVegetale.actualTotalHtva))
  check('P10 écart PT = 495', near(terreVegetale.totalVariance, 495), String(terreVegetale.totalVariance))
  check('Q10 % écart PT = 7,50 %', near(terreVegetale.totalVariancePct, 0.075))
  check('Σ V10:V15 achats HTVA = 3 980', near(terreVegetale.purchaseTotalHtva, 3980), String(terreVegetale.purchaseTotalHtva))
  check('Σ W10:W15 achats TTC = 3 980 (TVA 0 comme le classeur)', near(terreVegetale.purchaseTotalTtc, 3980))
  check('6 livraisons rattachées à une seule ligne du devis', terreVegetale.deliveryCount === 6)
  check('6 achats rattachés à la même ligne', terreVegetale.purchaseCount === 6)

  // Row 18: « Travaux de plantation », Ens, C=1, D=4500, livré 0,7 → sous-livraison.
  const plantation = computeItem({
    plannedQuantity: 1, plannedUnitPriceHtva: 4500, actualUnitPriceHtva: null,
    deliveries: [{ quantity: 0.7 }], purchases: [],
  })
  check('J18 écart négatif = -0,3', near(plantation.quantityVariance, -0.3, 1e-9), String(plantation.quantityVariance))
  check('K18 = -30 %', near(plantation.quantityVariancePct, -0.3, 1e-9))
  check('O18 prix total réel = 3 150', near(plantation.actualTotalHtva, 3150))
  check('P18 écart PT = -1 350', near(plantation.totalVariance, -1350))
  check('Q18 = -30 %', near(plantation.totalVariancePct, -0.3, 1e-9))

  // Row 19: rien livré du tout — le classeur affiche -100 %.
  const arrosage = computeItem({
    plannedQuantity: 1, plannedUnitPriceHtva: 7183.86, actualUnitPriceHtva: null,
    deliveries: [], purchases: [],
  })
  check('ligne non livrée : O19 = 0', near(arrosage.actualTotalHtva, 0))
  check('ligne non livrée : Q19 = -100 %', near(arrosage.totalVariancePct, -1))
  check('ligne non livrée : K19 = -100 %', near(arrosage.quantityVariancePct, -1))

  // Row 27: C=0 mais 5 livrés — le classeur produit #DIV/0! ; ici c'est null.
  const carissa = computeItem({
    plannedQuantity: 0, plannedUnitPriceHtva: 65, actualUnitPriceHtva: null,
    deliveries: [{ quantity: 5 }],
    purchases: [{ quantity: 5, unitPriceHtva: 24.5, vatRate: 0 }],
  })
  check('quantité prévue nulle : J27 = 5', near(carissa.quantityVariance, 5))
  check('quantité prévue nulle : K27 est indéfini, pas #DIV/0!', carissa.quantityVariancePct === null)
  check('quantité prévue nulle : Q27 est indéfini', carissa.totalVariancePct === null)
  check('O27 reste calculable = 325', near(carissa.actualTotalHtva, 325))
  check('P27 reste calculable = 325', near(carissa.totalVariance, 325))
  check('V27 achat = 122,5 (remise 30 % appliquée à la saisie)', near(carissa.purchaseTotalHtva, 122.5))

  // Row 29/30 : deux livraisons de fournisseurs différents sur une même ligne.
  const fougere = computeItem({
    plannedQuantity: 0, plannedUnitPriceHtva: 25, actualUnitPriceHtva: null,
    deliveries: [{ quantity: 50 }, { quantity: 45 }], purchases: [],
  })
  check('J29 = (I29+I30) - C29 = 95', near(fougere.quantityVariance, 95), String(fougere.quantityVariance))
  // Divergence assumée avec le classeur. O29 y vaut `=L29*I29` (1 250) : la
  // deuxième livraison de la ligne, comptée dans J29, est oubliée dans la
  // valorisation. Les deux autres lignes multi-livraisons du classeur (O10 et
  // O33) agrègent bien, et J29 lui-même agrège. O29 est donc une erreur de
  // formule ; le moteur agrège partout, ce qui vaut 25 x 95.
  check('O29 agrège les deux livraisons = 2 375 (le classeur en oublie une)',
    near(fougere.actualTotalHtva, 2375), String(fougere.actualTotalHtva))

  // Row 33/34/35 : trois livraisons, deux fournisseurs distincts.
  const paspalum = computeItem({
    plannedQuantity: 300, plannedUnitPriceHtva: 16, actualUnitPriceHtva: null,
    deliveries: [{ quantity: 250 }, { quantity: 190 }, { quantity: 80 }], purchases: [],
  })
  check('J33 = SUM(I33:I35) - C33 = 220', near(paspalum.quantityVariance, 220))
  check('K33 = 73,33 %', near(paspalum.quantityVariancePct, 220 / 300))
  check('O33 = 8 320', near(paspalum.actualTotalHtva, 8320))
  check('P33 = 3 520', near(paspalum.totalVariance, 3520))

  // ═══ 2. Overridden unit price — the reason columns M and N exist ═══════════
  console.log('\n2. Prix unitaire réel différent du devis')
  const overridden = computeItem({
    plannedQuantity: 10, plannedUnitPriceHtva: 100, actualUnitPriceHtva: 120,
    deliveries: [{ quantity: 10 }], purchases: [],
  })
  check('M écart PU = +20', near(overridden.unitPriceVariance, 20))
  check('N écart PU = +20 %, et non 120 %', near(overridden.unitPriceVariancePct, 0.2),
    String(overridden.unitPriceVariancePct))
  check('O utilise le PU réel = 1 200', near(overridden.actualTotalHtva, 1200))
  check('P écart PT = +200', near(overridden.totalVariance, 200))

  // ═══ 3. VAT ═══════════════════════════════════════════════════════════════
  console.log('\n3. TVA sur les achats')
  const withVat = computeItem({
    plannedQuantity: 1, plannedUnitPriceHtva: 1, actualUnitPriceHtva: null,
    deliveries: [], purchases: [{ quantity: 10, unitPriceHtva: 100, vatRate: 0.19 }],
  })
  check('HTVA = 1 000', near(withVat.purchaseTotalHtva, 1000))
  check('TVA = 190', near(withVat.purchaseVatAmount, 190))
  check('TTC = 1 190', near(withVat.purchaseTotalTtc, 1190))
  const noVat = computeItem({
    plannedQuantity: 1, plannedUnitPriceHtva: 1, actualUnitPriceHtva: null,
    deliveries: [], purchases: [{ quantity: 10, unitPriceHtva: 100, vatRate: 0 }],
  })
  check('taux 0 : TTC = HTVA, comme W = V dans le classeur', near(noVat.purchaseTotalTtc, 1000))

  // ═══ 4. Register indicators ═══════════════════════════════════════════════
  console.log('\n4. Indicateurs du registre')
  const reg = computeRegister([terreVegetale, plantation, arrosage, carissa, fougere, paspalum])
  check('coût prévisionnel = somme des E', near(reg.plannedTotalHtva,
    6600 + 4500 + 7183.86 + 0 + 0 + 4800), String(reg.plannedTotalHtva))
  check('coût réel = somme des O', near(reg.actualTotalHtva,
    7095 + 3150 + 0 + 325 + 2375 + 8320), String(reg.actualTotalHtva))
  check('taux de respect du coût = réel / prévisionnel',
    near(reg.costComplianceRate, reg.actualTotalHtva / reg.plannedTotalHtva))
  // Σ livré / Σ prévu — PAS la moyenne des pourcentages de ligne.
  // prévu : 120 + 1 + 1 + 0 + 0 + 300 = 422 ; livré : 129 + 0,7 + 0 + 5 + 95 + 520 = 749,7
  check('taux de respect de quantité = Σ livré / Σ prévu',
    near(reg.quantityComplianceRate, 749.7 / 422), String(reg.quantityComplianceRate))
  check('Σ quantités prévues du registre', near(reg.totalPlannedQuantity, 422),
    String(reg.totalPlannedQuantity))
  check('Σ quantités livrées du registre', near(reg.totalDeliveredQuantity, 749.7, 1e-9),
    String(reg.totalDeliveredQuantity))
  check('ce n-est PAS la moyenne des pourcentages de ligne',
    !near(reg.quantityComplianceRate, (0.075 + -0.3 + -1 + 220 / 300) / 4))
  check('les lignes sans quantité prévue ne cassent pas l-indicateur',
    reg.quantityComplianceRate !== null && Number.isFinite(reg.quantityComplianceRate))
  check('2 lignes signalées comme sans quantité prévue', reg.itemsWithoutPlannedQuantity === 2,
    String(reg.itemsWithoutPlannedQuantity))
  check('dépenses HTVA = somme des V', near(reg.purchaseTotalHtva, 3980 + 122.5))
  check('marge brute = réel facturable - achats',
    near(reg.grossMargin, reg.actualTotalHtva - reg.purchaseTotalHtva))
  check('livraisons comptées sur tout le registre', reg.deliveryCount === 6 + 1 + 0 + 1 + 2 + 3,
    String(reg.deliveryCount))
  check('achats comptés sur tout le registre', reg.purchaseCount === 6 + 1, String(reg.purchaseCount))

  // ═══ 5. Degenerate inputs — no NaN, no Infinity, no broken UI ═════════════
  console.log('\n5. Valeurs manquantes et cas dégénérés')
  const empty = computeRegister([])
  check('registre vide : coût prévisionnel = 0', empty.plannedTotalHtva === 0)
  check('registre vide : taux de coût indéfini', empty.costComplianceRate === null)
  check('registre vide : taux de quantité indéfini', empty.quantityComplianceRate === null)

  const zeroes = computeItem({
    plannedQuantity: 0, plannedUnitPriceHtva: 0, actualUnitPriceHtva: null,
    deliveries: [], purchases: [],
  })
  const zeroFields = Object.entries(zeroes).filter(([, v]) => typeof v === 'number')
  check('ligne entièrement vide : aucun NaN ni Infinity',
    zeroFields.every(([, v]) => Number.isFinite(v as number)),
    zeroFields.filter(([, v]) => !Number.isFinite(v as number)).map(([k]) => k).join(', '))
  check('ligne entièrement vide : tous les ratios sont null',
    zeroes.quantityVariancePct === null && zeroes.totalVariancePct === null &&
    zeroes.unitPriceVariancePct === null)

  check('safeRatio(1, 0) = null', safeRatio(1, 0) === null)
  check('safeRatio(0, 0) = null', safeRatio(0, 0) === null)
  check('safeRatio(NaN, 1) = null', safeRatio(NaN, 1) === null)
  check('safeRatio(1, Infinity) = null', safeRatio(1, Infinity) === null)
  check('num("") = 0', num('') === 0)
  check('num("abc") = 0', num('abc') === 0)
  check('num(null) = 0', num(null) === 0)
  check('numOrNull("") = null (pas de PU réel)', numOrNull('') === null)
  check('numOrNull("55") = 55', numOrNull('55') === 55)

  check('formatPercent(null) = —', formatPercent(null) === '—')
  check('formatMoney(null) = —', formatMoney(null) === '—')
  check('formatQuantity(NaN) = —', formatQuantity(NaN) === '—')
  check('formatMoney arrondit à 3 décimales', formatMoney(1234.5678).includes('568'),
    formatMoney(1234.5678))
  check('varianceTone(0) neutre', varianceTone(0) === 'neutral')
  check('varianceTone(+5) = over', varianceTone(5) === 'over')
  check('varianceTone(-5) = under', varianceTone(-5) === 'under')
  check('varianceTone(null) neutre', varianceTone(null) === 'neutral')

  // ═══ 6. Zod — invalid payloads are rejected ═══════════════════════════════
  console.log('\n6. Validation Zod')
  const validItem = {
    designation: 'Terre végétale', norme: 'm³',
    plannedQuantity: 120, plannedUnitPriceHtva: 55,
    deliveries: [], purchases: [],
  }
  check('charge utile valide acceptée', supplyItemSchema.safeParse(validItem).success)
  check('désignation vide refusée',
    !supplyItemSchema.safeParse({ ...validItem, designation: '' }).success)
  check('quantité négative refusée',
    !supplyItemSchema.safeParse({ ...validItem, plannedQuantity: -1 }).success)
  check('prix négatif refusé',
    !supplyItemSchema.safeParse({ ...validItem, plannedUnitPriceHtva: -0.001 }).success)
  check('quantité 0 acceptée (le classeur en contient)',
    supplyItemSchema.safeParse({ ...validItem, plannedQuantity: 0 }).success)
  check('quantité non finie refusée',
    !supplyItemSchema.safeParse({ ...validItem, plannedQuantity: Number.POSITIVE_INFINITY }).success)
  check('quantité hors limites numeric(12,3) refusée',
    !supplyItemSchema.safeParse({ ...validItem, plannedQuantity: 1e12 }).success)
  check('quantité en chaîne refusée (pas de coercition silencieuse)',
    !supplyItemSchema.safeParse({ ...validItem, plannedQuantity: '120' }).success)
  check('clé inconnue refusée (.strict)',
    !supplyItemSchema.safeParse({ ...validItem, registerId: 'x' }).success)
  check('un id de registre ne peut pas être injecté',
    !supplyItemsSchema.safeParse({ items: [], registerId: 'x' }).success)
  check('createdBy ne peut pas être injecté',
    !supplyItemSchema.safeParse({ ...validItem, createdBy: 'x' }).success)
  check('PU réel null accepté (= prix du devis)',
    supplyItemSchema.safeParse({ ...validItem, actualUnitPriceHtva: null }).success)
  check('date de livraison mal formée refusée',
    !supplyItemSchema.safeParse({ ...validItem,
      deliveries: [{ deliveryDate: '15/10/2025', quantity: 1 }] }).success)
  check('date ISO acceptée',
    supplyItemSchema.safeParse({ ...validItem,
      deliveries: [{ deliveryDate: '2025-10-15', quantity: 1 }] }).success)
  check('supplierId non-uuid refusé',
    !supplyItemSchema.safeParse({ ...validItem,
      deliveries: [{ supplierId: 'SAMI', quantity: 1 }] }).success)
  check('fournisseur en texte libre accepté',
    supplyItemSchema.safeParse({ ...validItem,
      deliveries: [{ supplierLabel: 'SAMI', quantity: 1 }] }).success)
  check('N° de BL non numérique accepté (M0118094 dans le classeur)',
    supplyItemSchema.safeParse({ ...validItem,
      deliveries: [{ blNumber: 'M0118094', quantity: 1 }] }).success)
  check('taux de TVA négatif refusé',
    !supplyItemSchema.safeParse({ ...validItem,
      purchases: [{ quantity: 1, unitPriceHtva: 1, vatRate: -0.1 }] }).success)
  check('corps null refusé', !supplyItemsSchema.safeParse(null).success)
  check('items non-tableau refusé', !supplyItemsSchema.safeParse({ items: 'x' }).success)
  check('observations vides normalisées en null',
    supplyObservationsSchema.safeParse({ observations: '   ' }).success &&
    supplyObservationsSchema.parse({ observations: '   ' }).observations === null)

  // ═══ 7. Authorization ═════════════════════════════════════════════════════
  console.log('\n7. Autorisations')
  check('admin peut modifier', canEditSupplyRegister('admin'))
  check('direction peut modifier', canEditSupplyRegister('direction'))
  check('chef de réalisation peut modifier', canEditSupplyRegister('realisation_chef'))
  check("chef d'études peut modifier", canEditSupplyRegister('etudes_chef'))
  check('équipe de réalisation ne peut PAS modifier', !canEditSupplyRegister('realisation_team'))
  check("équipe d'études ne peut PAS modifier", !canEditSupplyRegister('etudes_team'))
  check("chef d'entretien ne peut PAS modifier", !canEditSupplyRegister('entretien_chef'))
  check('rôle inconnu ne peut pas modifier', !canEditSupplyRegister('auditeur'))
  check('rôle vide ne peut pas modifier', !canEditSupplyRegister(''))
  check('la liste des rôles reste celle du décompte',
    SUPPLY_WRITE_ROLES.join(',') === 'admin,direction,realisation_chef,etudes_chef',
    SUPPLY_WRITE_ROLES.join(','))

  // ═══ 8. Persistence, against a real database ══════════════════════════════
  console.log('\n8. Persistance, TVA, rattachement BC et budget')

  const [project] = await db
    .select({ id: projects.id, name: projects.name, reference: projects.reference })
    .from(projects).where(isNull(projects.deletedAt)).limit(1)
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users).limit(1)
  const [supplier] = await db
    .select({ id: suppliers.id, name: suppliers.name }).from(suppliers).limit(1)

  if (!project || !user) {
    console.log('  (aucun projet ou utilisateur existant — section ignorée)')
  } else {
    const actor: AuditActor = {
      userId: user.id, name: user.name, email: user.email, role: user.role,
    }

    const existing = await getSupplyRegister(project.id)
    if (existing) {
      console.log(`  (le projet ${project.reference} a déjà un registre — section ignorée)`)
    } else {
      // Consommation budgétaire AVANT tout achat FOR-AC-10, pour mesurer
      // exactement ce que le registre y ajoute.
      const baselineSpent = (await getProjectAchats(project.id)).budget.spent
      check('la contribution FOR-AC-10 est nulle avant toute ligne',
        near(await supplyContribution(project.id), 0))

      const registerId = await ensureSupplyRegister(project.id, user.id, actor)
      check('un projet peut recevoir un registre', typeof registerId === 'string')

      const again = await ensureSupplyRegister(project.id, user.id, actor)
      check('la création est idempotente (un seul registre par projet)', again === registerId)

      await replaceSupplyItems(registerId, [
        {
          designation: 'Ligne de test — terre végétale',
          norme: 'm³',
          plannedQuantity: 120,
          plannedUnitPriceHtva: 55,
          actualUnitPriceHtva: null,
          observations: null,
          deliveries: [
            { deliveryDate: '2025-10-22', supplierId: supplier?.id ?? null, blNumber: 'BL-A', quantity: 40 },
            { deliveryDate: '2025-10-24', supplierLabel: 'SAMI', blNumber: 'M0118094', quantity: 20 },
            { supplierLabel: 'SAMI', quantity: 69 },
          ],
          purchases: [
            { supplierId: supplier?.id ?? null, norme: 'Semi', quantity: 2, unitPriceHtva: 600, vatRate: 0 },
            { supplierLabel: 'SAMI', norme: 'berle', quantity: 1, unitPriceHtva: 240, vatRate: 0.19 },
          ],
        },
        {
          designation: 'Ligne de test — sans quantité prévue',
          norme: 'Pot 35',
          plannedQuantity: 0,
          plannedUnitPriceHtva: 65,
          actualUnitPriceHtva: 70,
          observations: 'Ajoutée en cours de chantier',
          deliveries: [{ quantity: 5 }],
          purchases: [],
        },
      ], user.id, actor)

      const read = await getSupplyRegister(project.id)
      check('le registre se relit', read !== null)

      if (read) {
        check('2 lignes du devis', read.items.length === 2, String(read.items.length))
        const [line1, line2] = read.items
        check('les lignes gardent leur ordre',
          line1.designation.includes('terre végétale'), line1.designation)

        check('3 livraisons rattachées à la même ligne', line1.deliveries.length === 3)
        check('2 achats rattachés à la même ligne', line1.purchases.length === 2)

        check('la date de livraison est conservée', line1.deliveries[0].deliveryDate === '2025-10-22',
          String(line1.deliveries[0].deliveryDate))
        check('le N° de BL est conservé', line1.deliveries[0].blNumber === 'BL-A')
        check('un N° de BL alphanumérique est conservé', line1.deliveries[1].blNumber === 'M0118094')
        check('une livraison sans date ni BL est acceptée',
          line1.deliveries[2].deliveryDate === null && line1.deliveries[2].blNumber === null)

        if (supplier) {
          check('le fournisseur lié est résolu par son nom',
            line1.deliveries[0].supplierName === supplier.name, String(line1.deliveries[0].supplierName))
          check('la relation fournisseur pointe le registre FOR-AC-11',
            line1.deliveries[0].supplierId === supplier.id)
        }
        check('un fournisseur en texte libre est conservé tel quel',
          line1.deliveries[1].supplierName === 'SAMI', String(line1.deliveries[1].supplierName))

        check('quantité livrée cumulée = 129', near(line1.totals.deliveredQuantity, 129),
          String(line1.totals.deliveredQuantity))
        check('écart de quantité = 9 après relecture', near(line1.totals.quantityVariance, 9))
        check('prix total réel = 7 095 après relecture', near(line1.totals.actualTotalHtva, 7095))
        check('la décimale des prix est préservée', near(line1.plannedUnitPriceHtva, 55))
        check("l'achat avec TVA 19 % ressort à 285,6 TTC",
          near(line1.purchases[1].totalTtc, 240 * 1.19), String(line1.purchases[1].totalTtc))
        check("l'achat sans TVA ressort HTVA = TTC",
          near(line1.purchases[0].totalHtva, line1.purchases[0].totalTtc))

        check('le PU réel surchargé est relu', line2.actualUnitPriceHtva === 70)
        check('le PU réel surchargé est utilisé dans O', near(line2.totals.actualTotalHtva, 350))
        check('quantité prévue 0 : le pourcentage reste indéfini',
          line2.totals.quantityVariancePct === null)
        check("l'observation de la ligne est conservée",
          line2.observations === 'Ajoutée en cours de chantier')

        check('le total du registre agrège les deux lignes',
          near(read.totals.actualTotalHtva, 7095 + 350), String(read.totals.actualTotalHtva))
        check("l'en-tête reprend la référence du projet", read.project.reference === project.reference)
        check("l'en-tête reprend le nom du projet", read.project.name === project.name)
        check('aucune donnée projet n\'est dupliquée dans le registre',
          !Object.keys(read).includes('clientName'))
      }

      await updateSupplyRegisterObservations(registerId, 'Observation de test', actor)
      const withObs = await getSupplyRegister(project.id)
      check("l'observation du registre est enregistrée",
        withObs?.observations === 'Observation de test', String(withObs?.observations))

      // ── VAT and the bon-de-commande link round-trip ──
      const poRows = await getProjectPurchaseOrdersForSelect(project.id)
      const linkedPo = poRows[0] ?? null

      await replaceSupplyItems(registerId, [{
        designation: 'Ligne de test — TVA et rattachement',
        plannedQuantity: 10,
        plannedUnitPriceHtva: 100,
        actualUnitPriceHtva: null,
        deliveries: [{ quantity: 10 }],
        purchases: [
          // Compte dans le budget : aucun bon de commande ne le couvre.
          { quantity: 10, unitPriceHtva: 100, vatRate: 0.19 },
          // Ne compte PAS : déjà porté par un bon de commande.
          { quantity: 5, unitPriceHtva: 200, vatRate: 0.07,
            purchaseOrderId: linkedPo?.id ?? null },
        ],
      }], user.id, actor)

      const vatRead = await getSupplyRegister(project.id)
      const vatLine = vatRead!.items[0]
      check('le taux de TVA est persisté tel quel', vatLine.purchases[0].vatRate === 0.19,
        String(vatLine.purchases[0].vatRate))
      check('un second taux, différent, sur la même ligne',
        vatLine.purchases[1].vatRate === 0.07, String(vatLine.purchases[1].vatRate))
      check('V = U × T après relecture', near(vatLine.purchases[0].totalHtva, 1000))
      check('W = V × (1 + taux) après relecture',
        near(vatLine.purchases[0].totalTtc, 1190), String(vatLine.purchases[0].totalTtc))
      check('TVA = W − V après relecture', near(vatLine.purchases[0].vatAmount, 190))
      check('2e achat : 1 000 HTVA → 1 070 TTC',
        near(vatLine.purchases[1].totalTtc, 1070), String(vatLine.purchases[1].totalTtc))

      if (linkedPo) {
        check('le rattachement au bon de commande est persisté',
          vatLine.purchases[1].purchaseOrderId === linkedPo.id)
        check('le libellé du bon de commande est résolu',
          vatLine.purchases[1].purchaseOrderReference === linkedPo.label,
          String(vatLine.purchases[1].purchaseOrderReference))
      }
      check('un achat non rattaché reste null', vatLine.purchases[0].purchaseOrderId === null)

      // ── Budget : contribution et absence de double comptage ──
      const supplySpend = await supplyContribution(project.id)
      check('seul l-achat non rattaché alimente le budget (1 190 TTC)',
        near(supplySpend, 1190), String(supplySpend))
      check('l-achat rattaché à un BC est exclu — pas de double comptage',
        !near(supplySpend, 1190 + 1070), String(supplySpend))

      const achatsAfter = await getProjectAchats(project.id)
      check('la consommation budgétaire expose la part approvisionnement',
        near(achatsAfter.budget.supplyTotal, 1190), String(achatsAfter.budget.supplyTotal))
      check('spent = BC + dépenses approuvées + approvisionnement',
        near(achatsAfter.budget.spent,
          achatsAfter.budget.poTotal + achatsAfter.budget.expensesTotal + achatsAfter.budget.supplyTotal),
        String(achatsAfter.budget.spent))
      check('la part approvisionnement s-ajoute réellement au total',
        near(achatsAfter.budget.spent - baselineSpent, 1190),
        `${achatsAfter.budget.spent} - ${baselineSpent}`)

      // Rattacher le premier achat à un BC doit retirer son montant du budget.
      if (linkedPo) {
        await replaceSupplyItems(registerId, [{
          designation: 'Ligne de test — tout rattaché',
          plannedQuantity: 10, plannedUnitPriceHtva: 100,
          deliveries: [{ quantity: 10 }],
          purchases: [
            { quantity: 10, unitPriceHtva: 100, vatRate: 0.19, purchaseOrderId: linkedPo.id },
          ],
        }], user.id, actor)
        const allLinked = await supplyContribution(project.id)
        check('tous les achats rattachés → contribution nulle', near(allLinked, 0),
          String(allLinked))
        const achatsLinked = await getProjectAchats(project.id)
        check('la consommation revient à son niveau initial',
          near(achatsLinked.budget.spent, baselineSpent), String(achatsLinked.budget.spent))
      }

      // TVA à 0 : TTC = HTVA, donc les données importées contribuent à l-identique.
      await replaceSupplyItems(registerId, [{
        designation: 'Ligne de test — TVA 0 (comportement historique)',
        plannedQuantity: 1, plannedUnitPriceHtva: 1,
        deliveries: [],
        purchases: [{ quantity: 10, unitPriceHtva: 100, vatRate: 0 }],
      }], user.id, actor)
      const zeroVatSpend = await supplyContribution(project.id)
      check('TVA 0 : la contribution vaut le HTVA (1 000)', near(zeroVatSpend, 1000),
        String(zeroVatSpend))

      // Full replacement must not leave orphans behind.
      await replaceSupplyItems(registerId, [{
        designation: 'Ligne unique après remplacement',
        plannedQuantity: 1, plannedUnitPriceHtva: 10,
        deliveries: [], purchases: [],
      }], user.id, actor)
      const replaced = await getSupplyRegister(project.id)
      check('le remplacement laisse une seule ligne', replaced?.items.length === 1)
      const orphanDeliveries = await db.execute<{ n: string }>(sql`
        SELECT count(*)::text AS n FROM supply_deliveries d
        LEFT JOIN supply_items i ON i.id = d.item_id WHERE i.id IS NULL`)
      check('aucune livraison orpheline', Number(orphanDeliveries.rows[0].n) === 0)
      const orphanPurchases = await db.execute<{ n: string }>(sql`
        SELECT count(*)::text AS n FROM supply_purchases p
        LEFT JOIN supply_items i ON i.id = p.item_id WHERE i.id IS NULL`)
      check('aucun achat orphelin', Number(orphanPurchases.rows[0].n) === 0)

      // ── Audit trail ──
      const trail = await db.execute<{ action: string; n: string }>(sql`
        SELECT action, count(*)::text AS n FROM record_audit_log
        WHERE entity_type = 'supply_register' AND entity_id = ${registerId}
        GROUP BY action`)
      const actions = Object.fromEntries(trail.rows.map((r) => [r.action, Number(r.n)]))
      check('la création est tracée', (actions.created ?? 0) === 1, JSON.stringify(actions))
      check('chaque modification est tracée', (actions.updated ?? 0) >= 3, JSON.stringify(actions))

      // ── Cleanup (§20) ──
      await db.delete(supplyDeliveries).where(sql`item_id IN (
        SELECT id FROM supply_items WHERE register_id = ${registerId})`)
      await db.delete(supplyPurchases).where(sql`item_id IN (
        SELECT id FROM supply_items WHERE register_id = ${registerId})`)
      await db.delete(supplyItems).where(eq(supplyItems.registerId, registerId))
      await db.delete(supplyRegisters).where(eq(supplyRegisters.id, registerId))
      await db.execute(sql`DELETE FROM record_audit_log
        WHERE entity_type = 'supply_register' AND entity_id = ${registerId}`)

      const gone = await db
        .select({ id: supplyRegisters.id })
        .from(supplyRegisters)
        .where(and(eq(supplyRegisters.projectId, project.id), isNull(supplyRegisters.deletedAt)))
      check('le registre de test est supprimé', gone.length === 0)
      check('la contribution budgétaire disparaît avec le registre',
        near(await supplyContribution(project.id), 0))
      check('la consommation budgétaire du projet est restaurée',
        near((await getProjectAchats(project.id)).budget.spent, baselineSpent))
    }
  }

  // ═══ 9. Column N — the price variance, in every corner case ═════════════
  console.log('\n9. Colonne N — % écart PU')

  const nCases: [string, number, number | null, number | null][] = [
    // libellé,                        D,    L (surcharge),  attendu (L-D)/D
    ['prix inchangé → 0 %',              100,  null,           0],
    ['prix inchangé explicite → 0 %',     100,  100,            0],
    ['hausse de 20 % → +20 %',           100,  120,            0.2],
    ['baisse de 25 % → -25 %',           100,  75,            -0.25],
    ['doublement → +100 %',              50,   100,            1],
    ['tombe à zéro → -100 %',            80,   0,             -1],
    ['D = 0 → indéfini, jamais Infinity', 0,  50,             null],
    ['D = 0 et L = 0 → indéfini',        0,    0,              null],
  ]
  for (const [label, d, l, expected] of nCases) {
    const t = computeItem({
      plannedQuantity: 1, plannedUnitPriceHtva: d, actualUnitPriceHtva: l,
      deliveries: [], purchases: [],
    })
    check(`N : ${label}`, near(t.unitPriceVariancePct, expected), String(t.unitPriceVariancePct))
    check(`N : ${label} — valeur finie ou null`,
      t.unitPriceVariancePct === null || Number.isFinite(t.unitPriceVariancePct))
  }

  const dZero = computeItem({
    plannedQuantity: 10, plannedUnitPriceHtva: 0, actualUnitPriceHtva: 50,
    deliveries: [{ quantity: 10 }], purchases: [],
  })
  check('D = 0 : L et D restent intacts', dZero.actualUnitPriceHtva === 50)
  check('D = 0 : M reste calculable (+50)', near(dZero.unitPriceVariance, 50))
  check('D = 0 : N est null', dZero.unitPriceVariancePct === null)
  check('D = 0 : N s-affiche « — »', formatPercent(dZero.unitPriceVariancePct) === '—')
  check('D = 0 : O reste calculable', near(dZero.actualTotalHtva, 500))
  check('D = 0 : Q est null (prix total prévu nul)', dZero.totalVariancePct === null)

  // ═══ 10. VAT — configurable per purchase, never hardcoded ═══════════════
  console.log('\n10. TVA configurable')

  const vatCases: [string, number, number, number, number, number][] = [
    // libellé,        T,   U,      taux,  V attendu, W attendu
    ['taux 0 : W = V', 10, 100,    0,     1000,      1000],
    ['taux 19 %',      10, 100,    0.19,  1000,      1190],
    ['taux 7 %',       10, 100,    0.07,  1000,      1070],
    ['taux 13 %',       3, 250,    0.13,   750,       847.5],
    ['quantité 0',      0, 100,    0.19,     0,         0],
    ['prix 0',         10,   0,    0.19,     0,         0],
  ]
  for (const [label, t, u, rate, v, w] of vatCases) {
    const r = computePurchase({ quantity: t, unitPriceHtva: u, vatRate: rate })
    check(`TVA — ${label} : V = U × T`, near(r.totalHtva, v), String(r.totalHtva))
    check(`TVA — ${label} : W = V × (1 + taux)`, near(r.totalTtc, w), String(r.totalTtc))
    check(`TVA — ${label} : TVA = W − V`, near(r.vatAmount, w - v), String(r.vatAmount))
  }

  const mixedVat = computeItem({
    plannedQuantity: 1, plannedUnitPriceHtva: 1, actualUnitPriceHtva: null,
    deliveries: [],
    purchases: [
      { quantity: 10, unitPriceHtva: 100, vatRate: 0 },
      { quantity: 10, unitPriceHtva: 100, vatRate: 0.19 },
    ],
  })
  check('taux différents sur la même ligne : HTVA = 2 000',
    near(mixedVat.purchaseTotalHtva, 2000), String(mixedVat.purchaseTotalHtva))
  check('taux différents : TVA = 190 seulement sur la 2e',
    near(mixedVat.purchaseVatAmount, 190), String(mixedVat.purchaseVatAmount))
  check('taux différents : TTC = 2 190',
    near(mixedVat.purchaseTotalTtc, 2190), String(mixedVat.purchaseTotalTtc))
  check('aucun taux n-est codé en dur : 0 reste 0',
    near(computePurchase({ quantity: 1, unitPriceHtva: 100, vatRate: 0 }).totalTtc, 100))

  check('Zod accepte un taux de TVA de 0,19',
    supplyItemSchema.safeParse({ designation: 'x', plannedQuantity: 1, plannedUnitPriceHtva: 1,
      purchases: [{ quantity: 1, unitPriceHtva: 1, vatRate: 0.19 }] }).success)
  check('Zod accepte un achat sans taux (défaut 0)',
    supplyItemSchema.safeParse({ designation: 'x', plannedQuantity: 1, plannedUnitPriceHtva: 1,
      purchases: [{ quantity: 1, unitPriceHtva: 1 }] }).success)
  check('Zod refuse un taux négatif',
    !supplyItemSchema.safeParse({ designation: 'x', plannedQuantity: 1, plannedUnitPriceHtva: 1,
      purchases: [{ quantity: 1, unitPriceHtva: 1, vatRate: -0.01 }] }).success)
  check('Zod refuse un taux hors limites numeric(5,4)',
    !supplyItemSchema.safeParse({ designation: 'x', plannedQuantity: 1, plannedUnitPriceHtva: 1,
      purchases: [{ quantity: 1, unitPriceHtva: 1, vatRate: 10 }] }).success)
  check('Zod accepte le rattachement à un bon de commande',
    supplyItemSchema.safeParse({ designation: 'x', plannedQuantity: 1, plannedUnitPriceHtva: 1,
      purchases: [{ quantity: 1, unitPriceHtva: 1,
        purchaseOrderId: '00000000-0000-0000-0000-000000000000' }] }).success)
  check('Zod refuse un identifiant de BC non-uuid',
    !supplyItemSchema.safeParse({ designation: 'x', plannedQuantity: 1, plannedUnitPriceHtva: 1,
      purchases: [{ quantity: 1, unitPriceHtva: 1, purchaseOrderId: 'BC-1' }] }).success)

  // ═══ 11. Overall quantity compliance ══════════════════════════════
  console.log('\n11. Taux de respect de quantité (global)')

  const line = (planned: number, delivered: number[]) => computeItem({
    plannedQuantity: planned, plannedUnitPriceHtva: 1, actualUnitPriceHtva: null,
    deliveries: delivered.map((q) => ({ quantity: q })), purchases: [],
  })

  const exact = computeRegister([line(100, [60, 40]), line(50, [50])])
  check('livré = prévu → 100 %', near(exact.quantityComplianceRate, 1))
  check('Σ prévu = 150', near(exact.totalPlannedQuantity, 150))
  check('Σ livré = 150', near(exact.totalDeliveredQuantity, 150))

  const under = computeRegister([line(100, [80]), line(100, [90])])
  check('sous-livraison globale → 85 %', near(under.quantityComplianceRate, 0.85))

  const over = computeRegister([line(100, [130])])
  check('sur-livraison → 130 %', near(over.quantityComplianceRate, 1.3))

  // The decisive difference from the old average-of-percentages rule: a tiny
  // line can no longer outweigh a large one.
  const weighted = computeRegister([line(1, [2]), line(1000, [500])])
  check('grande ligne pondérée correctement → 502/1001',
    near(weighted.quantityComplianceRate, 502 / 1001), String(weighted.quantityComplianceRate))
  const oldAverage = (1 / 1 + -500 / 1000) / 2
  check('une petite ligne ne domine plus l-indicateur',
    !near(weighted.quantityComplianceRate, oldAverage))

  const withZeroLine = computeRegister([line(100, [100]), line(0, [7])])
  check('une ligne sans quantité prévue ne rend PAS l-indicateur indéfini',
    withZeroLine.quantityComplianceRate !== null)
  check('ses unités livrées comptent au numérateur → 107/100',
    near(withZeroLine.quantityComplianceRate, 1.07), String(withZeroLine.quantityComplianceRate))
  check('elle est tout de même signalée', withZeroLine.itemsWithoutPlannedQuantity === 1)

  const allZero = computeRegister([line(0, [5]), line(0, [3])])
  check('Σ prévu = 0 → indicateur indéfini, jamais Infinity',
    allZero.quantityComplianceRate === null)
  check('il s-affiche « — »', formatPercent(allZero.quantityComplianceRate) === '—')
  check('registre vide → indéfini', computeRegister([]).quantityComplianceRate === null)

  const nothingDelivered = computeRegister([line(100, [])])
  check('rien livré → 0 %', near(nothingDelivered.quantityComplianceRate, 0))

  // ═══ 9. Export — the workbook the register produces ═══════════════════════
  console.log('\n12. Export FOR-AC-10')

  const exportFixture = {
    id: 'r', projectId: 'p', observations: null, dmsDocumentCode: null,
    createdAt: new Date(), updatedAt: new Date('2026-08-08'),
    project: {
      reference: 'SOPAT-2025-004', name: 'Aménagement paysager villa',
      clientName: 'Mr Mohamed Salah Somrani', currency: 'TND',
      startDate: new Date('2025-10-15'), endDate: null,
    },
    items: [
      exportItem('Fourniture et pose de la terre végétale', 'm³', 120, 55, null,
        [40, 20, 40, 20, 7, 2], [{ q: 2, pu: 600, vat: 0 }]),
      exportItem('Carissa macrocarpa boxwood', 'Pot 35', 0, 65, 70,
        [5], [{ q: 5, pu: 24.5, vat: 0.19 }]),
    ],
    totals: computeRegister([]),
  }
  exportFixture.totals = computeRegister(exportFixture.items.map((i) => i.totals))

  const bytes = await buildSupplyWorkbook(exportFixture as unknown as SupplyRegisterRow)
  check('export : classeur non vide', bytes.byteLength > 3000, String(bytes.byteLength))

  const outWb = new ExcelJS.Workbook()
  await outWb.xlsx.load(Buffer.from(bytes) as unknown as ArrayBuffer)
  const outWs = outWb.worksheets[0]
  const merges = (outWs.model as unknown as { merges: string[] }).merges ?? []
  const cellOf = (a: string) => outWs.getCell(a).value
  const formulaOf = (a: string) => {
    const v = outWs.getCell(a).value
    return v && typeof v === 'object' && 'formula' in v ? (v as { formula: string }).formula : null
  }

  check('une seule feuille', outWb.worksheets.length === 1)
  check('code du formulaire en X1', cellOf('X1') === 'FOR-AC-10', String(cellOf('X1')))
  check('révision en X2', cellOf('X2') === 4, String(cellOf('X2')))
  check('groupe « prévisionnel » fusionné A8:E8', merges.includes('A8:E8'))
  check('groupe « Suivi réel » fusionné F8:Q8', merges.includes('F8:Q8'))
  check('groupe « Suivi achat » fusionné R8:W8', merges.includes('R8:W8'))
  check('colonne Observations fusionnée X8:X9', merges.includes('X8:X9'))
  check('en-têtes de colonnes en ligne 9', cellOf('A9') === 'Désignation' && cellOf('I9') === 'QUANTITE')
  check('bloc en-tête : réf. projet', cellOf('E4') === 'SOPAT-2025-004')
  check('bloc en-tête : nom du projet', cellOf('B5') === 'Aménagement paysager villa')
  check('bloc en-tête : client', cellOf('B6') === 'Mr Mohamed Salah Somrani')
  check('chantier ouvert : date de fin = En cours', cellOf('E6') === 'En cours', String(cellOf('E6')))

  check('ligne à 6 livraisons fusionnée verticalement A10:A15', merges.includes('A10:A15'))
  check('colonnes de variance fusionnées sur la même étendue',
    merges.includes('J10:J15') && merges.includes('O10:O15') && merges.includes('Q10:Q15'))
  check('la 2e ligne du devis commence en ligne 16', cellOf('A16') === 'Carissa macrocarpa boxwood',
    String(cellOf('A16')))

  check('E = D*C', formulaOf('E10') === 'D10*C10', String(formulaOf('E10')))
  check('J agrège toute la plage de livraisons', formulaOf('J10') === 'SUM(I10:I15)-C10',
    String(formulaOf('J10')))
  check('O agrège aussi la plage — le bug O29 du classeur est corrigé',
    formulaOf('O10') === 'L10*SUM(I10:I15)', String(formulaOf('O10')))
  check('N calcule un écart (M/D) et non un ratio (L/D)',
    formulaOf('N10') === 'IFERROR(M10/D10,"")', String(formulaOf('N10')))
  check('K est protégé par IFERROR', formulaOf('K10') === 'IFERROR(J10/C10,"")')
  check('Q est protégé par IFERROR', formulaOf('Q10') === 'IFERROR(P10/E10,"")')
  check('L suit le devis en absence de surcharge', formulaOf('L10') === 'D10')
  check('L est littéral quand il y a surcharge', cellOf('L16') === 70, String(cellOf('L16')))
  check('V = U*T', formulaOf('V10') === 'U10*T10')
  check('W applique le taux de TVA stocké', formulaOf('W16') === 'V16*(1+0.19)', String(formulaOf('W16')))
  check('TVA 0 : W reproduit le =V du classeur', formulaOf('W10') === 'V10*(1+0)',
    String(formulaOf('W10')))

  check('indicateur coût prévisionnel', formulaOf('G4') === 'SUM(E10:E16)', String(formulaOf('G4')))
  check('indicateur coût réel', formulaOf('G5') === 'SUM(O10:O16)', String(formulaOf('G5')))
  check('taux de respect du coût', formulaOf('I4') === 'IFERROR(G5/G4,"")')
  check('taux de respect de quantité = Σ livré / Σ prévu, PAS une moyenne',
    formulaOf('I5') === 'IFERROR(SUM(I10:I16)/SUM(C10:C16),"")', String(formulaOf('I5')))
  check('la formule I5 ne contient plus AVERAGE',
    !(formulaOf('I5') ?? '').includes('AVERAGE'), String(formulaOf('I5')))
  check('N exporté est bien un écart, pas un ratio',
    formulaOf('N10') === 'IFERROR(M10/D10,"")' && !(formulaOf('N10') ?? '').includes('L10/D10'))

  check('ligne de totaux : somme du devis', cellOf('A18') === 'Somme du devis (HTVA)',
    String(cellOf('A18')))
  check('ligne de totaux : somme facturée', cellOf('F18') === 'Somme facturée au client')
  check('ligne de totaux : somme des dépenses', cellOf('R18') === 'Somme des dépenses')
  check('les totaux somment la plage de données',
    formulaOf('B18') === 'SUM(E10:E16)' && formulaOf('S18') === 'SUM(W10:W16)')

  const emptyExport = await buildSupplyWorkbook({
    ...exportFixture, items: [], totals: computeRegister([]),
  } as unknown as SupplyRegisterRow)
  check('un registre vide s-exporte sans planter', emptyExport.byteLength > 3000)

  // ═══ 10. Import — parsing the reference workbook ══════════════════════════
  console.log('\n13. Import FOR-AC-10')

  const workbookPath = join(process.cwd(), 'FOR AC 10 Suivi approvisionnement chantier Villa Mr Somrani.xlsx')
  if (!existsSync(workbookPath)) {
    console.log('  (classeur de référence absent — section ignorée)')
  } else {
    const raw = readFileSync(workbookPath)
    const parsed = await parseSupplyWorkbook(
      raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer
    )

    check('classeur de référence analysé sans erreur bloquante',
      parsed.ok && parsed.errors.length === 0, JSON.stringify(parsed.errors))
    check('18 lignes de devis — les fusions ne créent pas de doublons',
      parsed.stats.lineCount === 18, String(parsed.stats.lineCount))
    check('23 livraisons', parsed.stats.deliveryCount === 23, String(parsed.stats.deliveryCount))
    check('8 achats', parsed.stats.purchaseCount === 8, String(parsed.stats.purchaseCount))

    const first = parsed.lines[0]
    check('la 1re ligne porte ses 6 livraisons', first.deliveries.length === 6,
      String(first.deliveries.length))
    check('la 1re ligne porte ses 6 achats', first.purchases.length === 6,
      String(first.purchases.length))
    check('quantité prévue lue', first.plannedQuantity === 120)
    check('prix unitaire lu', first.plannedUnitPriceHtva === 55)
    check('L = D n-est pas enregistré comme une surcharge', first.actualUnitPriceHtva === null)
    check('dates normalisées en ISO', first.deliveries[0].deliveryDate === '2025-10-22',
      String(first.deliveries[0].deliveryDate))
    check('N° de BL conservé tel quel', first.deliveries[0].blNumber === '****')

    const carissaLine = parsed.lines.find((l) => l.designation.startsWith('Carissa'))!
    check('N° de BL alphanumérique conservé',
      carissaLine.deliveries[0].blNumber === 'M0118094', String(carissaLine.deliveries[0].blNumber))
    check('quantité prévue nulle importée telle quelle', carissaLine.plannedQuantity === 0)
    check('remise saisie en formule lue via son résultat',
      carissaLine.purchases[0].unitPriceHtva === 24.5, String(carissaLine.purchases[0].unitPriceHtva))

    const fougere = parsed.lines.filter((l) => l.designation.startsWith('Fougère'))
    check('les deux Fougère restent des lignes distinctes', fougere.length === 2)
    check('la Fougère Pot 24 reçoit ses 2 livraisons',
      fougere.find((f) => f.norme === 'Pot 24')!.deliveries.length === 2)

    const noMeta = parsed.lines.find((l) => l.designation === 'Amendement minéral')!
    check('livraison sans date ni fournisseur acceptée',
      noMeta.deliveries.length === 1 && noMeta.deliveries[0].deliveryDate === null &&
      noMeta.deliveries[0].supplierName === null, JSON.stringify(noMeta.deliveries))
    check('quantité décimale préservée', noMeta.deliveries[0].quantity === 0.3)

    const undelivered = parsed.lines.find((l) => l.designation.startsWith('Installation'))!
    check('ligne sans livraison importée sans enfant', undelivered.deliveries.length === 0)

    check('les fournisseurs connus sont liés au registre FOR-AC-11',
      parsed.stats.matchedSuppliers === 10, String(parsed.stats.matchedSuppliers))
    check('les fournisseurs inconnus restent en texte libre',
      parsed.stats.unmatchedSupplierNames.length === 4,
      parsed.stats.unmatchedSupplierNames.join(', '))
    check('LES PEP DE CARTHAGE n-est PAS assimilé à LES PEPINIERES DE CARTHAGE',
      parsed.stats.unmatchedSupplierNames.includes('LES PEP DE CARTHAGE'))
    check('un fournisseur non apparié n-a pas d-identifiant',
      parsed.lines.every((l) =>
        [...l.deliveries, ...l.purchases].every((c) => c.supplierMatched || c.supplierId === null)))
    check('les fournisseurs non appariés sont signalés',
      parsed.warnings.some((w) => w.message.includes('FOR-AC-11')))

    check('réf. projet du classeur extraite',
      parsed.workbookProjectReference === 'RE--075/24', String(parsed.workbookProjectReference))
    check('elle ne suit PAS le format de références de l-application',
      !/^SOPAT-\d{4}-\d{3}$/.test(parsed.workbookProjectReference ?? ''))
    check('nom du projet du classeur extrait',
      parsed.workbookProjectName === 'Aménagement paysager villa', String(parsed.workbookProjectName))
    check('client du classeur extrait',
      parsed.workbookClientName === 'Mr Mohamed Salah Somrani', String(parsed.workbookClientName))

    const importedTotals = computeRegister(parsed.lines.map((l) => computeItem({
      plannedQuantity: l.plannedQuantity,
      plannedUnitPriceHtva: l.plannedUnitPriceHtva,
      actualUnitPriceHtva: l.actualUnitPriceHtva,
      deliveries: l.deliveries.map((d) => ({ quantity: d.quantity })),
      purchases: l.purchases.map((q) => ({
        quantity: q.quantity, unitPriceHtva: q.unitPriceHtva, vatRate: q.vatRate,
      })),
    })))
    check('coût prévisionnel importé = G4 du classeur (50 513,860)',
      near(importedTotals.plannedTotalHtva, 50513.86), String(importedTotals.plannedTotalHtva))
    check('somme des dépenses importée = S36 du classeur (4 942,500)',
      near(importedTotals.purchaseTotalHtva, 4942.5), String(importedTotals.purchaseTotalHtva))
    check('coût réel = 49 725, soit G5 (48 600) + les 1 125 omis par le bug O29',
      near(importedTotals.actualTotalHtva, 49725), String(importedTotals.actualTotalHtva))
    check('taux de quantité calculable là où le classeur affiche #DIV/0!',
      importedTotals.quantityComplianceRate !== null)

    check('la TVA n-est jamais déduite du classeur : tous les taux à 0',
      parsed.lines.every((l) => l.purchases.every((q) => q.vatRate === 0)))
    check('aucun achat importé n-est rattaché à un bon de commande',
      parsed.lines.every((l) => l.purchases.every((q) =>
        (q as { purchaseOrderId?: string | null }).purchaseOrderId == null)))

    const asPayload = supplyItemsSchema.safeParse({ items: parsed.lines.map(toInputRow) })
    check('le résultat de l-analyse satisfait le schéma d-écriture', asPayload.success,
      asPayload.success ? '' : JSON.stringify(asPayload.error.flatten()))

    const notAWorkbook = await parseSupplyWorkbook(
      new TextEncoder().encode('ceci nest pas un xlsx').buffer as ArrayBuffer)
    check('un fichier qui n-est pas un classeur est refusé', !notAWorkbook.ok)
    check('le refus est explicite', notAWorkbook.errors.some((e) => /illisible/i.test(e.message)),
      JSON.stringify(notAWorkbook.errors))

    const blankWb = new ExcelJS.Workbook()
    blankWb.addWorksheet('vide').getCell('A1').value = 'rien à voir'
    const blankBytes = await blankWb.xlsx.writeBuffer()
    const blank = await parseSupplyWorkbook(blankBytes as ArrayBuffer)
    check('un classeur sans colonne Désignation est refusé', !blank.ok)
    check('le refus nomme la colonne manquante',
      blank.errors.some((e) => /Désignation/i.test(e.message)), JSON.stringify(blank.errors))

    check('l-analyse n-écrit rien : aucun registre créé',
      (await count('supply_registers')) === before.registers)
    check('l-analyse ne crée aucun fournisseur', (await count('suppliers')) === before.suppliers)
  }

  // ═══ 11. Nothing pre-existing moved ══════════════════════════
  console.log('\n15. Données existantes inchangées')
  const after = {
    projects: await count('projects'),
    clients: await count('clients'),
    suppliers: await count('suppliers'),
    purchaseOrders: await count('purchase_orders'),
    deliveryNotes: await count('delivery_notes'),
    extraExpenses: await count('extra_expenses'),
    nonConformances: await count('non_conformances'),
    correctiveActions: await count('corrective_actions'),
    auditProgramItems: await count('audit_program_items'),
    registers: await count('supply_registers'),
    items: await count('supply_items'),
    deliveries: await count('supply_deliveries'),
    purchases: await count('supply_purchases'),
  }
  for (const key of Object.keys(before) as (keyof typeof before)[]) {
    check(`${key} : ${before[key]} → ${after[key]}`, before[key] === after[key])
  }

  console.log(`\n${passed} réussis, ${failed} échoués`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
