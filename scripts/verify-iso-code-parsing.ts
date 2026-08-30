/**
 * Test de résistance de l'analyse des codes ISO — `normalizeIsoCode` et
 * `extractIsoCode` de `src/lib/dms/iso-routes.ts`.
 *
 * Ces deux fonctions décident si une chaîne EST un code du registre, et
 * laquelle. Toute la résolution de destination de la recherche globale repose
 * dessus : un faux positif envoie l'utilisateur sur la page d'un autre
 * document, une troncature (« FOR-MI-100 » lu « FOR-MI-10 ») aussi, et un
 * échec de reconnaissance prive un document de sa page.
 *
 * Le suite est purement fonctionnelle : aucune base, aucune écriture, aucune
 * dépendance réseau. Elle est donc rejouable et instantanée.
 *
 *   npm run test:iso-codes
 *   npx tsx scripts/verify-iso-code-parsing.ts
 */
import { extractIsoCode, normalizeIsoCode, resolveIsoDocumentRoute } from '../src/lib/dms/iso-routes'

let passed = 0
let failed = 0

function section(title: string) {
  console.log(`\n${title}`)
}

function show(v: string | null): string {
  return v === null ? 'null' : `« ${v} »`
}

/** `normalizeIsoCode(input)` doit rendre exactement `expected`. */
function norm(input: string, expected: string | null, note = '') {
  const actual = normalizeIsoCode(input)
  const ok = actual === expected
  const label = `normalize(${JSON.stringify(input)}) → ${show(expected)}${note ? `  — ${note}` : ''}`
  if (ok) { passed++; console.log(`  ok   ${label}`) }
  else { failed++; console.log(`  FAIL ${label} — obtenu ${show(actual)}`) }
}

/** `extractIsoCode(input)` doit rendre exactement `expected`. */
function extract(input: string, expected: string | null, note = '') {
  const actual = extractIsoCode(input)
  const ok = actual === expected
  const label = `extract(${JSON.stringify(input)}) → ${show(expected)}${note ? `  — ${note}` : ''}`
  if (ok) { passed++; console.log(`  ok   ${label}`) }
  else { failed++; console.log(`  FAIL ${label} — obtenu ${show(actual)}`) }
}

function check(label: string, ok: boolean, detail = '') {
  if (ok) { passed++; console.log(`  ok   ${label}`) }
  else { failed++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`) }
}

// ─────────────────────────────────────────────────────────────────────────────

section('1. Casse standard et mixte')

norm('FOR-CO-02', 'FOR-CO-02')
norm('for-co-02', 'FOR-CO-02')
norm('For-Co-02', 'FOR-CO-02')
norm('fOr-cO-02', 'FOR-CO-02')
norm('FOR-co-02', 'FOR-CO-02')
extract('FOR-CO-02', 'FOR-CO-02')
extract('for-co-02', 'FOR-CO-02')
extract('For-Co-02', 'FOR-CO-02')

section('2. Séparateurs alternatifs')

norm('FOR CO 02', 'FOR-CO-02')
norm('for.co.02', 'FOR-CO-02')
norm('FOR_CO_02', 'FOR-CO-02')
norm('FORCO02', 'FOR-CO-02')
norm('FOR/CO/02', 'FOR-CO-02')
norm('  FOR - CO - 02  ', 'FOR-CO-02', 'espaces et tirets mêlés')
norm('FOR--CO--02', 'FOR-CO-02')
norm('for co02', 'FOR-CO-02')
extract('FOR CO 02', 'FOR-CO-02')
extract('for.co.02', 'FOR-CO-02')
extract('FOR_CO_02', 'FOR-CO-02')
extract('FORCO02', 'FOR-CO-02')
extract('FOR/CO/02', 'FOR-CO-02')

section('3. Garde anti-troncature sur les chiffres')

norm('FOR-MI-100', 'FOR-MI-100', 'trois chiffres conservés')
norm('FOR-MI-10', 'FOR-MI-10')
norm('FOR-MI-287', 'FOR-MI-287', 'plus haut code réel du registre')
norm('FOR-CO-021', null, 'zéro de tête sur trois positions : jamais canonique')
norm('FOR-CO-2', 'FOR-CO-02', 'complété à deux positions')
norm('FOR-CO-0', 'FOR-CO-00')
norm('FOR-CO-1000', null, 'quatre chiffres')
norm('FOR-MI-0100', null)
extract('FOR-MI-100', 'FOR-MI-100', 'jamais tronqué en FOR-MI-10')
extract('FOR-CO-2', 'FOR-CO-02')
extract('FOR-MI-1000', null, 'quatre chiffres : aucun code')
extract('FOR-CO-021', null, 'ne doit surtout pas donner FOR-CO-02')

section('4. Suffixes')

norm('ORG-MI-02-VA', 'ORG-MI-02-VA')
norm('org-mi-02-va', 'ORG-MI-02-VA')
norm('ORG MI 02 VA', 'ORG-MI-02-VA')
norm('ORGMI02VA', 'ORG-MI-02-VA')
norm('FOR-RH-02-VA', 'FOR-RH-02-VA')
// `-VA` est le seul suffixe du système (cf. CODE_REGEX de src/lib/dms/codes.ts).
// Toute autre lettre collée est une variante inconnue, pas un code.
norm('PRC-MI-01B', null, 'suffixe « B » inconnu')
norm('FOR-CO-02X', null)
norm('ORG-MI-02-VB', null)
norm('ORG-MI-02-VAV', null)
extract('ORG-MI-02-VA', 'ORG-MI-02-VA')
extract('PRC-MI-01B', null, 'le garde à 1–2 lettres bloque la variante inconnue')
extract('FOR-CO-02X', null)

section('5. Code noyé dans du texte libre')

extract('Check the bordereau in FOR-CO-02.', 'FOR-CO-02', 'ponctuation immédiatement après')
extract('Please review FOR-CO-02and let me know.', 'FOR-CO-02', 'mot collé, sans espace')
extract('Reference: (FOR-CO-02)', 'FOR-CO-02', 'entre parenthèses')
extract('The old system used FOR-CO-021 which is now deprecated.', null,
  'ne doit PAS extraire FOR-CO-02')
extract('FOR-CO-02 bordereau', 'FOR-CO-02')
extract('bordereau for-co-02', 'FOR-CO-02')
extract('[FOR-CO-02] — Bordereau des prix', 'FOR-CO-02')
extract('"FOR-CO-02"', 'FOR-CO-02')
extract('voir le FOR-CO-02, puis le FOR-AC-10', 'FOR-CO-02', 'premier code trouvé')
extract('FOR CO 02 Bordereau des prix', 'FOR-CO-02', 'titre de document')
extract('Programme audit MI 2907 — FOR-MI-100', 'FOR-MI-100')
extract('rapport annuel', null)
extract('', null)

section('6. Garde amont : rien d’alphanumérique devant')

extract('XFOR-CO-02', null, 'lettre collée devant')
extract('2FOR-CO-02', null, 'chiffre collé devant')
extract('abcFOR-CO-02', null)
extract('_FOR-CO-02', 'FOR-CO-02', 'le souligné est un séparateur, pas une lettre')
extract('#FOR-CO-02', 'FOR-CO-02')
extract('ref:FOR-CO-02', 'FOR-CO-02')

section('7. Structures invalides et quasi-codes')

norm('FRO-CO-02', null, 'type inversé')
norm('FO-CO-02', null, 'type tronqué')
norm('FOR-COM-02', null, 'processus à trois lettres')
norm('123-45-67', null, 'aucune lettre')
norm('FOR-ZZ-02', null, 'processus inexistant')
norm('ABC-CO-02', null, 'type inexistant')
norm('FOR-CO', null, 'séquence absente')
norm('CO-02', null, 'type absent')
norm('FOR-02', null, 'processus absent')
norm('FOR-CO-AB', null, 'séquence non numérique')
norm('bordereau', null)
norm('', null)
norm('   ', null)
norm('-', null)
extract('FRO-CO-02', null)
extract('FO-CO-02', null)
extract('FOR-COM-02', null, 'le processus doit être exactement deux lettres connues')
extract('123-45-67', null)
extract('FOR-ZZ-02', null)

section('8. Les codes réels du registre restent reconnus')

const REAL_CODES = [
  'FOR-AC-01', 'FOR-AC-10', 'FOR-AC-11', 'FOR-CO-01', 'FOR-CO-02', 'FOR-CO-03',
  'FOR-ET-01', 'FOR-ET-06', 'FOR-MI-01', 'FOR-MI-05', 'FOR-MI-12', 'FOR-MI-14',
  'FOR-MQ-15', 'FOR-RE-09', 'FOR-RH-14', 'FOR-RH-44', 'INS-ET-01', 'INS-MI-21',
  'ISN-MQ-20', 'LIS-AC-79', 'LIS-CO-02', 'LIS-ET-03', 'LIS-MI-01', 'LIS-RH-02',
  'ORG-MI-09', 'ORG-MI-02-VA', 'PLA-MI-04', 'PLA-RE-02', 'PRC-AC-02', 'PRC-MI-01',
  'PRC-MI-91', 'PRS-ET-01', 'PRS-RE-08', 'FOR-MI-100', 'FOR-MI-287',
]
for (const code of REAL_CODES) {
  const viaNorm = normalizeIsoCode(code)
  const viaExtract = extractIsoCode(code)
  const viaLower = normalizeIsoCode(code.toLowerCase())
  const viaSpaces = normalizeIsoCode(code.replace(/-/g, ' '))
  check(
    `${code} — normalise, extrait, en minuscules et avec espaces`,
    viaNorm === code && viaExtract === code && viaLower === code && viaSpaces === code,
    `norm=${show(viaNorm)} extract=${show(viaExtract)} lower=${show(viaLower)} spaces=${show(viaSpaces)}`,
  )
}

section('9. Cohérence entre les deux fonctions')

// Ce que `normalizeIsoCode` accepte, `extractIsoCode` doit le retrouver
// identiquement : le résolveur essaie l'un puis l'autre, et deux réponses
// différentes pour la même saisie produiraient deux destinations.
const AGREEMENT_INPUTS = [
  'FOR-CO-02', 'for-co-02', 'For-Co-02', 'FOR CO 02', 'for.co.02', 'FOR_CO_02',
  'FORCO02', 'FOR-MI-100', 'FOR-CO-2', 'ORG-MI-02-VA', 'LIS-MI-01',
]
for (const input of AGREEMENT_INPUTS) {
  const a = normalizeIsoCode(input)
  const b = extractIsoCode(input)
  check(`${JSON.stringify(input)} — même verdict des deux côtés`, a !== null && a === b,
    `norm=${show(a)} extract=${show(b)}`)
}

// Les rejets doivent l'être des deux côtés pour les entrées d'un seul segment.
for (const input of ['FRO-CO-02', 'FOR-COM-02', 'FOR-ZZ-02', 'FOR-CO-021', 'PRC-MI-01B']) {
  check(`${JSON.stringify(input)} — rejeté des deux côtés`,
    normalizeIsoCode(input) === null && extractIsoCode(input) === null)
}

section('10. Effet sur la résolution de destination')

// La conséquence qui compte : une coquille ne doit pas hériter de la page d'un
// document voisin, et surtout pas du registre LIS-MI-01.
check('FOR-CO-02 → page du bordereau',
  resolveIsoDocumentRoute('FOR-CO-02')?.href === '/admin/commercial/offers')
check('« FOR-CO-02and let me know » → page du bordereau',
  resolveIsoDocumentRoute('FOR-CO-02and let me know')?.href === '/admin/commercial/offers')
check('FOR-CO-021 → aucun code reconnu', resolveIsoDocumentRoute('FOR-CO-021') === null)
check('PRC-MI-01B → aucun code reconnu, donc pas la page de PRC-MI-01',
  resolveIsoDocumentRoute('PRC-MI-01B') === null)
check('FOR-MI-100 → code inconnu du tableau, sans destination',
  resolveIsoDocumentRoute('FOR-MI-100')?.href === null)
check('LIS-MI-01 → registre documentaire',
  resolveIsoDocumentRoute('LIS-MI-01')?.href === '/admin/documents')
check('FRO-CO-02 → aucun code reconnu', resolveIsoDocumentRoute('FRO-CO-02') === null)

section('11. Robustesse')

// Aucune de ces entrées ne doit lever ni partir en explosion combinatoire.
const HOSTILE = [
  'FOR'.repeat(500),
  'FOR-CO-'.repeat(300) + '02',
  '-'.repeat(5000),
  'FOR-CO-02'.repeat(400),
  ' FOR-CO-02',
  'FOR\nCO\n02',
  'FOR\tCO\t02',
]
const started = Date.now()
let threw = ''
for (const input of HOSTILE) {
  try { normalizeIsoCode(input); extractIsoCode(input) }
  catch (e) { threw = String(e) }
}
const elapsed = Date.now() - started
check('entrées hostiles : aucune exception', threw === '', threw)
check(`entrées hostiles : traitées en moins de 1 s (${elapsed} ms)`, elapsed < 1000)
check('sauts de ligne acceptés comme séparateurs', normalizeIsoCode('FOR\nCO\n02') === 'FOR-CO-02')
check('tabulations acceptées comme séparateurs', extractIsoCode('FOR\tCO\t02') === 'FOR-CO-02')

console.log(`\n${passed} ok, ${failed} échec(s)`)
process.exit(failed === 0 ? 0 : 1)
