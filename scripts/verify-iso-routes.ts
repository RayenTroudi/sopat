/**
 * Routage « code ISO → page ERP » de la recherche globale.
 *
 * Deux moitiés :
 *
 *  1. **Résolveur** (pur, sans base) — normalisation des codes et destination
 *     de chaque famille. La propriété qui compte est négative : hormis
 *     LIS-MI-01 et PRC-MI-01, aucun code ne doit résoudre vers `/admin/documents`,
 *     et un code inconnu ne doit résoudre vers aucune page du tout.
 *
 *  2. **Recherche globale** (lecture seule sur la base) — les mêmes codes tapés
 *     tels qu'un utilisateur les tape, en vérifiant la destination réellement
 *     renvoyée par `searchByDmsCode`. Aucune écriture, aucune séquence
 *     consommée : le script est rejouable à volonté.
 *
 *   npx tsx --env-file=.env scripts/verify-iso-routes.ts
 */
import { selectTestTarget } from './lib/test-target'

// Doit précéder la première opération base : `db` est un Proxy paresseux qui
// résout DATABASE_URL au premier usage, pas à l'import.
const target = selectTestTarget(false)
console.log(`Cible : ${target.label}\n`)

import {
  DOCUMENT_INDEX_HREF,
  INTENTIONALLY_UNMAPPED,
  UNMAPPED_DESTINATION,
  extractIsoCode,
  isoRouteTable,
  normalizeIsoCode,
  resolveIsoDocumentRoute,
} from '../src/lib/dms/iso-routes'
import { searchByDmsCode, type DmsSearchResult } from '../src/lib/dms/search'

let passed = 0
let failed = 0

function check(label: string, ok: boolean, detail = '') {
  if (ok) { passed++; console.log(`  ok   ${label}`) }
  else { failed++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`) }
}

function section(title: string) {
  console.log(`\n${title}`)
}

/**
 * Destination, fil d'Ariane et contenant attendus pour un document imbriqué.
 * Vérifie au passage que `destination` ne réintroduit pas la parenthèse que
 * `within` remplace — c'est la régression que ce champ existe pour empêcher.
 */
function expectWithin(code: string, href: string, destination: string, within: string) {
  const r = resolveIsoDocumentRoute(code)
  check(
    `${code} → ${href} ↳ dans ${within}`,
    !!r && r.href === href && r.destination === destination && r.within === within,
    `obtenu href=${String(r?.href)} destination=${JSON.stringify(r?.destination)} within=${JSON.stringify(r?.within)}`,
  )
  check(
    `${code} — le fil d’Ariane ne contient plus de parenthèse d’imbrication`,
    !!r && !/\((onglet|dans |sur )/i.test(r.destination),
    JSON.stringify(r?.destination),
  )
}

/** Destination attendue pour un code, telle que le résolveur doit la rendre. */
function expectRoute(input: string, href: string | null, kindLabel = '') {
  const r = resolveIsoDocumentRoute(input)
  const actual = r ? r.href : '<aucun code reconnu>'
  check(
    `${input} → ${href ?? 'aucune destination'}${kindLabel ? ` (${kindLabel})` : ''}`,
    !!r && r.href === href,
    `obtenu ${actual === null ? 'null' : actual}`,
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Normalisation
// ─────────────────────────────────────────────────────────────────────────────

function resolverTests() {
  section('1. Normalisation des codes')

  check('exact — FOR-CO-02', normalizeIsoCode('FOR-CO-02') === 'FOR-CO-02')
  check('minuscules — for-co-02', normalizeIsoCode('for-co-02') === 'FOR-CO-02')
  check('espaces — FOR CO 02', normalizeIsoCode('FOR CO 02') === 'FOR-CO-02')
  check('collé — forco02', normalizeIsoCode('forco02') === 'FOR-CO-02')
  check('points — for.co.02', normalizeIsoCode('for.co.02') === 'FOR-CO-02')
  check('séquence à 1 chiffre — FOR-CO-2', normalizeIsoCode('FOR-CO-2') === 'FOR-CO-02')
  check('séquence à 3 chiffres — FOR-MI-100', normalizeIsoCode('FOR-MI-100') === 'FOR-MI-100')
  check('suffixe VA — org-mi-02-va', normalizeIsoCode('org-mi-02-va') === 'ORG-MI-02-VA')
  check('type invalide — ABC-CO-02', normalizeIsoCode('ABC-CO-02') === null)
  check('processus invalide — FOR-ZZ-02', normalizeIsoCode('FOR-ZZ-02') === null)
  check('texte libre — bordereau', normalizeIsoCode('bordereau') === null)

  section('2. Code noyé dans un texte plus long')

  check('« FOR-CO-02 bordereau »', extractIsoCode('FOR-CO-02 bordereau') === 'FOR-CO-02')
  check('« bordereau for-co-02 »', extractIsoCode('bordereau for-co-02') === 'FOR-CO-02')
  check('ponctuation — « (FOR-CO-02) »', extractIsoCode('(FOR-CO-02)') === 'FOR-CO-02')
  check('titre de document — « FOR CO 02 Bordereau des prix »',
    extractIsoCode('FOR CO 02 Bordereau des prix') === 'FOR-CO-02')
  check('deux-points — « Code: for/co/02 »', extractIsoCode('Code: for/co/02') === 'FOR-CO-02')
  check('code à 3 chiffres non tronqué — « audit FOR-MI-100 »',
    extractIsoCode('audit FOR-MI-100') === 'FOR-MI-100')
  check('aucun code — « rapport annuel »', extractIsoCode('rapport annuel') === null)
  check('résolution depuis un texte long', resolveIsoDocumentRoute('FOR-CO-02 bordereau')?.href === '/admin/commercial/offers')
  check('résolution depuis un titre', resolveIsoDocumentRoute('FOR AC 10 Suivi approvisionnement')?.href === '/admin/achat/supply-tracking')

  section('3. Destinations exigées')

  expectRoute('LIS-MI-01', DOCUMENT_INDEX_HREF, 'registre documentaire')
  expectRoute('lis-mi-01', DOCUMENT_INDEX_HREF)
  expectRoute('FOR-CO-02', '/admin/commercial/offers')
  expectRoute('for-co-02', '/admin/commercial/offers')
  expectRoute('FOR-AC-10', '/admin/achat/supply-tracking')
  expectRoute('FOR-MI-05', '/admin/nc')
  expectRoute('FOR-MI-14', '/admin/audit-programs')
  expectRoute('FOR-MI-12', '/admin/environment/hse-checklist')
  expectRoute('PLA-MI-04', '/admin/environment/aspects')
  expectRoute('FOR-AC-11', '/admin/suppliers')
  expectRoute('FOR-RH-14', '/admin/rh/leaves')
  expectRoute('LIS-ET-03', '/admin/etude/plant-species')
  expectRoute('ORG-MI-09', '/admin/knowledge')

  check('LIS-MI-01 est classé « document_index »',
    resolveIsoDocumentRoute('LIS-MI-01')?.kind === 'document_index')
  check('FOR-CO-02 est classé « operational »',
    resolveIsoDocumentRoute('FOR-CO-02')?.kind === 'operational')

  section('4. Document mis en œuvre à l’intérieur d’une autre page')

  // Ces documents n'ont pas de page à eux : le bordereau vit dans une offre,
  // les check-lists qualité dans l'onglet « Réalisation » d'un projet. `href`
  // mène au registre d'où l'on ouvre ce contenant, et `within` le nomme.
  // L'imbrication est un champ, jamais une parenthèse dans `destination` :
  // l'interface doit pouvoir la présenter comme telle.
  expectWithin('FOR-CO-02', '/admin/commercial/offers', 'Commercial / Bordereau des prix', 'FOR-CO-01 (Offre)')
  expectWithin('FOR-RE-09', '/admin/realisation', 'Réalisation / Check-list plantations', 'Onglet projet')
  expectWithin('FOR-RE-03', '/admin/realisation', 'Réalisation / Fiche équipe projet', 'Onglet projet')
  expectWithin('PLA-RE-05', '/admin/realisation', 'Réalisation / Planning Gantt', 'Onglet projet')
  expectWithin('INS-RE-01', '/admin/realisation', 'Réalisation / Instruction projet — check-lists qualité', 'Onglet projet')
  expectWithin('FOR-ET-02', '/admin/etude/study-register', 'Étude / Fiche projet', 'Fiche projet')
  expectWithin('PLA-RE-01', '/admin/calendrier-entretien', "Entretien / Planning annuel d'entretien", 'Onglet Entretien du projet')
  expectWithin('PLA-RE-04', '/admin/calendrier-entretien', "Entretien / Plan d'action mensuel", 'Onglet Entretien du projet')

  // Une page qui met le document en œuvre directement ne porte pas de contenant.
  expectRoute('ORG-MI-07', '/admin/context', 'politique publiée dans « Contexte »')
  for (const code of ['FOR-AC-10', 'FOR-CO-01', 'LIS-MI-01', 'LIS-RE-02', 'FOR-RH-14']) {
    check(`${code} n’a pas de contenant`, resolveIsoDocumentRoute(code)?.within === undefined,
      `obtenu ${String(resolveIsoDocumentRoute(code)?.within)}`)
  }
  check('un code non routé n’a pas de contenant',
    resolveIsoDocumentRoute('FOR-RH-44')?.within === undefined)

  section('5. Documents de référence sans page opérationnelle')

  for (const [code, reason] of Object.entries(INTENTIONALLY_UNMAPPED)) {
    const r = resolveIsoDocumentRoute(code)
    check(
      `${code} — ${reason.split('—')[0].trim()}`,
      !!r && r.kind === 'reference' && r.href === null && r.destination === UNMAPPED_DESTINATION,
      `obtenu ${r ? String(r.href) : 'null'}`,
    )
  }

  section('6. Aucun repli LIS-MI-01')

  // La règle centrale : un code de forme ISO mais inconnu du registre ne doit
  // proposer aucune destination — surtout pas la page LIS-MI-01.
  for (const unknown of ['FOR-CO-99', 'PLA-RH-77', 'lis-re-88', 'INS-MI-14', 'FOR-MI-250']) {
    const r = resolveIsoDocumentRoute(unknown)
    check(`${unknown} ne mène nulle part`, !!r && r.href === null, `obtenu ${r ? String(r.href) : 'null'}`)
  }

  const toIndex = Object.entries(isoRouteTable())
    .filter(([, e]) => e.href === DOCUMENT_INDEX_HREF)
    .map(([code]) => code)
    .sort()
  check(
    `seuls LIS-MI-01 et PRC-MI-01 mènent à ${DOCUMENT_INDEX_HREF}`,
    toIndex.join(',') === 'LIS-MI-01,PRC-MI-01',
    `obtenu ${toIndex.join(', ') || '(aucun)'}`,
  )

  check('une saisie sans code ISO n’est pas résolue', resolveIsoDocumentRoute('villa somrani') === null)
  check('une saisie vide n’est pas résolue', resolveIsoDocumentRoute('') === null)

  section('7. Cohérence du tableau de routage')

  const table = isoRouteTable()
  const badKeys = Object.keys(table).filter((k) => normalizeIsoCode(k) !== k)
  check('toutes les clés sont des codes normalisés', badKeys.length === 0, badKeys.join(', '))

  const badHrefs = Object.entries(table).filter(([, e]) => !e.href.startsWith('/admin/'))
  check('toutes les destinations sont des routes /admin', badHrefs.length === 0,
    badHrefs.map(([c]) => c).join(', '))

  const overlap = Object.keys(INTENTIONALLY_UNMAPPED).filter((c) => c in table)
  check('aucun code n’est à la fois routé et déclaré non routé', overlap.length === 0, overlap.join(', '))

  // L'invariant qui fait tenir la migration : aucune entrée ne doit plus
  // signaler l'imbrication en prose. Le champ `within` est le seul canal.
  const inlineHints = Object.entries(table)
    .filter(([, e]) => /\((onglet|dans |sur )/i.test(e.destination))
    .map(([code]) => code)
  check('aucun fil d’Ariane ne code l’imbrication en parenthèse', inlineHints.length === 0,
    inlineHints.join(', '))

  const withinEntries = Object.entries(table).filter(([, e]) => e.within)
  check(`${withinEntries.length} codes déclarent un contenant`, withinEntries.length === 19,
    withinEntries.map(([c]) => c).join(', '))

  const blankWithin = withinEntries.filter(([, e]) => (e.within ?? '').trim() === '')
  check('aucun contenant vide', blankWithin.length === 0, blankWithin.map(([c]) => c).join(', '))
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Recherche globale de bout en bout
// ─────────────────────────────────────────────────────────────────────────────

function find(results: DmsSearchResult[], code: string): DmsSearchResult | undefined {
  const wanted = normalizeIsoCode(code)
  return results.find((r) => normalizeIsoCode(r.code) === wanted)
}

async function searchTests() {
  section('8. Recherche globale — destination effective')

  const cases: { query: string; code: string; href: string | null; label: string }[] = [
    { query: 'LIS-MI-01',            code: 'LIS-MI-01', href: DOCUMENT_INDEX_HREF,        label: 'registre LIS-MI-01' },
    { query: 'FOR-CO-02',            code: 'FOR-CO-02', href: '/admin/commercial/offers', label: 'bordereau des prix' },
    { query: 'for-co-02',            code: 'FOR-CO-02', href: '/admin/commercial/offers', label: 'minuscules' },
    { query: 'FOR-CO-02 bordereau',  code: 'FOR-CO-02', href: '/admin/commercial/offers', label: 'code noyé dans la requête' },
    { query: 'FOR-AC-10',            code: 'FOR-AC-10', href: '/admin/achat/supply-tracking', label: 'suivi appro chantier' },
    { query: 'FOR-MI-12',            code: 'FOR-MI-12', href: '/admin/environment/hse-checklist', label: 'check-list SME & SST' },
    { query: 'FOR-RE-09',            code: 'FOR-RE-09', href: '/admin/realisation',        label: 'check-list dans l’onglet projet' },
    { query: 'LIS-MI-04',            code: 'LIS-MI-04', href: null,                        label: 'référence sans page' },
    { query: 'ORG-RH-02',            code: 'ORG-RH-02', href: null,                        label: 'document statique' },
  ]

  for (const c of cases) {
    const results = await searchByDmsCode(c.query)
    const hit = find(results, c.code)
    if (!hit) {
      check(`« ${c.query} » → ${c.label}`, false, 'code absent des résultats')
      continue
    }
    check(
      `« ${c.query} » → ${c.href ?? 'aucune destination'} (${c.label})`,
      hit.href === c.href,
      `obtenu ${hit.href === null ? 'null' : hit.href}`,
    )
  }

  // Le contenant doit survivre au trajet base → API → composant : c'est lui qui
  // empêche le résultat de promettre l'ouverture directe du document.
  for (const [query, code, within] of [
    ['FOR-CO-02', 'FOR-CO-02', 'FOR-CO-01 (Offre)'],
    ['FOR-RE-09', 'FOR-RE-09', 'Onglet projet'],
    ['PLA-RE-04', 'PLA-RE-04', 'Onglet Entretien du projet'],
  ] as const) {
    const hit = find(await searchByDmsCode(query), code)
    check(`« ${query} » remonte son contenant « ${within} »`, hit?.within === within,
      `obtenu ${JSON.stringify(hit?.within)}`)
  }
  const plain = find(await searchByDmsCode('FOR-AC-10'), 'FOR-AC-10')
  check('« FOR-AC-10 » n’annonce aucun contenant', plain?.within === null,
    `obtenu ${JSON.stringify(plain?.within)}`)

  section('9. Aucun résultat ne promet LIS-MI-01 à tort')

  const probes = [
    'FOR', 'LIS', 'PRC-MI', 'FOR-MI', 'ORG-MI', 'PLA', 'INS-MI', 'suivi', 'registre', 'fiche',
  ]
  const offenders: string[] = []
  for (const p of probes) {
    for (const r of await searchByDmsCode(p, 40)) {
      if (r.href !== DOCUMENT_INDEX_HREF) continue
      const code = normalizeIsoCode(r.code)
      if (code !== 'LIS-MI-01' && code !== 'PRC-MI-01') offenders.push(`${p} → ${r.code}`)
    }
  }
  check(`aucune destination ${DOCUMENT_INDEX_HREF} injustifiée sur ${probes.length} requêtes larges`,
    offenders.length === 0, offenders.slice(0, 8).join(' ; '))

  section('10. Définition maîtrisée et enregistrement ne se confondent pas')

  // Avant la migration 0038, `attachDmsCode()` donnait à chaque entité ERP son
  // propre code de registre : un fournisseur était « LIS-AC-01 », un projet
  // « PRS-RE-03 », une NC « FOR-MI-21 ». Cette section vérifiait qu'on
  // retrouvait bien l'entité par ce code — autrement dit elle CODIFIAIT le bug.
  //
  // Ces codes n'existent plus. Un enregistrement porte désormais le code de la
  // DÉFINITION qu'il applique (le même FOR-AC-03 pour tous les bons de
  // commande), qui n'identifie donc plus la ligne. Ce qui est vérifié ici est
  // la règle de remplacement : chercher un code du registre mène au formulaire
  // maîtrisé, jamais à l'une de ses instances.

  const nonNull = async (q: string, expect: (r: DmsSearchResult[]) => boolean, label: string) => {
    const rows = await searchByDmsCode(q)
    check(`${label} — « ${q} »`, rows.length > 0 && expect(rows), `${rows.length} résultat(s)`)
  }

  await nonNull('FOR-MI-05', (r) => r.some((x) => x.href === '/admin/nc'), 'registre NC')

  // Un code de définition ne doit ramener QUE la définition : si un bon de
  // commande remontait sous « FOR-AC-03 », l'égalité exacte le classerait ex
  // æquo avec le formulaire et l'utilisateur pourrait atterrir sur un achat de
  // palmiers en cherchant le bon de commande vierge.
  const OPERATIONAL: DmsSearchResult['entityType'][] = [
    'purchase_order', 'non_conformance', 'corrective_action',
    'audit_log', 'audit_program', 'project', 'client', 'supplier',
  ]
  for (const code of ['FOR-AC-03', 'FOR-MI-05', 'PRC-MI-04', 'FOR-MI-13', 'FOR-MI-14']) {
    const claimants = (await searchByDmsCode(code))
      .filter((r) => normalizeIsoCode(r.code) === normalizeIsoCode(code))
      .filter((r) => OPERATIONAL.includes(r.entityType))
    check(
      `« ${code} » n’est revendiqué par aucun enregistrement opérationnel`,
      claimants.length === 0,
      claimants.map((c) => `${c.entityType}:${c.label}`).slice(0, 4).join(' | '),
    )
  }

  // Les entités restent retrouvables — par leur PROPRE référence, la seule qui
  // les identifie réellement.
  for (const [q, label] of [['NC-', 'NC par sa référence'], ['AUD-', 'audit par sa référence']] as const) {
    const rows = await searchByDmsCode(q, 40)
    check(`${label} — « ${q} »`, rows.length > 0, `${rows.length} résultat(s)`)
  }

  // Un code ne doit jamais apparaître deux fois : une fois vers une entité et
  // une fois sans destination. La garantie est conservée, sur des codes qui,
  // eux, existent réellement au registre.
  for (const q of ['FOR-AC-03', 'FOR-MI-05', 'FOR-CO-02']) {
    const rows = await searchByDmsCode(q)
    const dupes = rows.filter((r) => normalizeIsoCode(r.code) === normalizeIsoCode(q))
    check(`« ${q} » ne renvoie qu’une destination`, dupes.length === 1,
      dupes.map((d) => `${d.entityType}:${d.href}`).join(' | '))
  }
}

async function main() {
  resolverTests()
  await searchTests()

  console.log(`\n${passed} ok, ${failed} échec(s)`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
