/**
 * LIS-MI-01 — « Liste des Informations Documentées Internes ».
 *
 * Ce test existe pour qu'un bug précis ne puisse pas revenir.
 *
 * Le bug
 * ------
 * `attachDmsCode()` était appelée dans huit chemins de création ERP. À chaque
 * client, projet, fournisseur, bon de commande, NC, CAPA, audit ou programme
 * créé, elle INSÉRAIT une ligne dans `dms_documents`. Le registre a atteint
 * 714 lignes dont 485 n'étaient que des transactions — d'où des entrées comme
 * « FOR-AC-12 — Phoenix dactylifera T60 — 3 unités » : une ligne d'achat
 * promue au rang de formulaire maîtrisé.
 *
 * La règle vérifiée ici
 * ---------------------
 * Créer un enregistrement ERP NE DOIT JAMAIS créer d'entrée LIS-MI-01. Le
 * registre ne grossit que de deux façons : la création explicite d'une
 * définition maîtrisée (QMS → Informations documentées → « Nouveau document »)
 * et l'import du registre source.
 *
 * La distinction sous-jacente :
 *   DÉFINITION MAÎTRISÉE  FOR-AC-03 « Bon de commande »   → LIS-MI-01
 *   INSTANCE              BC-2026-001, BC-2026-002, …     → l'ERP, qui
 *                                                            RÉFÉRENCE FOR-AC-03
 *
 * Le test écrit réellement en base : il exige donc une branche isolée.
 *   TEST_DATABASE_URL="postgres://…" npx tsx --env-file=.env \
 *     scripts/verify-lismi01-registry.ts
 *
 * Tout ce qu'il crée est supprimé à la fin, et la dernière section prouve que
 * les compteurs sont revenus à leur valeur d'ouverture.
 */
import { selectTestTarget } from './lib/test-target'

// Doit précéder la première opération base : `db` est un Proxy paresseux qui
// résout DATABASE_URL au premier usage, pas à l'import.
const target = selectTestTarget(true)
console.log(`Cible : ${target.label}\n`)

import { db } from '../db/index'
import {
  auditLogs,
  auditPrograms,
  clients,
  correctiveActions,
  dmsDocumentLinks,
  dmsDocuments,
  nonConformances,
  commercialOffers,
  offerLineItems,
  projectPhases,
  projects,
  purchaseOrders,
  suppliers,
  users,
} from '../db/schema'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { createClient } from '../src/lib/db/clients'
import { createProject } from '../src/lib/db/projects'
import { createSupplier } from '../src/lib/db/suppliers'
import { createPurchaseOrder } from '../src/lib/db/realisation'
import { createAudit, createAuditProgram, createCapa, createNc } from '../src/lib/db/iso'
import { createBordereauLine } from '../src/lib/db/bordereau'
import { createDmsDocument } from '../src/lib/dms/queries'
import { CONTROLLED_DOCUMENT_BY_ENTITY } from '../src/lib/dms/attach'

let passed = 0
let failed = 0
function check(label: string, ok: boolean, detail?: string) {
  if (ok) { passed++; console.log(`  ✓ ${label}`) }
  else    { failed++; console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`) }
}
function section(title: string) { console.log(`\n${title}`) }

/** Le seul compteur qui fait foi : les lignes vivantes du registre. */
async function registryCount(): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(dmsDocuments)
    .where(isNull(dmsDocuments.deletedAt))
  return Number(n)
}

/** Un suffixe unique par exécution, pour ne jamais heurter une donnée existante. */
const RUN = Date.now().toString(36).toUpperCase().slice(-6)

async function main() {
  const [actor] = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).limit(1)
  if (!actor) throw new Error('Aucun utilisateur en base — impossible de créer quoi que ce soit.')

  const created = {
    clients:   [] as string[],
    projects:  [] as string[],
    suppliers: [] as string[],
    orders:    [] as string[],
    ncs:       [] as string[],
    capas:     [] as string[],
    audits:    [] as string[],
    programs:  [] as string[],
    lines:     [] as string[],
    dmsDocs:   [] as string[],
  }

  // ═══ 1. Point de départ ══════════════════════════════════════════════════
  section('1. Point de départ')
  const X = await registryCount()
  console.log(`  LIS-MI-01 à l'ouverture : ${X} documents`)
  check('le registre est non vide (sinon le test ne prouverait rien)', X > 0)

  // ═══ 2. Une création de chaque type ne change RIEN ═══════════════════════
  section('2. Créer un enregistrement ERP ne crée aucune entrée LIS-MI-01')

  const clientId = await createClient({
    companyName: `Client régression ${RUN}`,
    displayName: `Client régression ${RUN}`,
    clientType:  'prive',
    createdBy:   actor.id,
  })
  created.clients.push(clientId)
  check(`création d'un client → registre inchangé (${X})`, await registryCount() === X)

  const project = await createProject({
    name:        `Projet régression ${RUN}`,
    clientName:  `Client régression ${RUN}`,
    siteAddress: 'Adresse de test',
    projectType: 'residentiel',
    clientId,
    createdBy:   actor.id,
  })
  created.projects.push(project.id)
  check(`création d'un projet → registre inchangé (${X})`, await registryCount() === X)

  const supplier = await createSupplier({
    name:      `Fournisseur régression ${RUN}`,
    category:  'pepiniere',
    isoStatus: 'en_evaluation',
    createdBy: actor.id,
  })
  created.suppliers.push(supplier.id)
  check(`création d'un fournisseur → registre inchangé (${X})`, await registryCount() === X)

  const order = await createPurchaseOrder({
    projectId:         project.id,
    itemDescription:   `Phoenix dactylifera T60 — 3 unités (régression ${RUN})`,
    quantityPurchased: '3',
    unitPricePaid:     '100',
    supplierId:        supplier.id,
    purchaseDate:      new Date(),
    purchasedBy:       actor.id,
    createdBy:         actor.id,
  })
  created.orders.push(order.id)
  check(`création d'un bon de commande → registre inchangé (${X})`, await registryCount() === X)

  const nc = await createNc({
    reference:   `NC-REG-${RUN}`,
    description: `Non-conformité de régression ${RUN}`,
    detectedBy:  actor.id,
    createdBy:   actor.id,
  })
  created.ncs.push(nc.id)
  check(`création d'une NC → registre inchangé (${X})`, await registryCount() === X)

  const capa = await createCapa({
    ncId:              nc.id,
    actionDescription: `Action corrective de régression ${RUN}`,
    createdBy:         actor.id,
  })
  created.capas.push(capa.id)
  check(`création d'une CAPA → registre inchangé (${X})`, await registryCount() === X)

  const audit = await createAudit({
    reference:      `AUD-REG-${RUN}`,
    auditorId:      actor.id,
    auditDate:      new Date(),
    processAudited: 'MI',
    status:         'scheduled',
    createdBy:      actor.id,
  })
  created.audits.push(audit.id)
  check(`création d'un audit → registre inchangé (${X})`, await registryCount() === X)

  const program = await createAuditProgram({
    dept:      'MI',
    title:     `Programme de régression ${RUN}`,
    createdBy: actor.id,
  })
  created.programs.push(program.id)
  check(`création d'un programme d'audit → registre inchangé (${X})`, await registryCount() === X)

  // ═══ 3. Le volume ne change rien non plus ════════════════════════════════
  section('3. Dix bons de commande et dix lignes de bordereau, registre inchangé')

  for (let i = 0; i < 10; i++) {
    const o = await createPurchaseOrder({
      projectId:         project.id,
      itemDescription:   `Olea europaea lot ${i} (régression ${RUN})`,
      quantityPurchased: '1',
      unitPricePaid:     '50',
      purchaseDate:      new Date(),
      purchasedBy:       actor.id,
      createdBy:         actor.id,
    })
    created.orders.push(o.id)
  }
  check(`10 bons de commande → registre inchangé (${X})`, await registryCount() === X)

  const [offer] = await db.select({ id: commercialOffers.id }).from(commercialOffers).limit(1)
  if (offer) {
    for (let i = 0; i < 10; i++) {
      const res = await createBordereauLine(
        offer.id,
        { lineType: 'item', designation: `Ligne régression ${RUN}-${i}`, quantity: 1, unitPrice: 10 },
        actor.id,
        { userId: actor.id, name: actor.name, email: actor.email, role: actor.role },
      )
      if (res.success && 'line' in res && res.line) created.lines.push((res.line as { id: string }).id)
    }
    check(`10 lignes de bordereau (FOR-CO-02) → registre inchangé (${X})`, await registryCount() === X)
  } else {
    console.log('  — aucune offre en base, section bordereau ignorée')
  }

  // ═══ 4. La seule voie d'entrée légitime ══════════════════════════════════
  section('4. Une définition maîtrisée explicite, elle, entre au registre')

  const doc = await createDmsDocument({
    documentNumber: `FOR-XX-${RUN}`,
    title:          `Formulaire maîtrisé de régression ${RUN}`,
    category:       'formulaire',
    department:     'qualite',
    ownerId:        actor.id,
    authorId:       actor.id,
    createdBy:      actor.id,
  })
  created.dmsDocs.push(doc.id)
  check(`création QMS explicite → registre à ${X + 1}`, await registryCount() === X + 1)

  // ═══ 5. Les instances RÉFÉRENCENT la définition, sans la dupliquer ═══════
  section('5. Les enregistrements référencent leur définition maîtrisée')

  const [po] = await db
    .select({ code: purchaseOrders.dmsDocumentCode })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, order.id))
  check(
    `le bon de commande porte ${CONTROLLED_DOCUMENT_BY_ENTITY.purchase_order}, pas un code neuf`,
    po?.code === CONTROLLED_DOCUMENT_BY_ENTITY.purchase_order,
    `observé : ${po?.code ?? 'null'}`,
  )

  const [{ shared }] = await db
    .select({ shared: sql<number>`count(*)` })
    .from(dmsDocumentLinks)
    .innerJoin(dmsDocuments, eq(dmsDocuments.id, dmsDocumentLinks.documentId))
    .where(and(
      eq(dmsDocuments.documentNumber, CONTROLLED_DOCUMENT_BY_ENTITY.purchase_order),
      eq(dmsDocumentLinks.linkRole, 'instance'),
    ))
  check(
    `les instances se partagent une seule définition (${Number(shared)} liens vers FOR-AC-03)`,
    Number(shared) >= created.orders.length,
  )

  // Les données de référence ne référencent rien : aucun formulaire ne les produit.
  const [cli] = await db.select({ code: clients.dmsDocumentCode }).from(clients).where(eq(clients.id, clientId))
  check('un client ne porte aucun code documentaire', cli?.code == null, `observé : ${cli?.code}`)
  const [prj] = await db.select({ code: projects.dmsDocumentCode }).from(projects).where(eq(projects.id, project.id))
  check('un projet ne porte aucun code documentaire', prj?.code == null, `observé : ${prj?.code}`)
  const [sup] = await db.select({ code: suppliers.dmsDocumentCode }).from(suppliers).where(eq(suppliers.id, supplier.id))
  check('un fournisseur ne porte aucun code documentaire', sup?.code == null, `observé : ${sup?.code}`)

  // ═══ 6. Aucune ligne du registre n'est un enregistrement ERP ═════════════
  section('6. Le registre ne contient plus aucun enregistrement ERP')

  const [{ leftovers }] = await db
    .select({ leftovers: sql<number>`count(DISTINCT ${dmsDocuments.id})` })
    .from(dmsDocuments)
    .innerJoin(dmsDocumentLinks, and(
      eq(dmsDocumentLinks.documentId, dmsDocuments.id),
      eq(dmsDocumentLinks.linkRole, 'origin'),
    ))
    .where(isNull(dmsDocuments.deletedAt))
  check(
    'aucun document vivant n\'est rattaché en « origin » à une entité ERP',
    Number(leftovers) === 0,
    `${Number(leftovers)} subsistant(s)`,
  )

  // ═══ 7. Nettoyage et retour à l'état initial ═════════════════════════════
  section('7. Nettoyage')

  if (created.lines.length)    await db.delete(offerLineItems).where(inArray(offerLineItems.id, created.lines))
  if (created.dmsDocs.length)  await db.delete(dmsDocuments).where(inArray(dmsDocuments.id, created.dmsDocs))
  if (created.capas.length)    await db.delete(correctiveActions).where(inArray(correctiveActions.id, created.capas))
  if (created.ncs.length)      await db.delete(nonConformances).where(inArray(nonConformances.id, created.ncs))
  if (created.programs.length) await db.delete(auditPrograms).where(inArray(auditPrograms.id, created.programs))
  if (created.audits.length)   await db.delete(auditLogs).where(inArray(auditLogs.id, created.audits))
  if (created.orders.length)   await db.delete(purchaseOrders).where(inArray(purchaseOrders.id, created.orders))
  if (created.suppliers.length) await db.delete(suppliers).where(inArray(suppliers.id, created.suppliers))
  if (created.projects.length) {
    // La phase « etudes » est créée par createProject dans la même transaction.
    await db.delete(projectPhases).where(inArray(projectPhases.projectId, created.projects))
    await db.delete(projects).where(inArray(projects.id, created.projects))
  }
  if (created.clients.length)  await db.delete(clients).where(inArray(clients.id, created.clients))

  // Les liens 'instance' posés au passage pointent sur des entités disparues.
  const entityIds = [...created.orders, ...created.ncs, ...created.capas, ...created.audits, ...created.programs]
  if (entityIds.length) await db.delete(dmsDocumentLinks).where(inArray(dmsDocumentLinks.entityId, entityIds))

  const finalCount = await registryCount()
  check(`le registre est revenu à ${X}`, finalCount === X, `observé : ${finalCount}`)

  console.log(`\n${passed} réussis, ${failed} échoués`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
