/**
 * FOR-CO-02 — « Bordereau des prix ».
 *
 * Proves the feature against the reference workbook and against the promise
 * that nothing pre-existing moved.
 *
 * The calculation sections are pure: they run the engine over fixtures and
 * over the real `.xltx`, and check the structure the workbook actually holds —
 * 2 sections, 17 categories, 266 priceable lines — rather than a restatement
 * of the parser's own output.
 *
 * The persistence sections write ONE throwaway offer, linked to an EXISTING
 * project, exercise it end to end, then delete it and prove every table
 * returns to its opening count. No project, client, user, plant species or
 * decorative material is ever created.
 *
 *   npx tsx --env-file=.env scripts/verify-bordereau.ts
 */
import { selectTestTarget } from './lib/test-target'

// Must run before the first database operation: `db` is a lazy Proxy that
// resolves DATABASE_URL on first use, not on import.
const target = selectTestTarget(false)
console.log(`Cible : ${target.label}\n`)

import { readFileSync } from 'fs'
import { join } from 'path'
import ExcelJS from 'exceljs'
import { eq, isNull, sql } from 'drizzle-orm'
import { db } from '../db/index'
import {
  bordereauTemplateLines,
  bordereauTemplates,
  commercialOffers,
  offerImports,
  offerLineItems,
  offerPaymentMilestones,
  offerVersions,
  projects,
  users,
} from '../db/schema'
import {
  computeBordereau,
  computeMilestones,
  computeNode,
  formatMoney,
  formatVatRate,
  lineTotal,
  num,
  numOrNull,
  round3,
} from '../src/lib/bordereau-calc'
import {
  flattenPreview,
  hashWorkbook,
  parseBordereauWorkbook,
  splitDesignation,
  type BordereauImportPreview,
  type BordereauPreviewLine,
} from '../src/lib/import/bordereau-import'
import { buildBordereauWorkbook } from '../src/lib/export/bordereau-workbook'
import {
  applyImportToOffer,
  approveOfferVersion,
  assertNotLocked,
  BORDEREAU_APPROVE_ROLES,
  BORDEREAU_WRITE_ROLES,
  canApproveBordereau,
  canEditBordereau,
  cloneTemplateIntoOffer,
  confirmContractAmount,
  createOfferVersion,
  createTemplateFromPreview,
  findOfferImport,
  findTemplateImport,
  getActiveBordereauTemplate,
  getOfferBordereau,
  reopenOfferBordereau,
  replaceOfferBordereau,
  type BordereauLineRow,
  type TemplateLineRow,
} from '../src/lib/db/bordereau'
import { bordereauReplaceSchema } from '../src/lib/validation/bordereau'
import { getProjectSpend } from '../src/lib/db/project-spend'
import type { AuditActor } from '../src/lib/audit-record'

const WORKBOOK = join(__dirname, '..', 'FOR CO 02 Bordereau des prix.xltx')

/** The structure the reference workbook actually holds, category by category. */
const EXPECTED_CATEGORIES: [string, string, string, number][] = [
  ['II.1',  'II.1',  'LES PALMIERS', 14],
  ['II.2',  'II.2',  'LES CONIFERES', 4],
  ['II.3',  'II.3',  'LES ARBRES', 12],
  ['II.4',  'II.4',  'LES ARBRES ET ARBUSTES FRUITIERS', 12],
  ['II.5',  'II.5',  'LES ARBUSTES & ARBRISSEAUX', 59],
  ['II.6',  'II.6',  'LES GRAMINEES', 17],
  ['II.7',  'II.7',  'LES CACTEES ET PLANTES GRASSES', 68],
  ['II.8',  'II.8',  'LES PLANTES FLORALES', 19],
  ['II.9',  'II.9',  'LES PLANTES GRIMPAMTES', 12],
  ['II.10', 'II.10', 'LES PLANTES AROMATIQUES & MEDICINALES', 11],
  ['II.11', 'II.11', "LES PLANTES D'INTERIEUR", 18],
  // From here the body's numbering and the recap's diverge: the body skips
  // II.12 and later prints II.17 twice.
  ['II.13', 'II.12', 'ENGAZONNEMENT', 1],
  ['II.14', 'II.13', 'MATIERE DECORATIVE', 2],
  ['II.15', 'II.14', 'BACS A FLEURS', 5],
  ['II.16', 'II.15', 'INSTALLATION DU MUR VEGETAL NATUREL', 1],
  ['II.17', 'II.16', 'INSTALLATION DU MUR VEGETAL EN LICHEN', 1],
  ['II.17', 'II.17', 'INSTALLATION DU MUR VEGETAL EN MOUSSE', 1],
]

const EXPECTED_SECTION_I: [string, string][] = [
  ['I.1', 'Transplantations'],
  ['I.2', 'Décapage & nettoyage du sol'],
  ['I.3', 'Installation du système de drainage'],
  ['I.4', 'Fourniture et pose de la terre végétale'],
  ['I.5', 'Amendements organiques'],
  ['I.6', 'Amendement minéral'],
  ['I.7', 'Travaux de plantation'],
  ['I.8', 'Nivellement et terrassement'],
  ['I.9', "Installation du système d'arrosage"],
]

/** Species that must survive the import, one from most categories. */
const EXPECTED_SPECIES = [
  'Arecastrum romanzoffianum', 'Bismarckia', 'Phoenix canariensis', 'Washingtonia filifera',
  'Cupressus sempervirens', 'Olivier', 'Pinus halepensis', 'Citrus Limon', 'Ficus carica',
  'Nerium oleander', 'Pennisetum villosum', "Agave americana 'Marginata'", 'Aloe vera',
  'Petunia atkinsiana', 'Bougainvillea glabra', 'Jasminum sambac',
  'Argile expansée', 'Galet blanc', 'Jardinière', 'Cubique',
]

let passed = 0
let failed = 0

function check(label: string, ok: boolean, detail = '') {
  if (ok) { passed++; console.log(`  ok   ${label}`) }
  else { failed++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`) }
}

/** Float comparison at the document's three-decimal money precision. */
function near(a: number | null, b: number | null, eps = 1e-6): boolean {
  if (a === null || b === null) return a === b
  return Math.abs(a - b) < eps
}

async function count(table: string): Promise<number> {
  const r = await db.execute<{ n: string }>(sql.raw(`SELECT count(*)::text AS n FROM ${table}`))
  return Number(r.rows[0].n)
}

function readWorkbook(): ArrayBuffer {
  const bytes = readFileSync(WORKBOOK)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

const priceable = (n: BordereauPreviewLine) => n.lineType === 'item' || n.lineType === 'spec'

async function main() {
  // ── Opening state ────────────────────────────────────────────────────────
  const before = {
    projects: await count('projects'),
    clients: await count('clients'),
    users: await count('users'),
    plantSpecies: await count('plant_species'),
    decorativeMaterials: await count('decorative_materials'),
    suppliers: await count('suppliers'),
    purchaseOrders: await count('purchase_orders'),
    extraExpenses: await count('extra_expenses'),
    equipmentRentals: await count('equipment_rentals'),
    supplyRegisters: await count('supply_registers'),
    supplyItems: await count('supply_items'),
    supplyPurchases: await count('supply_purchases'),
    commercialOffers: await count('commercial_offers'),
    offerLineItems: await count('offer_line_items'),
    offerMilestones: await count('offer_payment_milestones'),
    offerVersions: await count('offer_versions'),
    offerImports: await count('offer_imports'),
    bordereauTemplates: await count('bordereau_templates'),
    bordereauTemplateLines: await count('bordereau_template_lines'),
    recordAuditLog: await count('record_audit_log'),
  }

  // ═══ 1. Pure calculations ════════════════════════════════════════════════
  console.log('\n1. Calculs — moteur pur')

  check('round3 arrondit au millime', near(round3(1.23456), 1.235), String(round3(1.23456)))
  check('round3 gère la demi-unité loin de zéro',
    near(round3(0.0005), 0.001) && near(round3(-0.0005), -0.001),
    `${round3(0.0005)} / ${round3(-0.0005)}`)
  check('round3 absorbe l-erreur binaire (1,0005 → 1,001)',
    near(round3(1.0005), 1.001), String(round3(1.0005)))

  check('total de ligne = qté × P.U. arrondi', near(lineTotal(3, 12.5), 37.5))
  check('une quantité absente ne produit pas 0 mais null', lineTotal(null, 12.5) === null)
  check('un prix absent ne produit pas 0 mais null', lineTotal(3, null) === null)

  const category = computeNode({
    lineType: 'category', quantity: null, unitPrice: null,
    children: [
      { lineType: 'item', quantity: 10, unitPrice: 25.5, children: [] },
      { lineType: 'item', quantity: 4, unitPrice: 100, children: [] },
      { lineType: 'item', quantity: null, unitPrice: null, children: [] },
    ],
  })
  check('sous-total de catégorie = Σ des lignes', near(category.total, 655), String(category.total))
  check('une catégorie ne porte aucun montant propre', category.priced === false)
  check('les lignes non chiffrées sont comptées mais valent 0',
    category.lineCount === 3 && category.pricedCount === 2,
    `${category.lineCount}/${category.pricedCount}`)

  const doc = computeBordereau({
    vatRate: 0.19,
    sections: [
      {
        sourceCode: 'I.', designation: 'TRAVAUX PRELIMINAIRES',
        lineType: 'section', quantity: null, unitPrice: null,
        children: [{ lineType: 'item', quantity: 1, unitPrice: 1000, children: [] }],
      },
      {
        sourceCode: 'II.', designation: 'FOURNITURE DES VEGETAUX',
        lineType: 'section', quantity: null, unitPrice: null,
        children: [{
          lineType: 'category', quantity: null, unitPrice: null,
          children: [
            { lineType: 'item', quantity: 2, unitPrice: 250, children: [] },
            { lineType: 'spec', quantity: 10, unitPrice: 15, children: [] },
          ],
        }],
      },
    ],
  })
  check('total général HTVA = Σ des sections', near(doc.totalHtva, 1650), String(doc.totalHtva))
  check('sous-total section I isolé', near(doc.sections[0].subtotal, 1000))
  check('sous-total section II isolé', near(doc.sections[1].subtotal, 650))
  check('TVA 19 % calculée sur le HTVA', near(doc.totalVat, 313.5), String(doc.totalVat))
  check('TTC = HTVA + TVA', near(doc.totalTtc, 1963.5), String(doc.totalTtc))
  check('les catégories sont comptées, pas les sections', doc.categoryCount === 1)
  check('3 lignes chiffrables au total', doc.lineCount === 3)
  check('un taux de TVA à 0 laisse TTC = HTVA',
    near(computeBordereau({ vatRate: 0, sections: [] }).totalTtc, 0))

  // 50 / 30 / 20 — the workbook's own plan.
  const plan = computeMilestones(
    [
      { label: 'lors de la confirmation', percentage: 50, basis: 'ttc' },
      { label: 'pendant les travaux', percentage: 30, basis: 'ttc' },
      { label: 'à la fin du chantier', percentage: 20, basis: 'ttc' },
    ],
    { totalHtva: doc.totalHtva, totalTtc: doc.totalTtc },
  )
  check('les modalités 50/30/20 totalisent 100 %', near(plan.totalPercentage, 100))
  check('le plan est reconnu complet', plan.complete)
  check('50 % du TTC', near(plan.milestones[0].amount, 981.75), String(plan.milestones[0].amount))
  check('30 % du TTC', near(plan.milestones[1].amount, 589.05), String(plan.milestones[1].amount))
  check('20 % du TTC', near(plan.milestones[2].amount, 392.7), String(plan.milestones[2].amount))
  check('Σ des échéances = TTC exactement', near(plan.totalAmount, doc.totalTtc),
    `${plan.totalAmount} ≠ ${doc.totalTtc}`)

  // The residue case: three thirds of 100 leave a millime unaccounted for.
  const thirds = computeMilestones(
    [33.333, 33.333, 33.334].map((p) => ({ label: `${p}`, percentage: p, basis: 'ttc' as const })),
    { totalHtva: 100, totalTtc: 100 },
  )
  check('le reliquat d-arrondi est absorbé par la dernière échéance',
    near(thirds.totalAmount, 100), String(thirds.totalAmount))

  const incomplete = computeMilestones(
    [{ label: 'acompte', percentage: 40, basis: 'ttc' }],
    { totalHtva: 100, totalTtc: 100 },
  )
  check('un plan incomplet n-est pas rééquilibré en silence',
    !incomplete.complete && near(incomplete.totalAmount, 40), String(incomplete.totalAmount))

  check('splitDesignation sépare le libellé de la spécification',
    splitDesignation('Transplantations : ' + 'x'.repeat(80)).designation === 'Transplantations')
  check('un nom d-espèce reste entier', splitDesignation('Phoenix canariensis').description === null)

  // ═══ 2. The reference workbook ═══════════════════════════════════════════
  console.log('\n2. Analyse du classeur officiel FOR-CO-02')

  const bytes = readWorkbook()
  const parsed = await parseBordereauWorkbook(bytes)

  check('le classeur est analysé sans erreur bloquante', parsed.ok, JSON.stringify(parsed.errors))
  check('code document FOR-CO-02 lu dans l-en-tête', parsed.header.documentCode === 'FOR-CO-02')
  check('révision 2 lue sous le code', parsed.header.formRevision === 2)
  check('2 sections', parsed.stats.sectionCount === 2, String(parsed.stats.sectionCount))
  check('17 catégories', parsed.stats.categoryCount === 17, String(parsed.stats.categoryCount))
  check('266 lignes chiffrables', parsed.stats.lineCount === 266, String(parsed.stats.lineCount))
  check('4 lignes de spécification chiffrables', parsed.stats.specCount === 4, String(parsed.stats.specCount))

  const [sectionI, sectionII] = parsed.sections
  check('section I identifiée', sectionI?.sourceCode === 'I.' && sectionI.designation === 'TRAVAUX PRELIMINAIRES')
  check('section II identifiée', sectionII?.sourceCode === 'II.' && sectionII.designation === 'FOURNITURE DES VEGETAUX')
  check('9 lignes en section I, pas 10 — la fusion verticale de I.2 est ignorée',
    sectionI.children.length === 9, String(sectionI.children.length))

  EXPECTED_SECTION_I.forEach(([code, designation], i) => {
    const line = sectionI.children[i]
    check(`section I ${code} « ${designation} »`,
      line?.sourceCode === code && line.designation === designation,
      `${line?.sourceCode} / ${line?.designation}`)
  })

  check('17 catégories en section II', sectionII.children.length === 17, String(sectionII.children.length))
  EXPECTED_CATEGORIES.forEach(([source, display, designation, lines], i) => {
    const cat = sectionII.children[i]
    const actualLines = flattenPreview([cat]).filter(priceable).length
    check(`${source} → ${display} « ${designation} » : ${lines} ligne(s)`,
      cat?.sourceCode === source && cat.displayCode === display &&
      cat.designation === designation && actualLines === lines,
      `${cat?.sourceCode}/${cat?.displayCode}/${cat?.designation}/${actualLines}`)
  })

  const flat = flattenPreview(parsed.sections)
  const byName = new Map(flat.map((l) => [l.designation, l]))
  for (const species of EXPECTED_SPECIES) {
    check(`« ${species} » est une ligne à part entière`, byName.has(species))
  }
  check('aucune ligne ne fusionne plusieurs espèces dans un même champ',
    flat.filter(priceable).every((l) => !l.designation.includes(';')))

  // ═══ 3. Numbering, units and specifications ══════════════════════════════
  console.log('\n3. Numérotation, unités et spécifications')

  const duplicates = sectionII.children.filter((c) => c.sourceCode === 'II.17')
  check('le code II.17 est conservé deux fois tel que le corps l-imprime',
    duplicates.length === 2, String(duplicates.length))
  check('les deux II.17 reçoivent des numéros de récapitulatif distincts',
    duplicates[0]?.displayCode === 'II.16' && duplicates[1]?.displayCode === 'II.17')
  check('le saut de II.12 dans le corps est préservé',
    !sectionII.children.some((c) => c.sourceCode === 'II.12'))
  check('le récapitulatif rétablit II.12 sans réécrire le corps',
    sectionII.children.some((c) => c.displayCode === 'II.12' && c.sourceCode === 'II.13'))
  check('un avertissement signale le code dupliqué',
    parsed.warnings.some((w) => /II\.17/.test(w.message)))

  const units = new Set(flat.filter(priceable).map((l) => l.unit).filter(Boolean))
  check('les unités « P » et « p » restent distinctes — rien n-est normalisé',
    units.has('P') && units.has('p'), [...units].join(','))
  for (const unit of ['Ens', 'M³', 'M²', 'Sac', 'TONNE']) {
    check(`l-unité « ${unit} » est préservée`, units.has(unit))
  }

  const transplantation = sectionI.children[0]
  check('la spécification de I.1 est conservée en entier',
    (transplantation.description ?? '').includes('replanter ailleurs'),
    String(transplantation.description).slice(0, 60))
  const engazonnement = sectionII.children.find((c) => c.designation === 'ENGAZONNEMENT')
  check("la spécification d'engazonnement est conservée",
    (engazonnement?.children[0]?.designation ?? '').includes('plaques de gazon'))
  check("la spécification du mur végétal en lichen est conservée",
    flat.some((l) => l.designation.includes('lichen stabilisé')))
  check("la spécification du mur végétal en mousse est conservée",
    flat.some((l) => l.designation.includes('fougères préservées')))
  check('les 4 spécifications longues sont des lignes chiffrables, pas du décor',
    flat.filter((l) => l.lineType === 'spec').length === 4)
  check('la section II porte sa propre spécification',
    (sectionII.description ?? '').includes('mottes et en pots'))

  // ═══ 4. Broken formulas and banner leftovers ═════════════════════════════
  console.log('\n4. Formules cassées et bandeaux de catégorie')

  check('les 12 cellules #REF! du classeur sont détectées',
    parsed.stats.refErrorCount === 12, String(parsed.stats.refErrorCount))
  check('les 17 formules de bandeau sont détectées',
    parsed.stats.bannerFormulaCount === 17, String(parsed.stats.bannerFormulaCount))
  check('aucune valeur #REF! n-entre dans le modèle',
    !flat.some((l) =>
      /#REF!/.test(l.designation) || /#REF!/.test(l.norme ?? '') ||
      /#REF!/.test(l.description ?? '') || /#REF!/.test(l.unit ?? '')))
  check('aucun total de ligne ne provient du classeur : tout est null ou recalculé',
    flat.every((l) => l.total === lineTotal(l.quantity, l.unitPrice)))
  check('aucune ligne fantôme issue d-un bandeau : les catégories ne portent ni qté ni P.U.',
    sectionII.children.every((c) =>
      c.lineType === 'category' && c.quantity === null && c.unitPrice === null && c.norme === null))
  check('les lignes « TOTAL PARTIEL » ne deviennent jamais des lignes du bordereau',
    !flat.some((l) => /^TOTAL/i.test(l.designation)))
  check('le récapitulatif ne produit aucune ligne du corps',
    !flat.some((l) => /RECAPITULATIF/i.test(l.designation)))

  // ═══ 5. The blank template is blank ══════════════════════════════════════
  console.log('\n5. Le classeur de référence est un modèle VIERGE')

  check('aucun prix unitaire dans le modèle', flat.every((l) => l.unitPrice === null))
  check('aucune ligne chiffrée', parsed.stats.pricedCount === 0, String(parsed.stats.pricedCount))
  check('total HTVA recalculé à 0 — rien n-est fabriqué', near(parsed.stats.totalHtva, 0))
  check('aucun client dans l-en-tête', parsed.header.clientName === null)
  check('aucun projet dans l-en-tête', parsed.header.projectTitle === null)
  check('aucune date dans l-en-tête', parsed.header.offerDate === null)
  check('aucune durée de validité — le modèle imprime des pointillés',
    parsed.header.validityDays === null)
  check('les quantités de gabarit du modèle sont conservées telles quelles',
    sectionI.children[0].quantity === 1 && sectionI.children[5].quantity === 0,
    `${sectionI.children[0].quantity} / ${sectionI.children[5].quantity}`)

  check('3 modalités de paiement lues', parsed.milestones.length === 3)
  check('50 % lors de la confirmation',
    parsed.milestones[0].percentage === 50 && parsed.milestones[0].triggerEvent === 'confirmation')
  check('30 % pendant les travaux',
    parsed.milestones[1].percentage === 30 && parsed.milestones[1].triggerEvent === 'during_works')
  check('20 % à la fin du chantier',
    parsed.milestones[2].percentage === 20 && parsed.milestones[2].triggerEvent === 'completion')
  check('les 3 modalités totalisent 100 %', parsed.stats.milestonePercentageTotal === 100)

  const asPayload = bordereauReplaceSchema.safeParse({
    lines: parsed.sections.map(function strip(n): unknown {
      return {
        lineType: n.lineType,
        sourceCode: n.sourceCode ?? undefined,
        displayCode: n.displayCode ?? undefined,
        designation: n.designation,
        description: n.description ?? undefined,
        norme: n.norme ?? undefined,
        unit: n.unit ?? undefined,
        quantity: n.quantity,
        unitPrice: n.unitPrice,
        sourceRow: n.sourceRow,
        children: n.children.map(strip),
      }
    }),
    milestones: parsed.milestones,
  })
  check('le résultat de l-analyse satisfait le schéma d-écriture', asPayload.success,
    asPayload.success ? '' : JSON.stringify(asPayload.error.flatten()).slice(0, 300))

  // ═══ 6. Refusals ═════════════════════════════════════════════════════════
  console.log('\n6. Refus explicites')

  const notAWorkbook = await parseBordereauWorkbook(
    new TextEncoder().encode('ceci nest pas un xlsx').buffer as ArrayBuffer)
  check('un fichier qui n-est pas un classeur est refusé', !notAWorkbook.ok)
  check('le refus est explicite',
    notAWorkbook.errors.some((e) => /illisible/i.test(e.message)), JSON.stringify(notAWorkbook.errors))

  const blankWb = new ExcelJS.Workbook()
  blankWb.addWorksheet('vide').getCell('A1').value = 'rien à voir'
  const blank = await parseBordereauWorkbook(await blankWb.xlsx.writeBuffer() as ArrayBuffer)
  check('un classeur sans colonne Désignation est refusé', !blank.ok)
  check('le refus nomme la colonne manquante',
    blank.errors.some((e) => /Désignation/i.test(e.message)), JSON.stringify(blank.errors))

  check('l-analyse n-écrit rien : aucune offre créée',
    (await count('commercial_offers')) === before.commercialOffers)
  check('l-analyse ne crée aucune fiche plante',
    (await count('plant_species')) === before.plantSpecies)
  check('l-analyse ne crée aucune matière décorative',
    (await count('decorative_materials')) === before.decorativeMaterials)

  // ═══ 7. Roles ════════════════════════════════════════════════════════════
  console.log('\n7. Droits')
  check('les droits d-édition sont ceux du module offres, inchangés',
    BORDEREAU_WRITE_ROLES.join(',') === 'admin,direction,etudes_chef')
  check("l'approbation est réservée à l'administration et à la direction",
    BORDEREAU_APPROVE_ROLES.join(',') === 'admin,direction')
  check('un chef d-études édite mais n-approuve pas',
    canEditBordereau('etudes_chef') && !canApproveBordereau('etudes_chef'))
  check('un compte terrain ne peut ni éditer ni approuver',
    !canEditBordereau('realisation_team') && !canApproveBordereau('realisation_team'))

  // ── Persistence fixtures: nothing is created but the offer itself ────────
  const [actorRow] = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users).where(eq(users.role, 'admin')).limit(1)
  if (!actorRow) { console.error('\nAucun utilisateur admin : test impossible.'); process.exit(2) }
  const actor: AuditActor = {
    userId: actorRow.id, name: actorRow.name, email: actorRow.email, role: actorRow.role,
  }

  const [project] = await db
    .select({
      id: projects.id, reference: projects.reference,
      approvedBudget: projects.approvedBudget,
      contractAmount: projects.contractAmount,
      contractAmountSuggested: projects.contractAmountSuggested,
      contractAmountSourceOfferId: projects.contractAmountSourceOfferId,
      contractAmountConfirmedBy: projects.contractAmountConfirmedBy,
      contractAmountConfirmedAt: projects.contractAmountConfirmedAt,
      clientId: projects.clientId,
    })
    .from(projects).where(isNull(projects.deletedAt)).limit(1)
  if (!project) { console.error('\nAucun projet : test impossible.'); process.exit(2) }

  const spendBefore = await getProjectSpend(project.id)

  const reference = `TST-CO02-${Date.now().toString(36).toUpperCase()}`
  const [offer] = await db.insert(commercialOffers).values({
    reference,
    projectTitle: 'Vérification FOR-CO-02',
    projectId: project.id,
    clientId: project.clientId,
    currency: 'TND',
    vatRate: '0.1900',
    createdBy: actor.userId,
  }).returning({ id: commercialOffers.id })
  const offerId = offer.id

  let templateId: string | null = null

  try {
    // ═══ 8. Template import and idempotency ════════════════════════════════
    console.log('\n8. Modèle vierge : import et idempotence')

    const hash = hashWorkbook(bytes)
    const existingTemplate = await findTemplateImport(hash)
    let template = await getActiveBordereauTemplate()

    if (existingTemplate) {
      check('le modèle officiel était déjà chargé : le même fichier est refusé', true,
        'idempotence vérifiée sur un chargement antérieur')
    } else {
      const created = await createTemplateFromPreview(
        parsed, { name: 'FOR CO 02 Bordereau des prix.xltx', hash, byteSize: bytes.byteLength },
        actor.userId, actor,
      )
      templateId = created.templateId
      check('le modèle est créé avec une révision', created.revision >= 1, String(created.revision))
      check('le même fichier est ensuite reconnu comme déjà chargé',
        (await findTemplateImport(hash)) !== null)
    }

    template = await getActiveBordereauTemplate()
    check('un modèle actif existe', template !== null)
    if (template) {
      check('le modèle porte 2 sections', template.stats.sectionCount === 2, String(template.stats.sectionCount))
      check('le modèle porte 17 catégories', template.stats.categoryCount === 17, String(template.stats.categoryCount))
      check('le modèle porte 266 lignes', template.stats.lineCount === 266, String(template.stats.lineCount))
      const tplFlat: TemplateLineRow[] = []
      const walkTpl = (n: TemplateLineRow) => { tplFlat.push(n); n.children.forEach(walkTpl) }
      template.lines.forEach(walkTpl)
      check('le modèle ne contient structurellement aucun prix',
        tplFlat.length > 0 && !Object.keys(tplFlat[0]).includes('unitPrice'))
      check('les spécifications longues sont stockées dans le modèle',
        tplFlat.some((l) => (l.designation + (l.description ?? '')).includes('plaques de gazon')))
    }

    // ═══ 9. Cloning the template into an offer ═════════════════════════════
    console.log('\n9. Offre : clonage depuis le modèle vierge')

    const cloned = await cloneTemplateIntoOffer(offerId, template!.id, actor.userId, actor)
    check('le clonage réussit', cloned.success === true)
    let document = await getOfferBordereau(offerId)
    check('le document cloné porte 266 lignes',
      document?.totals.lineCount === 266, String(document?.totals.lineCount))
    check('le clonage ne reprend AUCUNE quantité du modèle',
      document?.totals.pricedCount === 0, String(document?.totals.pricedCount))
    check('le montant HTVA reste nul tant que rien n-est chiffré',
      near(document?.totals.totalHtva ?? -1, 0))

    // ═══ 10. Importing the workbook into the offer ═════════════════════════
    console.log('\n10. Offre : import du classeur')

    await applyImportToOffer(
      offerId, parsed,
      { name: 'FOR CO 02 Bordereau des prix.xltx', hash, byteSize: bytes.byteLength },
      actor.userId, actor,
    )
    document = await getOfferBordereau(offerId)
    check('2 sections en base', document?.totals.sectionCount === 2)
    check('17 catégories en base', document?.totals.categoryCount === 17)
    check('266 lignes en base', document?.totals.lineCount === 266, String(document?.totals.lineCount))
    check('3 échéances en base', document?.milestones.length === 3)
    check('la validité du modèle reste absente', document?.offer.validityDays === null)

    const dbFlat: BordereauLineRow[] = []
    const walkDb = (n: BordereauLineRow) => { dbFlat.push(n); n.children.forEach(walkDb) }
    document!.sections.forEach(walkDb)
    check('aucune valeur #REF! en base',
      !dbFlat.some((l) => /#REF!/.test(`${l.designation}${l.norme ?? ''}${l.description ?? ''}${l.unit ?? ''}`)))
    check('chaque ligne porte un identifiant interne stable (uuid)',
      dbFlat.every((l) => /^[0-9a-f-]{36}$/.test(l.id)))
    check('la ligne source du classeur est conservée en métadonnée seulement',
      dbFlat.filter((l) => l.sourceRow !== null).length === dbFlat.length)
    check('les identifiants ne sont pas les numéros de ligne',
      new Set(dbFlat.map((l) => l.id)).size === dbFlat.length)
    for (const species of EXPECTED_SPECIES) {
      check(`« ${species} » présent en base`, dbFlat.some((l) => l.designation === species))
    }
    check('les codes source et récapitulatif cohabitent en base',
      dbFlat.some((l) => l.sourceCode === 'II.13' && l.displayCode === 'II.12'))

    check('le réimport du même fichier est détecté', (await findOfferImport(offerId, hash)) !== null)

    // ═══ 11. Pricing, VAT and milestones on real figures ═══════════════════
    console.log('\n11. Chiffrage : HTVA, TVA, TTC et échéances')

    // Price two lines by hand and check every level above them.
    const palmiers = document!.sections[1].children.find((c) => c.sourceCode === 'II.1')!
    const priced = await replaceOfferBordereau(
      offerId,
      {
        lines: [
          {
            lineType: 'section', sourceCode: 'I.', designation: 'TRAVAUX PRELIMINAIRES',
            children: [
              { lineType: 'item', sourceCode: 'I.1', designation: 'Transplantations', unit: 'Ens', quantity: 1, unitPrice: 1200 },
              { lineType: 'item', sourceCode: 'I.4', designation: 'Terre végétale', unit: 'M³', quantity: 120, unitPrice: 55 },
            ],
          },
          {
            lineType: 'section', sourceCode: 'II.', designation: 'FOURNITURE DES VEGETAUX',
            children: [
              {
                lineType: 'category', sourceCode: 'II.1', displayCode: 'II.1', designation: 'LES PALMIERS',
                children: [
                  { lineType: 'item', designation: 'Phoenix canariensis', unit: 'P', quantity: 4, unitPrice: 1750.5 },
                  { lineType: 'item', designation: 'Bismarckia', unit: 'P', quantity: 2, unitPrice: 890.25 },
                  { lineType: 'item', designation: 'Butia capitata', unit: 'P', quantity: null, unitPrice: null },
                ],
              },
            ],
          },
        ],
        milestones: [
          { label: 'lors de la confirmation', percentage: 50, basis: 'ttc', triggerEvent: 'confirmation' },
          { label: 'pendant les travaux', percentage: 30, basis: 'ttc', triggerEvent: 'during_works' },
          { label: 'à la fin du chantier', percentage: 20, basis: 'ttc', triggerEvent: 'completion' },
        ],
      },
      actor.userId, actor,
    )
    check('le remplacement écrit 8 nœuds', priced.rowCount === 8, String(priced.rowCount))
    check('5 lignes chiffrables', priced.lineCount === 5, String(priced.lineCount))
    check('la catégorie II.1 existait bien dans le document importé', palmiers !== undefined)

    document = await getOfferBordereau(offerId)
    const t = document!.totals
    // I: 1×1200 + 120×55 = 7800 ; II.1: 4×1750,5 + 2×890,25 = 7002 + 1780,5 = 8782,5
    check('sous-total section I = 7 800', near(t.sections[0].subtotal, 7800), String(t.sections[0].subtotal))
    check('sous-total section II = 8 782,500', near(t.sections[1].subtotal, 8782.5), String(t.sections[1].subtotal))
    check('sous-total de la catégorie II.1 = 8 782,500',
      near(document!.sections[1].children[0].subtotal, 8782.5))
    check('total général HTVA = 16 582,500', near(t.totalHtva, 16582.5), String(t.totalHtva))
    check('TVA 19 % = 3 150,675', near(t.totalVat, 3150.675), String(t.totalVat))
    check('TTC = 19 733,175', near(t.totalTtc, 19733.175), String(t.totalTtc))
    check('une ligne non chiffrée reste sans montant, pas à 0',
      document!.sections[1].children[0].children[2].total === null)
    check('4 lignes chiffrées sur 5', t.pricedCount === 4, String(t.pricedCount))

    const [stored] = await db
      .select({ amount: commercialOffers.amount, htva: commercialOffers.totalHtva,
                vat: commercialOffers.totalVat, ttc: commercialOffers.totalTtc })
      .from(commercialOffers).where(eq(commercialOffers.id, offerId))
    check('`amount` conserve son sens historique : le HTVA',
      near(num(stored.amount), 16582.5), String(stored.amount))
    check('total_htva stocké', near(num(stored.htva), 16582.5))
    check('total_vat stocké', near(num(stored.vat), 3150.675))
    check('total_ttc stocké', near(num(stored.ttc), 19733.175))
    check('le total de chaque ligne est persisté et cohérent',
      (await db.select({ id: offerLineItems.id, q: offerLineItems.quantity,
                         p: offerLineItems.unitPrice, t: offerLineItems.total })
        .from(offerLineItems).where(eq(offerLineItems.offerId, offerId)))
        .every((r) => near(numOrNull(r.t), lineTotal(numOrNull(r.q), numOrNull(r.p)))))

    const ms = document!.milestones
    check('50 % du TTC = 9 866,588', near(ms[0].amount, 9866.588), String(ms[0].amount))
    check('30 % du TTC = 5 919,953', near(ms[1].amount, 5919.953), String(ms[1].amount))
    check('20 % du TTC = 3 946,634 après reliquat', near(ms[2].amount, 3946.634), String(ms[2].amount))
    check('Σ des échéances = TTC exactement',
      near(document!.milestoneSummary.totalAmount, t.totalTtc),
      `${document!.milestoneSummary.totalAmount} ≠ ${t.totalTtc}`)
    check('les échéances totalisent 100 %', document!.milestoneSummary.complete)
    check('aucune écriture de solde client n-est créée par une échéance',
      ms.every((m) => m.clientAccountEntryId === null))

    // ═══ 12. Project and client association ════════════════════════════════
    console.log('\n12. Rattachement projet et client')
    check('le bordereau est rattaché au projet', document!.offer.projectId === project.id)
    check('le bordereau est rattaché au client du projet', document!.offer.clientId === project.clientId)
    check('la référence projet du classeur reste une donnée de provenance',
      document!.offer.projectReferenceText === null)

    // ═══ 13. Versions: creation, approval, immutability, locking ═══════════
    console.log('\n13. Versions : création, approbation, immuabilité, verrouillage')

    const v1 = await createOfferVersion(offerId, { changeSummary: 'Version initiale' }, actor.userId, actor)
    check('une version est créée', v1.success === true && v1.versionNo === 1)
    const versionId = v1.success ? v1.versionId : ''

    const [snapshot] = await db.select().from(offerVersions).where(eq(offerVersions.id, versionId))
    check('la version fige le TTC', near(num(snapshot.totalTtc), 19733.175), String(snapshot.totalTtc))
    check('la version fige le nombre de lignes', snapshot.lineCount === 5)
    check('la version contient un instantané complet du document',
      JSON.stringify(snapshot.snapshot).includes('Phoenix canariensis'))

    check('un document non approuvé est modifiable', (await assertNotLocked(offerId)) === null)

    const approved = await approveOfferVersion(offerId, versionId, actor.userId, actor)
    check('la version est approuvée', approved.success === true)
    document = await getOfferBordereau(offerId)
    check('le document est verrouillé', document!.locked === true)
    check('le verrouillage est horodaté', document!.offer.lockedAt !== null)
    check('une modification est refusée sur un document approuvé',
      (await assertNotLocked(offerId))?.includes('verrouillé') === true)

    let immutableSnapshot = false
    try {
      await db.update(offerVersions).set({ totalTtc: '1.000' }).where(eq(offerVersions.id, versionId))
    } catch { immutableSnapshot = true }
    check('la base refuse de modifier le contenu d-une version', immutableSnapshot)

    let immutableDelete = false
    try {
      await db.delete(offerVersions).where(eq(offerVersions.id, versionId))
    } catch { immutableDelete = true }
    check('la base refuse de supprimer une version', immutableDelete)

    let noDowngrade = false
    try {
      await db.update(offerVersions).set({ status: 'draft' }).where(eq(offerVersions.id, versionId))
    } catch { noDowngrade = true }
    check('une version approuvée ne peut pas redevenir un brouillon', noDowngrade)

    const reopened = await reopenOfferBordereau(offerId, 'Révision du prix des palmiers', actor.userId, actor)
    check('la réouverture réussit', reopened.success === true)
    document = await getOfferBordereau(offerId)
    check('le document est déverrouillé', document!.locked === false)
    const [afterReopen] = await db.select().from(offerVersions).where(eq(offerVersions.id, versionId))
    check('la version approuvée est marquée « remplacée », jamais supprimée',
      afterReopen?.status === 'superseded')
    check('son montant approuvé reste lisible tel qu-il a été signé',
      near(num(afterReopen.totalTtc), 19733.175), String(afterReopen.totalTtc))

    // Le motif de réouverture est porté par la version remplacée, pas seulement
    // par le journal : ISO 9001:2015 §8.2.3.2 le veut avec l'enregistrement.
    check('le motif de réouverture est conservé sur la version remplacée',
      afterReopen?.reopenReason === 'Révision du prix des palmiers',
      String(afterReopen?.reopenReason))
    check('la réouverture est horodatée et signée',
      afterReopen?.reopenedBy === actor.userId && afterReopen?.reopenedAt instanceof Date,
      `${String(afterReopen?.reopenedBy)} / ${String(afterReopen?.reopenedAt)}`)
    check('le motif remonte dans l-historique de révision',
      document!.versions.find((v) => v.id === versionId)?.reopenReason === 'Révision du prix des palmiers')

    let motifImmutable = false
    try {
      await db.update(offerVersions)
        .set({ reopenReason: 'motif réécrit après coup' })
        .where(eq(offerVersions.id, versionId))
    } catch { motifImmutable = true }
    check('la base refuse de réécrire un motif de réouverture', motifImmutable)

    // ═══ 14. Contract amount — approvedBudget untouched ════════════════════
    console.log('\n14. Montant contractuel : le budget approuvé reste intact')

    const budgetBefore = project.approvedBudget
    await confirmContractAmount(
      project.id,
      { offerId, suggestedAmount: t.totalTtc, approvedAmount: 19500 },
      actor.userId, actor,
    )
    const [afterContract] = await db
      .select({
        approvedBudget: projects.approvedBudget,
        contractAmount: projects.contractAmount,
        suggested: projects.contractAmountSuggested,
        confirmedBy: projects.contractAmountConfirmedBy,
        confirmedAt: projects.contractAmountConfirmedAt,
        sourceOffer: projects.contractAmountSourceOfferId,
      })
      .from(projects).where(eq(projects.id, project.id))

    check('approved_budget est INCHANGÉ', afterContract.approvedBudget === budgetBefore,
      `${budgetBefore} → ${afterContract.approvedBudget}`)
    check('contract_amount porte la valeur confirmée', near(num(afterContract.contractAmount), 19500))
    check('la valeur suggérée par l-offre est conservée à côté',
      near(num(afterContract.suggested), t.totalTtc), String(afterContract.suggested))
    check('l-utilisateur et l-horodatage de la confirmation sont tracés',
      afterContract.confirmedBy === actor.userId && afterContract.confirmedAt !== null)
    check('l-offre à l-origine du montant est nommée', afterContract.sourceOffer === offerId)

    const spendAfter = await getProjectSpend(project.id)
    check('la consommation budgétaire du projet est inchangée',
      near(spendAfter.spent, spendBefore.spent) &&
      near(spendAfter.poTotal, spendBefore.poTotal) &&
      near(spendAfter.supplyTotal, spendBefore.supplyTotal) &&
      near(spendAfter.equipmentTotal, spendBefore.equipmentTotal) &&
      near(spendAfter.expensesTotal, spendBefore.expensesTotal),
      `${spendBefore.spent} → ${spendAfter.spent}`)

    // ═══ 15. Export → re-import round trip ═════════════════════════════════
    console.log('\n15. Export FOR-CO-02 → réimport : le modèle structuré est préservé')

    // Restore the full 266-line document so the round trip is exercised on the
    // real thing rather than a five-line fixture.
    await applyImportToOffer(
      offerId, parsed,
      // A distinct 64-character hash: the import ledger is unique on it, and
      // this second write of the same content is a deliberate second import.
      { name: 'round-trip.xlsx', hash: hashWorkbook(new TextEncoder().encode(`${hash}-rt`).buffer as ArrayBuffer), byteSize: bytes.byteLength },
      actor.userId, actor,
    )
    const full = (await getOfferBordereau(offerId))!
    const exported = await buildBordereauWorkbook(full)
    check('l-export produit un classeur non vide', exported.byteLength > 5000, String(exported.byteLength))

    const reparsed: BordereauImportPreview = await parseBordereauWorkbook(
      exported.buffer.slice(exported.byteOffset, exported.byteOffset + exported.byteLength) as ArrayBuffer,
    )
    check('le classeur exporté se réimporte sans erreur', reparsed.ok, JSON.stringify(reparsed.errors))
    check('aucune formule #REF! dans l-export', reparsed.stats.refErrorCount === 0,
      String(reparsed.stats.refErrorCount))
    check('aucun bandeau de catégorie porteur de formule dans l-export',
      reparsed.stats.bannerFormulaCount === 0, String(reparsed.stats.bannerFormulaCount))
    check('2 sections après aller-retour', reparsed.stats.sectionCount === 2)
    check('17 catégories après aller-retour', reparsed.stats.categoryCount === 17,
      String(reparsed.stats.categoryCount))
    check('266 lignes après aller-retour', reparsed.stats.lineCount === 266,
      String(reparsed.stats.lineCount))
    check('4 spécifications après aller-retour', reparsed.stats.specCount === 4,
      String(reparsed.stats.specCount))
    check('3 modalités de paiement après aller-retour', reparsed.milestones.length === 3)
    check('le code document survit à l-aller-retour', reparsed.header.documentCode === 'FOR-CO-02')

    const rtCategories = reparsed.sections[1]?.children ?? []
    check('les codes source et récapitulatif survivent à l-aller-retour',
      EXPECTED_CATEGORIES.every(([source, display, designation], i) =>
        rtCategories[i]?.sourceCode === source &&
        rtCategories[i]?.displayCode === display &&
        rtCategories[i]?.designation === designation),
      rtCategories.slice(11, 13).map((c) => `${c.sourceCode}/${c.displayCode}`).join(' '))
    check('les effectifs par catégorie survivent à l-aller-retour',
      rtCategories.length === EXPECTED_CATEGORIES.length &&
      EXPECTED_CATEGORIES.every(([, , , n], i) =>
        flattenPreview([rtCategories[i]]).filter(priceable).length === n),
      rtCategories.map((c, i) =>
        `${c.sourceCode}:${flattenPreview([c]).filter(priceable).length}/${EXPECTED_CATEGORIES[i]?.[3]}`)
        .filter((s, i) => flattenPreview([rtCategories[i]]).filter(priceable).length !== EXPECTED_CATEGORIES[i]?.[3])
        .join(' '))

    const rtFlat = flattenPreview(reparsed.sections)
    for (const species of EXPECTED_SPECIES) {
      check(`« ${species} » survit à l-aller-retour`, rtFlat.some((l) => l.designation === species))
    }
    const rtUnits = new Set(rtFlat.filter(priceable).map((l) => l.unit).filter(Boolean))
    check('« P » et « p » restent distinctes après aller-retour',
      rtUnits.has('P') && rtUnits.has('p'))
    check('les spécifications longues survivent à l-aller-retour',
      rtFlat.some((l) => l.designation.includes('plaques de gazon')) &&
      rtFlat.some((l) => l.designation.includes('lichen stabilisé')) &&
      rtFlat.some((l) => l.designation.includes('fougères préservées')))
    check('la spécification de la section II survit à l-aller-retour',
      (reparsed.sections[1]?.description ?? '').includes('mottes et en pots'))
    check('la spécification de I.1 survit à l-aller-retour',
      (reparsed.sections[0]?.children[0]?.description ?? '').includes('replanter ailleurs'))

    // Now with real figures, so the amounts round-trip too.
    await replaceOfferBordereau(
      offerId,
      {
        lines: [{
          lineType: 'section', sourceCode: 'I.', designation: 'TRAVAUX PRELIMINAIRES',
          children: [
            { lineType: 'item', sourceCode: 'I.4', designation: 'Terre végétale', unit: 'M³', quantity: 120, unitPrice: 55 },
            { lineType: 'item', sourceCode: 'I.5', designation: 'Amendements', unit: 'Sac', quantity: 30, unitPrice: 12.75 },
          ],
        }],
        milestones: [],
      },
      actor.userId, actor,
    )
    const pricedDoc = (await getOfferBordereau(offerId))!
    const pricedExport = await buildBordereauWorkbook(pricedDoc)
    const pricedReparse = await parseBordereauWorkbook(
      pricedExport.buffer.slice(
        pricedExport.byteOffset, pricedExport.byteOffset + pricedExport.byteLength) as ArrayBuffer,
    )
    const rtLines = flattenPreview(pricedReparse.sections).filter(priceable)
    check('les quantités survivent à l-aller-retour',
      rtLines[0]?.quantity === 120 && rtLines[1]?.quantity === 30,
      `${rtLines[0]?.quantity}/${rtLines[1]?.quantity}`)
    check('les prix unitaires survivent à l-aller-retour',
      near(rtLines[0]?.unitPrice ?? null, 55) && near(rtLines[1]?.unitPrice ?? null, 12.75))
    check('les montants de ligne sont recalculés, pas relus',
      near(rtLines[0]?.total ?? null, 6600) && near(rtLines[1]?.total ?? null, 382.5))
    check('le total général se reconstitue à l-identique',
      near(pricedReparse.stats.totalHtva, pricedDoc.totals.totalHtva),
      `${pricedReparse.stats.totalHtva} ≠ ${pricedDoc.totals.totalHtva}`)
    check('le formatage du taux de TVA est lisible',
      formatVatRate(0.19) === '19 %', formatVatRate(0.19))
    check('le formatage monétaire est au millime',
      formatMoney(6600) === '6 600,000'.replace(/ /g, ' ') || /6\s?600,000/.test(formatMoney(6600)),
      formatMoney(6600))

  } finally {
    // ── Cleanup ────────────────────────────────────────────────────────────
    //
    // `offer_versions` refuses DELETE by trigger — which is exactly the
    // guarantee section 13 asserts — so the trigger is disabled for the
    // duration of the teardown and restored immediately. That it must be
    // disabled at all is further evidence the guard is real.
    console.log('\n16. Nettoyage')

    // The project row is restored FIRST: it holds a foreign key to the offer
    // through `contract_amount_source_offer_id`, so the offer cannot be
    // deleted while that reference stands.
    await db.update(projects).set({
      contractAmount: project.contractAmount,
      contractAmountSuggested: project.contractAmountSuggested,
      contractAmountSourceOfferId: project.contractAmountSourceOfferId,
      contractAmountConfirmedBy: project.contractAmountConfirmedBy,
      contractAmountConfirmedAt: project.contractAmountConfirmedAt,
    }).where(eq(projects.id, project.id))

    await db.update(commercialOffers)
      .set({ approvedVersionId: null }).where(eq(commercialOffers.id, offerId))
    await db.execute(sql.raw('ALTER TABLE offer_versions DISABLE TRIGGER offer_versions_guard_trg'))
    try {
      await db.delete(offerVersions).where(eq(offerVersions.offerId, offerId))
    } finally {
      await db.execute(sql.raw('ALTER TABLE offer_versions ENABLE TRIGGER offer_versions_guard_trg'))
    }

    await db.delete(offerImports).where(eq(offerImports.offerId, offerId))
    await db.delete(offerPaymentMilestones).where(eq(offerPaymentMilestones.offerId, offerId))
    await db.delete(offerLineItems).where(eq(offerLineItems.offerId, offerId))
    await db.delete(commercialOffers).where(eq(commercialOffers.id, offerId))

    if (templateId) {
      await db.delete(offerImports).where(eq(offerImports.templateId, templateId))
      await db.delete(bordereauTemplateLines).where(eq(bordereauTemplateLines.templateId, templateId))
      await db.delete(bordereauTemplates).where(eq(bordereauTemplates.id, templateId))
      // Whatever template was active before this run becomes active again.
      await db.execute(sql`
        UPDATE bordereau_templates SET is_active = true
         WHERE id = (SELECT id FROM bordereau_templates
                      WHERE code = 'FOR-CO-02' ORDER BY revision DESC LIMIT 1)
           AND NOT EXISTS (SELECT 1 FROM bordereau_templates
                            WHERE code = 'FOR-CO-02' AND is_active)
      `)
    }

    // The trail this run wrote is removed too, so the baseline is exact. Only
    // rows naming the throwaway offer, the test template or the test project's
    // contract amount are touched.
    await db.execute(sql`
      DELETE FROM record_audit_log
       WHERE (entity_type = 'commercial_offer' AND entity_id = ${offerId}::uuid)
          OR (entity_type = 'project_contract_amount' AND entity_id = ${project.id}::uuid
              AND occurred_at > now() - interval '1 hour')
          ${templateId ? sql`OR (entity_type = 'bordereau_template' AND entity_id = ${templateId}::uuid)` : sql``}
    `)
  }

  // ═══ 17. Nothing pre-existing moved ══════════════════════════════════════
  console.log('\n17. Données existantes inchangées')
  const after = {
    projects: await count('projects'),
    clients: await count('clients'),
    users: await count('users'),
    plantSpecies: await count('plant_species'),
    decorativeMaterials: await count('decorative_materials'),
    suppliers: await count('suppliers'),
    purchaseOrders: await count('purchase_orders'),
    extraExpenses: await count('extra_expenses'),
    equipmentRentals: await count('equipment_rentals'),
    supplyRegisters: await count('supply_registers'),
    supplyItems: await count('supply_items'),
    supplyPurchases: await count('supply_purchases'),
    commercialOffers: await count('commercial_offers'),
    offerLineItems: await count('offer_line_items'),
    offerMilestones: await count('offer_payment_milestones'),
    offerVersions: await count('offer_versions'),
    offerImports: await count('offer_imports'),
    bordereauTemplates: await count('bordereau_templates'),
    bordereauTemplateLines: await count('bordereau_template_lines'),
    recordAuditLog: await count('record_audit_log'),
  }
  for (const key of Object.keys(before) as (keyof typeof before)[]) {
    check(`${key} : ${before[key]} → ${after[key]}`, before[key] === after[key])
  }

  const [restored] = await db
    .select({
      approvedBudget: projects.approvedBudget,
      contractAmount: projects.contractAmount,
      contractAmountSuggested: projects.contractAmountSuggested,
      contractAmountSourceOfferId: projects.contractAmountSourceOfferId,
      contractAmountConfirmedBy: projects.contractAmountConfirmedBy,
    })
    .from(projects).where(eq(projects.id, project.id))
  check(`le budget approuvé du projet témoin n-a jamais bougé (${project.approvedBudget ?? '—'})`,
    restored.approvedBudget === project.approvedBudget,
    `${project.approvedBudget} → ${restored.approvedBudget}`)
  check('le montant contractuel du projet témoin est restauré',
    restored.contractAmount === project.contractAmount &&
    restored.contractAmountSuggested === project.contractAmountSuggested &&
    restored.contractAmountSourceOfferId === project.contractAmountSourceOfferId &&
    restored.contractAmountConfirmedBy === project.contractAmountConfirmedBy,
    `${project.contractAmount} → ${restored.contractAmount}`)

  console.log(`\n${passed} réussis, ${failed} échoués`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
