/**
 * The mobile API's project consumption must equal the canonical rule.
 *
 * `/api/mobile/projects` and `/api/mobile/expenses` each summed the bons de
 * commande and the approved extra expenses on their own, without the FOR-AC-10
 * term, so a chef could read a lower percentage on their phone than the same
 * chantier showed in the back-office. Both now call `src/lib/db/project-spend.ts`.
 *
 * The route HANDLERS are invoked here, not just the helper: a real signed
 * mobile token, a real NextRequest, and the parsed JSON body are compared
 * against `getProjectSpend`, `getProjectAchats` (project page) and
 * `getAtRiskProjects` (dashboard) for the same project.
 *
 * The fixture is built under an EXISTING project — no project, client or
 * supplier is created — and every record is removed afterwards, with the
 * opening counts and the project's own consumption asserted restored. No
 * reference sequence is allocated.
 */
// FIRST import, before anything can load `next/cache`: Next picks its async
// storage implementation at module load and needs globalThis.AsyncLocalStorage.
import './lib/enable-async-local-storage'
import { selectTestTarget } from './lib/test-target'

// Must run before the first database operation: `db` is a lazy Proxy that
// resolves DATABASE_URL on first use, not on import.
const target = selectTestTarget(false)
console.log(`Cible : ${target.label}\n`)

import { NextRequest } from 'next/server'
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
import { and, eq, isNull, sql, asc, isNotNull } from 'drizzle-orm'
import { getProjectSpend, spendPercent } from '../src/lib/db/project-spend'
import { getProjectAchats } from '../src/lib/db/achat'
import { getAtRiskProjects } from '../src/lib/db/dashboard'
import { ensureSupplyRegister, replaceSupplyItems } from '../src/lib/db/supply'
import { signMobileToken } from '../src/lib/mobile-auth'
import { GET as mobileProjectsGET } from '../src/app/api/mobile/projects/route'
import { POST as mobileExpensesPOST } from '../src/app/api/mobile/expenses/route'
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

type MobileProject = {
  id: string
  reference: string
  name: string
  currency: string
  status: string
  approvedBudget: number | null
  spent: number
  pendingTotal: number
  percentSpent: number | null
}

/**
 * Runs a route handler inside a minimal Next work store.
 *
 * `/api/mobile/expenses` calls `revalidatePath`, which throws
 * « static generation store missing » when there is no request scope. That is
 * an artefact of invoking the handler from a script, not a defect in the
 * route, so the harness supplies the store instead of the route being changed
 * to suit the test. Only `incrementalCache` and `route` are read on this path;
 * the revalidation itself becomes a no-op push onto `pendingRevalidatedTags`.
 */
async function withWorkStore<T>(route: string, fn: () => Promise<T>): Promise<T> {
  const { workAsyncStorage } = await import(
    'next/dist/server/app-render/work-async-storage.external.js'
  ) as { workAsyncStorage: { run: <R>(store: unknown, cb: () => R) => R } }
  return workAsyncStorage.run(
    { route, incrementalCache: {}, pendingRevalidatedTags: [] },
    fn,
  )
}

/** Calls the real GET handler with a real signed token. */
async function callMobileProjects(token: string) {
  const req = new NextRequest('http://localhost/api/mobile/projects', {
    headers: { authorization: `Bearer ${token}` },
  })
  const res = await mobileProjectsGET(req)
  return { status: res.status, body: (await res.json()) as { projects: MobileProject[] } }
}

async function main() {
  const before = {
    projects: await count('projects'),
    suppliers: await count('suppliers'),
    purchaseOrders: await count('purchase_orders'),
    extraExpenses: await count('extra_expenses'),
    supplyRegisters: await count('supply_registers'),
    supplyItems: await count('supply_items'),
    supplyPurchases: await count('supply_purchases'),
    nonConformances: await count('non_conformances'),
  }

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users).where(eq(users.role, 'admin')).limit(1)

  // The mobile project list only returns active chantiers, so the fixture must
  // sit on one or the handler would legitimately not report it.
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

  if (!user || !project) {
    console.log('  (aucun projet actif ou administrateur — suite ignorée)')
    console.log(`\n${passed} réussis, ${failed} échoués`)
    process.exit(failed === 0 ? 0 : 1)
  }

  const actor: AuditActor = { userId: user.id, name: user.name, email: user.email, role: user.role }
  const token = await signMobileToken({
    userId: user.id, role: user.role, email: user.email, name: user.name,
  })

  const baseline = await getProjectSpend(project.id)
  console.log(`Projet ${project.reference} — consommation de départ ${baseline.spent}\n`)

  const poIds: string[] = []
  const expenseIds: string[] = []
  let registerId: string | null = null

  const findInMobile = async () => {
    const { status, body } = await callMobileProjects(token)
    return { status, row: body.projects.find((p) => p.id === project.id) ?? null, body }
  }

  // ═══ 1. Authentication is unchanged ═════════════════════════════════════
  console.log('1. Authentification (comportement préservé)')
  const noAuth = await mobileProjectsGET(
    new NextRequest('http://localhost/api/mobile/projects'))
  check('sans jeton → 401', noAuth.status === 401, String(noAuth.status))
  const badAuth = await mobileProjectsGET(
    new NextRequest('http://localhost/api/mobile/projects',
      { headers: { authorization: 'Bearer nimportequoi' } }))
  check('jeton invalide → 401', badAuth.status === 401, String(badAuth.status))
  const entretienToken = await signMobileToken({
    userId: user.id, role: 'entretien_chef', email: user.email, name: user.name,
  })
  const wrongRole = await mobileProjectsGET(
    new NextRequest('http://localhost/api/mobile/projects',
      { headers: { authorization: `Bearer ${entretienToken}` } }))
  check('rôle non autorisé → 403', wrongRole.status === 403, String(wrongRole.status))

  // ═══ 2. Response shape ══════════════════════════════════════════════════
  console.log('\n2. Forme de la réponse (inchangée)')
  const first = await findInMobile()
  check('jeton valide → 200', first.status === 200, String(first.status))
  check('la réponse contient un tableau « projects »', Array.isArray(first.body.projects))
  check('le projet de test y figure', first.row !== null)
  if (first.row) {
    const keys = Object.keys(first.row).sort().join(',')
    check('champs exactement identiques à avant le correctif',
      keys === 'approvedBudget,currency,id,name,pendingTotal,percentSpent,reference,spent,status',
      keys)
    check('spent est un nombre', typeof first.row.spent === 'number')
    check('pendingTotal est un nombre', typeof first.row.pendingTotal === 'number')
    check('percentSpent est un nombre ou null',
      first.row.percentSpent === null || typeof first.row.percentSpent === 'number')
  }

  // ═══ 3. The specified fixture ═══════════════════════════════════════════
  //   BC 1 000 · dépense approuvée 200 · en attente 500 · rejetée 300
  //   achat FOR-AC-10 non rattaché 150 TTC · rattaché 250 TTC
  //   → consommation canonique = 1 000 + 200 + 150 = 1 350
  console.log('\n3. Jeu de données de référence → 1 350')

  const [po] = await db.insert(purchaseOrders).values({
    projectId: project.id,
    itemDescription: 'TEST-MOBILE bon de commande',
    quantityPurchased: '1',
    unitPricePaid: '1000.000',
    totalCost: '1000.000',
    purchaseDate: new Date(),
    purchasedBy: user.id,
    createdBy: user.id,
  }).returning({ id: purchaseOrders.id })
  poIds.push(po.id)

  const stamp = Date.now()
  for (const [suffix, amount, status] of [
    ['A', '200.000', 'approved'],
    ['P', '500.000', 'pending'],
    ['R', '300.000', 'rejected'],
  ] as const) {
    const [row] = await db.insert(extraExpenses).values({
      reference: `TEST-MOBILE-${suffix}-${stamp}`,
      projectId: project.id,
      expenseDate: new Date().toISOString().slice(0, 10),
      description: `TEST-MOBILE ${status}`,
      amount,
      status,
      createdBy: user.id,
    }).returning({ id: extraExpenses.id })
    expenseIds.push(row.id)
  }

  registerId = await ensureSupplyRegister(project.id, user.id, actor)
  await replaceSupplyItems(registerId, [{
    designation: 'TEST-MOBILE ligne',
    plannedQuantity: 1,
    plannedUnitPriceHtva: 1,
    deliveries: [],
    purchases: [
      // Non rattaché → compté. TTC = 150.
      { quantity: 1, unitPriceHtva: 150, vatRate: 0 },
      // Rattaché au BC ci-dessus → exclu, sinon double comptage.
      { quantity: 1, unitPriceHtva: 250, vatRate: 0, purchaseOrderId: po.id },
    ],
  }], user.id, actor)

  const expected = baseline.spent + 1350
  const canonical = await getProjectSpend(project.id)
  check('la règle canonique donne 1 350 de plus',
    near(canonical.spent, expected), `${canonical.spent} vs ${expected}`)

  const withFixture = await findInMobile()
  check('mobile/projects : même consommation que la règle',
    near(withFixture.row?.spent ?? null, canonical.spent),
    `${withFixture.row?.spent} vs ${canonical.spent}`)

  // The four wrong answers the task named, each ruled out explicitly.
  for (const [label, wrong] of [
    ['1 200 — les achats FOR-AC-10 seraient ignorés', 1200],
    ['1 450 — l-achat rattaché serait compté deux fois', 1450],
    ['1 700 — la dépense en attente serait comptée', 1700],
    ['2 400 — tout serait additionné sans exclusion', 2400],
  ] as const) {
    check(`mobile/projects n-affiche PAS ${label}`,
      !near(withFixture.row?.spent ?? null, baseline.spent + wrong),
      String(withFixture.row?.spent))
  }

  check('mobile/projects : la dépense en attente sort à part (500)',
    near(withFixture.row?.pendingTotal ?? null, baseline.pendingTotal + 500),
    String(withFixture.row?.pendingTotal))

  const approvedBudget = project.approvedBudget ? parseFloat(project.approvedBudget) : null
  check('mobile/projects : pourcentage identique à la règle',
    near(withFixture.row?.percentSpent ?? null, spendPercent(canonical.spent, approvedBudget)),
    `${withFixture.row?.percentSpent} vs ${spendPercent(canonical.spent, approvedBudget)}`)

  // ═══ 4. Agreement with the other consumers ══════════════════════════════
  console.log('\n4. Concordance avec les autres écrans')
  const achats = await getProjectAchats(project.id)
  check('fiche projet = mobile',
    near(achats.budget.spent, withFixture.row?.spent ?? null),
    `${achats.budget.spent} vs ${withFixture.row?.spent}`)
  check('fiche projet : même montant en attente',
    near(achats.budget.pendingTotal, withFixture.row?.pendingTotal ?? null))
  check('fiche projet : même pourcentage',
    near(achats.budget.percentSpent, withFixture.row?.percentSpent ?? null))

  const atRisk = await getAtRiskProjects()
  const dashRow = atRisk.find((r) => r.id === project.id)
  if (dashRow) {
    check('tableau de bord = mobile',
      near(parseFloat(dashRow.totalSpent ?? '0'), withFixture.row?.spent ?? null),
      `${dashRow.totalSpent} vs ${withFixture.row?.spent}`)
    check('tableau de bord : même pourcentage',
      near(dashRow.spendPct, withFixture.row?.percentSpent ?? null))
  } else {
    console.log('  (ce projet n-est pas « à risque » — comparaison ignorée)')
    check('le widget « à risque » répond sans erreur', Array.isArray(atRisk))
  }

  // ═══ 5. Term-by-term exclusions, through the route ══════════════════════
  console.log('\n5. Exclusions, vérifiées via la route')

  // (a) aucun achat FOR-AC-10
  await replaceSupplyItems(registerId, [{
    designation: 'TEST-MOBILE ligne',
    plannedQuantity: 1, plannedUnitPriceHtva: 1,
    deliveries: [], purchases: [],
  }], user.id, actor)
  let step = await findInMobile()
  check('(a) sans achat FOR-AC-10 → 1 200 (BC + dépense approuvée)',
    near(step.row?.spent ?? null, baseline.spent + 1200), String(step.row?.spent))

  // (b) uniquement des achats FOR-AC-10, non rattachés
  await db.delete(purchaseOrders).where(eq(purchaseOrders.id, po.id))
  poIds.length = 0
  for (const id of expenseIds) await db.delete(extraExpenses).where(eq(extraExpenses.id, id))
  expenseIds.length = 0
  await replaceSupplyItems(registerId, [{
    designation: 'TEST-MOBILE ligne',
    plannedQuantity: 1, plannedUnitPriceHtva: 1,
    deliveries: [],
    purchases: [{ quantity: 1, unitPriceHtva: 150, vatRate: 0 }],
  }], user.id, actor)
  step = await findInMobile()
  check('(b) uniquement FOR-AC-10 → 150',
    near(step.row?.spent ?? null, baseline.spent + 150), String(step.row?.spent))
  check('(b) rien en attente', near(step.row?.pendingTotal ?? null, baseline.pendingTotal))

  // (c) registre supprimé → sa contribution disparaît
  await db.update(supplyRegisters)
    .set({ deletedAt: new Date() })
    .where(eq(supplyRegisters.id, registerId))
  step = await findInMobile()
  check('(c) registre supprimé → contribution nulle',
    near(step.row?.spent ?? null, baseline.spent), String(step.row?.spent))
  await db.update(supplyRegisters)
    .set({ deletedAt: null })
    .where(eq(supplyRegisters.id, registerId))

  // (d) achat rattaché seul → exclu
  await replaceSupplyItems(registerId, [{
    designation: 'TEST-MOBILE ligne',
    plannedQuantity: 1, plannedUnitPriceHtva: 1,
    deliveries: [],
    purchases: [{ quantity: 1, unitPriceHtva: 999, vatRate: 0, purchaseOrderId: null }],
  }], user.id, actor)
  const [po2] = await db.insert(purchaseOrders).values({
    projectId: project.id,
    itemDescription: 'TEST-MOBILE BC de rattachement',
    quantityPurchased: '1',
    unitPricePaid: '999.000',
    totalCost: '999.000',
    purchaseDate: new Date(),
    purchasedBy: user.id,
    createdBy: user.id,
  }).returning({ id: purchaseOrders.id })
  poIds.push(po2.id)
  await replaceSupplyItems(registerId, [{
    designation: 'TEST-MOBILE ligne',
    plannedQuantity: 1, plannedUnitPriceHtva: 1,
    deliveries: [],
    purchases: [{ quantity: 1, unitPriceHtva: 999, vatRate: 0, purchaseOrderId: po2.id }],
  }], user.id, actor)
  step = await findInMobile()
  check('(d) achat rattaché → compté une seule fois, via le BC',
    near(step.row?.spent ?? null, baseline.spent + 999), String(step.row?.spent))
  check('(d) et pas deux fois',
    !near(step.row?.spent ?? null, baseline.spent + 1998), String(step.row?.spent))

  // ═══ 6. Batch: every project agrees with the rule ═══════════════════════
  console.log('\n6. Lot complet : chaque projet suit la règle')
  const all = await callMobileProjects(token)
  check('la route renvoie au moins un projet', all.body.projects.length > 0)
  let mismatches = 0
  for (const row of all.body.projects) {
    const canon = await getProjectSpend(row.id)
    if (!near(row.spent, canon.spent) || !near(row.pendingTotal, canon.pendingTotal)) mismatches++
  }
  check(`les ${all.body.projects.length} projets renvoyés suivent tous la règle canonique`,
    mismatches === 0, `${mismatches} écart(s)`)
  check('aucun projet n-a de pourcentage infini ou NaN',
    all.body.projects.every((p) =>
      p.percentSpent === null || Number.isFinite(p.percentSpent)))
  check('un projet sans budget approuvé a percentSpent = null',
    all.body.projects.every((p) => p.approvedBudget !== null || p.percentSpent === null))

  // ═══ 6b. /api/mobile/expenses — the budget block it returns ═════════════
  console.log('\n6b. mobile/expenses : bloc budget renvoyé après création')

  // Reset to the reference fixture so the expected figure is unambiguous.
  await replaceSupplyItems(registerId, [{
    designation: 'TEST-MOBILE ligne',
    plannedQuantity: 1, plannedUnitPriceHtva: 1,
    deliveries: [],
    purchases: [
      { quantity: 1, unitPriceHtva: 150, vatRate: 0 },
      { quantity: 1, unitPriceHtva: 250, vatRate: 0, purchaseOrderId: po2.id },
    ],
  }], user.id, actor)

  const expensesBefore = await count('extra_expenses')
  const expenseReq = new NextRequest('http://localhost/api/mobile/expenses', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      projectId: project.id,
      expenseDate: new Date().toISOString().slice(0, 10),
      description: 'TEST-MOBILE dépense créée par le test',
      amount: '77.000',
      currency: 'TND',
    }),
  })

  let expenseRes: Response | null = null
  try {
    expenseRes = await withWorkStore('/api/mobile/expenses',
      () => mobileExpensesPOST(expenseReq))
  } catch (e) {
    check('mobile/expenses : le gestionnaire s-exécute', false, (e as Error).message.slice(0, 120))
  }

  if (expenseRes) {
    const created = await expenseRes.json() as {
      success?: boolean
      id?: string
      reference?: string
      status?: string
      budget?: {
        approvedBudget: number | null
        spent: number
        pendingTotal: number
        percentSpent: number | null
      } | null
    }
    check('mobile/expenses : 201', expenseRes.status === 201, String(expenseRes.status))
    check('mobile/expenses : forme de réponse préservée',
      created.success === true && typeof created.id === 'string' &&
      typeof created.reference === 'string' && created.status === 'pending',
      JSON.stringify({ ...created, budget: undefined }))

    const budgetKeys = Object.keys(created.budget ?? {}).sort().join(',')
    check('mobile/expenses : champs du bloc budget inchangés',
      budgetKeys === 'approvedBudget,pendingTotal,percentSpent,spent', budgetKeys)

    const canonAfter = await getProjectSpend(project.id)
    check('mobile/expenses : spent = règle canonique',
      near(created.budget?.spent ?? null, canonAfter.spent),
      `${created.budget?.spent} vs ${canonAfter.spent}`)
    check('mobile/expenses : la dépense créée reste « pending » et ne bouge pas spent',
      near(created.budget?.spent ?? null, baseline.spent + 999 + 150),
      String(created.budget?.spent))
    check('mobile/expenses : elle apparaît dans pendingTotal',
      near(created.budget?.pendingTotal ?? null, canonAfter.pendingTotal),
      `${created.budget?.pendingTotal} vs ${canonAfter.pendingTotal}`)
    check('mobile/expenses : pourcentage identique à la règle',
      near(created.budget?.percentSpent ?? null,
        spendPercent(canonAfter.spent, approvedBudget)))

    const mobileRow = await findInMobile()
    check('mobile/expenses et mobile/projects renvoient le même spent',
      near(created.budget?.spent ?? null, mobileRow.row?.spent ?? null),
      `${created.budget?.spent} vs ${mobileRow.row?.spent}`)

    if (created.id) expenseIds.push(created.id)
    check('une seule dépense a été créée',
      (await count('extra_expenses')) === expensesBefore + 1)
  }

  // ═══ 7. Cleanup ═════════════════════════════════════════════════════════
  console.log('\n7. Nettoyage et restauration')
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
  // Filet de sécurité : la route insère avant de revalider, donc une dépense
  // peut exister même si le gestionnaire a échoué après l-insertion.
  await db.execute(sql`DELETE FROM extra_expenses WHERE description LIKE 'TEST-MOBILE%'`)
  await db.execute(sql`DELETE FROM purchase_orders WHERE item_description LIKE 'TEST-MOBILE%'`)

  const restored = await getProjectSpend(project.id)
  check('la consommation revient à son point de départ',
    near(restored.spent, baseline.spent), `${restored.spent} vs ${baseline.spent}`)

  const finalRow = await findInMobile()
  check('mobile/projects revient lui aussi au point de départ',
    near(finalRow.row?.spent ?? null, baseline.spent), String(finalRow.row?.spent))

  // ═══ 8. Nothing pre-existing moved ══════════════════════════════════════
  console.log('\n8. Données existantes inchangées')
  const after = {
    projects: await count('projects'),
    suppliers: await count('suppliers'),
    purchaseOrders: await count('purchase_orders'),
    extraExpenses: await count('extra_expenses'),
    supplyRegisters: await count('supply_registers'),
    supplyItems: await count('supply_items'),
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
