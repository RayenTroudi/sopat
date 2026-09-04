/**
 * Aperçu documentaire LIS-MI-01 → document → structure.
 *
 * Ce que ce test protège
 * ----------------------
 * 1. Chaque ligne du registre s'ouvre et renvoie la fiche du BON document.
 * 2. La fiche parle le langage du système de management, pas celui de la base :
 *    aucun nom de table, de colonne, de type SQL ni d'identifiant technique ne
 *    doit traverser la frontière. Le test balaie la fiche sérialisée et échoue
 *    sur le moindre terme technique — c'est la garantie centrale de l'écran.
 * 3. La maquette dépend du TYPE de document : un registre se présente en
 *    tableau, un formulaire en rubriques, une procédure en plan.
 * 4. Structure et enregistrements restent distincts : la fiche décrit un modèle
 *    vierge et se contente de COMPTER les enregistrements, sans les déverser.
 * 5. Un document non mis en œuvre n'obtient aucune maquette, et porte son motif.
 * 6. Le verdict d'implémentation vient toujours de `iso-routes.ts`.
 * 7. Les catégories rapportées se referment exactement sur le registre :
 *    chaque document compte pour une et une seule d'entre elles.
 * 8. Consulter une fiche n'écrit rien.
 *
 * Lecture seule.
 *   npx tsx --env-file=.env scripts/verify-document-structure.ts
 */
import { readFileSync } from 'node:fs'
import { db } from '../db/index'
import { dmsDocuments } from '../db/schema'
import { isNull, sql } from 'drizzle-orm'
import { getDmsDocumentSheet, type DmsDocumentSheet } from '../src/lib/dms/structure'
import {
  resolveDocumentStructure, type DocumentFormSection,
} from '../src/lib/dms/document-structures'
import {
  INTENTIONALLY_UNMAPPED,
  resolveIsoDocumentRoute,
  DOCUMENT_INDEX_HREF,
} from '../src/lib/dms/iso-routes'
import { parseCode } from '../src/lib/dms/codes'

let passed = 0
let failed = 0
function check(label: string, ok: boolean, detail?: string) {
  if (ok) { passed++; console.log(`  ok   ${label}`) }
  else    { failed++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`) }
}
function section(t: string) { console.log(`\n${t}`) }

async function registryCount(): Promise<number> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)` })
    .from(dmsDocuments).where(isNull(dmsDocuments.deletedAt))
  return Number(n)
}

/**
 * Vocabulaire qui trahirait une fuite du modèle de données vers l'écran.
 * Les noms de colonnes en snake_case sont détectés par motif, pas un par un :
 * une colonne ajoutée demain serait attrapée sans toucher à cette liste.
 */
const FORBIDDEN_TERMS = [
  'dms_documents', 'dms_document_versions', 'dms_workflow_steps', 'dms_signatures',
  'dms_document_links', 'dms_permissions', 'dms_form_templates', 'dms_audit_log',
  'varchar', 'uuid', 'jsonb', 'timestamp', 'pgenum', 'notnull', 'not null',
  'primary key', 'foreign key', 'clé primaire', 'drizzle', 'migration',
]

async function main() {
  const before = await registryCount()

  const rows = await db
    .select({ id: dmsDocuments.id, documentNumber: dmsDocuments.documentNumber })
    .from(dmsDocuments)
    .where(isNull(dmsDocuments.deletedAt))
    .orderBy(dmsDocuments.documentNumber)

  console.log(`Registre LIS-MI-01 : ${rows.length} documents\n`)

  const sheets = (await Promise.all(rows.map((r) => getDmsDocumentSheet(r.id))))
    .filter((s): s is DmsDocumentSheet => s !== null)

  // ═══ 1. Ouverture ════════════════════════════════════════════════════════
  section('1. Chaque document du registre a une fiche ouvrable')
  check(`les ${rows.length} documents renvoient une fiche`, sheets.length === rows.length,
    `${rows.length - sheets.length} manquante(s)`)
  const mismatched = rows.filter((r, i) => sheets[i]?.id !== r.id)
  check('chaque fiche est celle de son propre document', mismatched.length === 0,
    mismatched.map((m) => m.documentNumber).join(', '))

  // ═══ 2. Aucun vocabulaire technique ══════════════════════════════════════
  section('2. La fiche ne laisse passer aucun terme technique')

  const offenders: string[] = []
  const snakeCase: string[] = []
  for (const s of sheets) {
    // `id` sert à construire les liens et n'est jamais affiché : on l'écarte du
    // balayage, tout le reste du contenu est inspecté.
    const payload = JSON.stringify(s, (key, value) => (key === 'id' ? undefined : value)).toLowerCase()

    for (const term of FORBIDDEN_TERMS) {
      if (payload.includes(term)) offenders.push(`${s.documentNumber} → « ${term} »`)
    }
    // Un nom de colonne : minuscules_avec_underscore, hors URL et hors codes ISO.
    for (const m of payload.matchAll(/"[a-z]+_[a-z_]+"/g)) snakeCase.push(`${s.documentNumber} → ${m[0]}`)
  }
  check('aucun nom de table, type SQL ou terme de schéma', offenders.length === 0,
    [...new Set(offenders)].slice(0, 6).join(' ; '))
  check('aucune valeur en snake_case (nom de colonne)', snakeCase.length === 0,
    [...new Set(snakeCase)].slice(0, 6).join(' ; '))

  const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/
  const leakedUuid = sheets.filter((s) =>
    uuidRe.test(JSON.stringify(s, (key, value) => (key === 'id' ? undefined : value))))
  check('aucun identifiant technique dans le contenu affiché', leakedUuid.length === 0,
    leakedUuid.map((s) => s.documentNumber).join(', '))

  // ═══ 3. La maquette suit le type de document ═════════════════════════════
  section('3. La représentation dépend du type de document')

  const withStructure = sheets.filter((s) => s.structure)
  check('des maquettes sont produites', withStructure.length > 0, `${withStructure.length}`)

  const kinds = new Set(withStructure.map((s) => s.structure!.kind))
  check('plusieurs représentations coexistent (pas un tableau générique)', kinds.size >= 2,
    [...kinds].join(', '))

  // Une procédure ne doit jamais être rendue comme un tableau vierge.
  const badProcedures = withStructure.filter(
    (s) => parseCode(s.documentNumber)?.type === 'PRC' && s.structure!.kind !== 'sections',
  )
  check('une procédure est un document rédigé, jamais un tableau', badProcedures.length === 0,
    badProcedures.map((s) => s.documentNumber).join(', '))

  const badInstructions = withStructure.filter(
    (s) => ['INS', 'ISN'].includes(parseCode(s.documentNumber)?.type ?? '') && s.structure!.kind !== 'sections',
  )
  check('une instruction est un document rédigé', badInstructions.length === 0,
    badInstructions.map((s) => s.documentNumber).join(', '))

  const registers = withStructure.filter((s) => s.structure!.kind === 'register')
  const emptyCols = registers.filter((s) => (s.structure as { columns: string[] }).columns.length === 0)
  check(`les ${registers.length} registres déclarent leurs colonnes`, emptyCols.length === 0,
    emptyCols.map((s) => s.documentNumber).join(', '))

  const forms = withStructure.filter((s) => s.structure!.kind === 'form')
  check('des formulaires sont rendus en rubriques', forms.length > 0,
    forms.map((s) => s.documentNumber).join(', '))

  // Une rubrique de formulaire porte des champs OU un tableau, jamais rien.
  const emptySection = forms.filter((s) => {
    const sections = (s.structure as { sections: DocumentFormSection[] }).sections
    return sections.length === 0 || sections.some((sec) =>
      ('fields' in sec ? sec.fields.length === 0 : sec.columns.length === 0) || sec.title.trim() === '')
  })
  check('chaque rubrique de formulaire est intitulée et non vide', emptySection.length === 0,
    emptySection.map((s) => s.documentNumber).join(', '))

  const checklists = withStructure.filter((s) => s.structure!.kind === 'checklist')
  check('des check-lists sont rendues comme telles', checklists.length > 0,
    checklists.map((s) => s.documentNumber).join(', '))

  // Les points de contrôle imprimés sur le formulaire vierge font partie du
  // document : quand ils existent, ils doivent être non vides et distincts.
  const badItems = checklists.filter((s) => {
    const items = (s.structure as { items?: string[] }).items
    if (!items) return false
    return items.length === 0
      || items.some((i) => i.trim() === '')
      || new Set(items).size !== items.length
  })
  check('les points de contrôle sont renseignés et sans doublon', badItems.length === 0,
    badItems.map((s) => s.documentNumber).join(', '))

  // Un plan type doit s'annoncer comme tel, sinon il se lirait comme le
  // sommaire réel du document consulté.
  const typical = sheets.filter((s) => s.structureIsTypicalPlan)
  const typicalNotSections = typical.filter((s) => s.structure?.kind !== 'sections')
  check(`les ${typical.length} plans types sont signalés et rédigés`, typicalNotSections.length === 0)

  // Un document vivant dans un conteneur ne doit jamais reprendre la maquette
  // de son conteneur. On le vérifie par l'absurde : le registre transversal
  // LIS-RE-02 liste les projets, aucune fiche de chantier ne peut lui être
  // identique.
  const containerCodes = ['LIS-RE-02', 'FOR-CO-01', 'FOR-ET-01']
  const containerShapes = new Map(
    containerCodes
      .map((c) => [c, resolveDocumentStructure(c)?.structure])
      .filter((e): e is [string, NonNullable<ReturnType<typeof resolveDocumentStructure>>['structure']] => !!e[1]),
  )
  const inherited: string[] = []
  for (const s of withStructure) {
    if (containerCodes.includes(s.documentNumber)) continue
    const route = resolveIsoDocumentRoute(s.documentNumber)
    if (!route?.within) continue
    for (const [code, shape] of containerShapes) {
      if (JSON.stringify(shape) === JSON.stringify(s.structure)) {
        inherited.push(`${s.documentNumber} = ${code}`)
      }
    }
  }
  check('aucun document imbriqué n’hérite de la maquette de son conteneur',
    inherited.length === 0, inherited.join(' ; '))

  // Deux documents distincts ne peuvent pas partager la MEME maquette au
  // caractère près, sauf lorsque l'ERP les sert réellement par un seul écran.
  // Ce fut la faute principale relevée à l'audit : l'écran de LISTE d'un module
  // était pris pour la maquette de chaque document du module, si bien que la
  // « Demande de recrutement » recevait le tableau de suivi des postes.
  //
  // Les partages ci-dessous sont vérifiés un par un et assumés.
  const SHARED_ON_PURPOSE: Record<string, string> = {
    'PLA-MI-04|PLA-MI-05': "identification et évaluation des aspects sont deux faces d'un même registre",
    'FOR-MI-08|LIS-MI-07': "l'écoute des parties intéressées et leur registre sont tenus dans le même tableau",
  }
  const shapes = new Map<string, string[]>()
  for (const s2 of withStructure) {
    // Un plan type EST partagé par construction, et l'écran le signale comme
    // tel : il n'entre pas dans ce contrôle.
    if (s2.structureIsTypicalPlan) continue
    const key = JSON.stringify(s2.structure)
    if (!shapes.has(key)) shapes.set(key, [])
    shapes.get(key)!.push(s2.documentNumber)
  }
  const undeclared: string[] = []
  for (const codes of shapes.values()) {
    if (codes.length < 2) continue
    const key = [...codes].sort().join('|')
    if (!SHARED_ON_PURPOSE[key]) undeclared.push(key)
  }
  check('tout partage de maquette entre documents est assumé et justifié',
    undeclared.length === 0, undeclared.join(' ; '))

  // Un document qui s'instancie une fois par cas — une fiche, une demande, un
  // bon, un ordre, un PV — ne peut pas emprunter sa maquette a l'ecran de
  // LISTE d'un module : cette liste recense ses instances, elle n'est pas lui.
  const INSTANCE_WORDS = /^(fiche|demande|bon|ordre|recu|reçu|pv|attestation|autorisation|feuille|check-?list)\b/i
  const moduleListScreen = /^[a-z-]+(\/[a-z-]+)*\/(page|[A-Za-z]+Client)\.tsx$/
  const borrowed = withStructure.filter((s2) => {
    if (!INSTANCE_WORDS.test(s2.title.trim())) return false
    const screen = (s2.structure as { screen?: string }).screen ?? ''
    if (screen.includes('[id]') || screen.includes('/new') || screen.startsWith('components/')) return false
    return moduleListScreen.test(screen)
  })
  check('aucun document unitaire n’emprunte la maquette d’un écran de liste',
    borrowed.length === 0,
    borrowed.map((s2) => `${s2.documentNumber} ← ${(s2.structure as { screen?: string }).screen}`).join(' ; '))

  // ── Identité des trois plans de management ─────────────────────────────
  // Le registre 2025 attribue PLA-MI-02 aux « initiatives solidaires » et
  // PLA-MI-03 au « Plan de communication ». L'écran a longtemps intitulé son
  // tableau de communication « (PLA-MI-02) », par report d'une erreur du plan
  // de construction. Ces contrôles interdisent le retour de la confusion.
  const plaScreen = readFileSync('src/app/admin/(dashboard)/management-plan/page.tsx', 'utf8')
  check("l’écran attribue le plan de communication à PLA-MI-03",
    plaScreen.includes('Plan de Communication (PLA-MI-03)')
      && !plaScreen.includes('Plan de Communication (PLA-MI-02)'))

  const pla01 = resolveDocumentStructure('PLA-MI-01')?.structure
  const pla02 = resolveDocumentStructure('PLA-MI-02')?.structure
  const pla03 = resolveDocumentStructure('PLA-MI-03')?.structure

  check('PLA-MI-01 porte la grille annuelle, pas le plan de communication',
    !!pla01 && pla01.kind === 'register'
      && (pla01 as { columns: string[] }).columns.some((c) => c.includes('Objectif')))
  check('PLA-MI-03 porte bien le plan de communication (Cible, Moyen)',
    !!pla03 && pla03.kind === 'register'
      && ['Cible', 'Moyen'].every((c) => (pla03 as { columns: string[] }).columns.includes(c)))
  check('PLA-MI-02 « initiatives solidaires » n’emprunte la maquette d’aucun des deux autres',
    pla02 === undefined
      || (JSON.stringify(pla02) !== JSON.stringify(pla03)
       && JSON.stringify(pla02) !== JSON.stringify(pla01)),
    pla02 ? 'maquette présente : ' + JSON.stringify(pla02).slice(0, 80) : 'aucune maquette')

  // ── Destination de PLA-MI-02 ───────────────────────────────────────────
  // « Plan des initiatives solidaires » pointait sur /admin/management-plan,
  // écran qui ne porte que la grille annuelle (PLA-MI-01) et le plan de
  // communication (PLA-MI-03). Les initiatives solidaires sont planifiées dans
  // /admin/rse/events. Ces contrôles empêchent le retour en arrière.
  const pla02Route = resolveIsoDocumentRoute('PLA-MI-02')
  check('PLA-MI-02 ne pointe plus sur le plan de management',
    pla02Route?.href !== '/admin/management-plan',
    `obtenu ${pla02Route?.href}`)
  check('PLA-MI-02 mène au module des initiatives solidaires',
    pla02Route?.href === '/admin/rse/events', `obtenu ${pla02Route?.href}`)

  // La destination doit être la page de travail, pas le conteneur RSE, qui
  // n'est qu'une redirection vers les partenariats.
  check('PLA-MI-02 ne mène pas au conteneur RSE',
    pla02Route?.href !== '/admin/rse', `obtenu ${pla02Route?.href}`)

  // Les partenariats sont un registre de conventions, pas un plan d'initiatives.
  check('PLA-MI-02 ne mène pas au registre des conventions',
    pla02Route?.href !== '/admin/rse/partnerships', `obtenu ${pla02Route?.href}`)

  // Les trois plans doivent viser trois écrans distincts.
  const planHrefs = ['PLA-MI-01', 'PLA-MI-02', 'PLA-MI-03']
    .map((c) => resolveIsoDocumentRoute(c)?.href)
  check('les trois plans de management visent des écrans cohérents',
    planHrefs[0] === '/admin/management-plan'
      && planHrefs[2] === '/admin/management-plan'
      && planHrefs[1] !== planHrefs[0],
    planHrefs.join(' | '))

  // « Ouvrir le module » et la table de routage doivent désigner le même écran :
  // la fiche affiche l'un, le catalogue cite l'autre.
  const pla02Sheet = sheets.find((x) => x.documentNumber === 'PLA-MI-02')
  check('la fiche PLA-MI-02 ouvre bien ce module',
    pla02Sheet?.implementation.href === '/admin/rse/events',
    `obtenu ${pla02Sheet?.implementation.href}`)
  const pla02Structure = resolveDocumentStructure('PLA-MI-02')?.structure
  check('la maquette de PLA-MI-02 est citée depuis le module RSE',
    (pla02Structure as { screen?: string } | undefined)?.screen?.startsWith('components/rse') === true,
    (pla02Structure as { screen?: string } | undefined)?.screen)

  // Le titre porté par le registre doit rester celui de la source 2025 : c'est
  // lui qui a tranché la confusion, il ne doit pas dériver en sens inverse.
  const byCode = new Map(sheets.map((x) => [x.documentNumber, x]))
  check('le registre garde PLA-MI-02 = initiatives solidaires',
    byCode.get('PLA-MI-02')?.title.toLowerCase().includes('initiatives solidaires') === true,
    byCode.get('PLA-MI-02')?.title)
  check('le registre garde PLA-MI-03 = plan de communication',
    byCode.get('PLA-MI-03')?.title.toLowerCase().includes('communication') === true,
    byCode.get('PLA-MI-03')?.title)

  // Les elements de maitrise que l'ERP n'applique pas doivent etre signales.
  // Les afficher nus laisserait croire a un controle en vigueur.
  const CONTROL_KEYS = [
    'access', 'modification', 'approval', 'version',
    'effectiveDate', 'review', 'confidentiality', 'retention', 'passwordManaged',
  ] as const
  const missingKey = sheets.filter((x) =>
    CONTROL_KEYS.some((k) => typeof x.control.enforcement[k] !== 'boolean'))
  check(`les ${CONTROL_KEYS.length} éléments de maîtrise déclarent tous leur statut`,
    missingKey.length === 0, missingKey.map((x) => x.documentNumber).join(', '))

  // Appliqués : la garde de session, le contrôle de rôle, la porte
  // d'approbation avant publication, et l'alerte de revue.
  check('consultation, modification, approbation et revue sont donnés pour appliqués',
    sheets.every((x) => x.control.enforcement.access
      && x.control.enforcement.modification
      && x.control.enforcement.approval
      && x.control.enforcement.review))

  // Non appliqués : aucun code ne les lit pour décider quoi que ce soit.
  check('confidentialité, conservation et mot de passe ne sont jamais donnés pour appliqués',
    sheets.every((x) => !x.control.enforcement.confidentiality
      && !x.control.enforcement.retention
      && !x.control.enforcement.passwordManaged))

  // Version et date d'effet ne sont tenues par le cycle de vie qu'à partir du
  // moment où une version existe ; sinon ce sont des mentions du registre.
  const versionClaim = sheets.filter((x) =>
    x.control.enforcement.version !== (x.revisions.length > 0)
    || x.control.enforcement.effectiveDate !== (x.revisions.length > 0))
  check('version et date d’effet ne sont dites appliquées que si une version existe',
    versionClaim.length === 0, versionClaim.map((x) => x.documentNumber).join(', '))

  // ═══ 4. Structure ≠ enregistrements ══════════════════════════════════════
  section('4. La maquette reste un modèle vierge')

  // La fiche compte les enregistrements ; elle n'en transporte aucun.
  const carriesRecords = sheets.filter((s) => 'records' in s || 'rows' in (s.structure ?? {}))
  check('aucun enregistrement opérationnel n’est embarqué dans la maquette', carriesRecords.length === 0)
  const counted = sheets.filter((s) => s.recordCount > 0)
  check('les enregistrements sont comptés, pas listés', counted.every((s) => typeof s.recordCount === 'number'),
    `${counted.length} document(s) rattaché(s)`)

  // ═══ 5. Non implémenté ═══════════════════════════════════════════════════
  section('5. Un document non mis en œuvre n’obtient pas de maquette')

  const unimplemented = sheets.filter((s) => !s.implementation.implemented)
  const fabricated = unimplemented.filter((s) => s.structure !== null)
  check(`aucune maquette pour les ${unimplemented.length} documents non implémentés`,
    fabricated.length === 0, fabricated.map((s) => s.documentNumber).join(', '))

  const documented = unimplemented.filter((s) => INTENTIONALLY_UNMAPPED[s.documentNumber])
  const lostReason = documented.filter((s) => !s.implementation.reason)
  check(`les ${documented.length} motifs documentés sont remontés`, lostReason.length === 0,
    lostReason.map((s) => s.documentNumber).join(', '))

  const fakeHref = unimplemented.filter((s) => s.implementation.href !== null)
  check('aucun document non implémenté n’annonce de page', fakeHref.length === 0,
    fakeHref.map((s) => s.documentNumber).join(', '))

  // ═══ 6. Le verdict vient de iso-routes ═══════════════════════════════════
  section('6. Le verdict d’implémentation vient de iso-routes.ts')

  const divergent = sheets.filter((s) => {
    const expected = (resolveIsoDocumentRoute(s.documentNumber)?.kind ?? 'reference') !== 'reference'
    return s.implementation.implemented !== expected
  })
  check('aucun document ne diverge de la table de routage', divergent.length === 0,
    divergent.map((s) => s.documentNumber).join(', '))

  const implemented = sheets.filter((s) => s.implementation.implemented)
  const noHref = implemented.filter((s) => !s.implementation.href)
  check(`les ${implemented.length} documents implémentés portent une destination`, noHref.length === 0,
    noHref.map((s) => s.documentNumber).join(', '))

  const selfPointing = sheets.filter(
    (s) => !['LIS-MI-01', 'PRC-MI-01'].includes(s.documentNumber)
      && s.implementation.href === DOCUMENT_INDEX_HREF,
  )
  check('aucun document ne se replie sur le registre', selfPointing.length === 0,
    selfPointing.map((s) => s.documentNumber).join(', '))

  // Le catalogue ne doit jamais décrire un document que l'ERP n'implémente pas.
  const ghost = sheets.filter(
    (s) => !s.implementation.implemented && resolveDocumentStructure(s.documentNumber) !== null
      && s.structure !== null,
  )
  check('le catalogue n’est jamais consulté pour un document non implémenté', ghost.length === 0)

  // ═══ 7. Réconciliation des comptes ═══════════════════════════════════════
  // Les chiffres rapportés à l'extérieur ont déjà été additionnés à la main, et
  // une addition à la main se trompe : un ajout de formulaire avait été compté
  // à la fois en formulaire et en registre. Les catégories sont donc comptées
  // ici, une seule fois, et doivent se refermer exactement sur le registre.
  section('7. Réconciliation des comptes')

  const buckets: Record<string, string[]> = {
    'non implémentés': [], 'plan type': [], 'structure non décrite': [],
    register: [], form: [], checklist: [], sections: [],
  }
  for (const x of sheets) {
    if (!x.implementation.implemented) { buckets['non implémentés'].push(x.documentNumber); continue }
    if (!x.structure) { buckets['structure non décrite'].push(x.documentNumber); continue }
    if (x.structureIsTypicalPlan) { buckets['plan type'].push(x.documentNumber); continue }
    buckets[x.structure.kind].push(x.documentNumber)
  }
  const size = (k: string) => buckets[k].length
  const relevees = size('register') + size('form') + size('checklist') + size('sections')
  const implementedCount = relevees + size('plan type') + size('structure non décrite')
  const totalCount = implementedCount + size('non implémentés')

  // Chaque document tombe dans exactement une catégorie : ni oubli, ni double
  // compte. C'est ce qui rend la somme des catégories opposable au total.
  const assigned = Object.values(buckets).flat()
  check('les catégories sont mutuellement exclusives et couvrent tout le registre',
    assigned.length === sheets.length && new Set(assigned).size === sheets.length,
    `${assigned.length} affectations pour ${sheets.length} documents`)

  check(`registres + formulaires + check-lists + plans types + non décrits = ${implementedCount} implémentés`,
    implementedCount === sheets.filter((x) => x.implementation.implemented).length,
    `${relevees} + ${size('plan type')} + ${size('structure non décrite')} ≠ ${sheets.filter((x) => x.implementation.implemented).length}`)

  check(`implémentés + non implémentés = ${sheets.length} documents`,
    totalCount === sheets.length, `${implementedCount} + ${size('non implémentés')} = ${totalCount}`)

  console.log('\n  Comptes faisant foi — à reprendre tels quels dans tout rapport :')
  console.log(`    Total documents        ${sheets.length}`)
  console.log(`      implémentés          ${implementedCount}`)
  console.log(`      non implémentés      ${size('non implémentés')}`)
  console.log(`    Maquettes relevées     ${relevees}`)
  console.log(`      registres            ${size('register')}`)
  console.log(`      formulaires          ${size('form')}`)
  console.log(`      check-lists          ${size('checklist')}`)
  console.log(`      documents rédigés    ${size('sections')}`)
  console.log(`    Plan type              ${size('plan type')}`)
  console.log(`    Structure non décrite  ${size('structure non décrite')}` +
    (size('structure non décrite') ? `   (${buckets['structure non décrite'].join(', ')})` : ''))

  // ═══ 8. Consultation sans écriture ═══════════════════════════════════════
  section('8. Consulter une fiche n’écrit rien')
  const after = await registryCount()
  check(`le registre est resté à ${before} documents`, after === before, `observé : ${after}`)

  console.log(`\n${passed} réussis, ${failed} échoués`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
