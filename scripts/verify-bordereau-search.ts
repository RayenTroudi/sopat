/**
 * FOR-CO-02 — les lignes du bordereau sont atteignables par la recherche globale.
 *
 * Avant, chercher « Phoenix canariensis » ou « II.1 » ne ramenait rien : seul le
 * CODE du formulaire (FOR-CO-02) menait au registre des offres, et le contenu du
 * bordereau restait invisible. Traçabilité ISO 9001:2015 §8.5.2 : on doit pouvoir
 * partir d'une prestation chiffrée et remonter à son offre, donc à son chantier.
 *
 * Le test est en lecture seule : il n'écrit rien, ne crée rien, et se contente
 * d'interroger les données présentes.
 *
 *   npx tsx --env-file=.env scripts/verify-bordereau-search.ts
 */
import { selectTestTarget } from './lib/test-target'

const target = selectTestTarget(false)
console.log(`Cible : ${target.label}\n`)

import { eq, and, isNull, sql } from 'drizzle-orm'
import { db } from '../db/index'
import { commercialOffers, offerLineItems } from '../db/schema'
import { searchByDmsCode, DMS_SEARCH_ENTITY_LABELS } from '../src/lib/dms/search'

let passed = 0
let failed = 0

function check(label: string, ok: boolean, detail = '') {
  if (ok) { passed++; console.log(`  ok   ${label}`) }
  else { failed++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`) }
}

async function main() {
  console.log('1. Le type d-entité est déclaré')
  check('« Ligne de bordereau » porte un libellé lisible',
    DMS_SEARCH_ENTITY_LABELS.offer_line_item === 'Ligne de bordereau')

  // Une ligne réelle d'une offre non supprimée, pour interroger sur son texte.
  const [sample] = await db
    .select({
      id: offerLineItems.id,
      offerId: offerLineItems.offerId,
      designation: offerLineItems.designation,
      sourceCode: offerLineItems.sourceCode,
    })
    .from(offerLineItems)
    .innerJoin(commercialOffers, eq(offerLineItems.offerId, commercialOffers.id))
    .where(and(
      isNull(commercialOffers.deletedAt),
      sql`${offerLineItems.lineType} IN ('item', 'spec')`,
      sql`length(${offerLineItems.designation}) > 6`,
    ))
    .limit(1)

  if (!sample) {
    console.log('\nAucune ligne de bordereau en base : rien à interroger.')
    console.log(`\n${passed} réussis, ${failed} échoués`)
    process.exit(failed === 0 ? 0 : 1)
  }

  console.log('\n2. Une prestation chiffrée est trouvable par son libellé')
  const term = sample.designation.slice(0, 14).trim()
  const byLabel = await searchByDmsCode(term, 40)
  const hit = byLabel.find((r) => r.entityType === 'offer_line_item')
  check(`« ${term} » ramène au moins une ligne de bordereau`, hit !== undefined,
    `${byLabel.length} résultat(s), aucun de type ligne`)

  if (hit) {
    console.log('\n3. Le résultat mène à l-offre qui porte la ligne')
    check("l'URL pointe vers une offre commerciale",
      hit.href !== null && hit.href.startsWith('/admin/commercial/offers/'), String(hit.href))
    check("elle désigne l'offre, pas la ligne",
      hit.href === `/admin/commercial/offers/${sample.offerId}` ||
      byLabel.some((r) => r.href === `/admin/commercial/offers/${sample.offerId}`),
      String(hit.href))
  }

  if (sample.sourceCode) {
    console.log('\n4. Le numéro du bordereau est aussi une clé de recherche')
    const byCode = await searchByDmsCode(sample.sourceCode, 40)
    check(`« ${sample.sourceCode} » ramène une ligne de bordereau`,
      byCode.some((r) => r.entityType === 'offer_line_item'),
      `${byCode.length} résultat(s)`)
  }

  console.log('\n5. Les en-têtes ne polluent pas les résultats')
  // Section et catégorie sont des intitulés de regroupement, pas des
  // prestations : les remonter noierait les postes réellement chiffrables.
  const [header] = await db
    .select({ designation: offerLineItems.designation })
    .from(offerLineItems)
    .innerJoin(commercialOffers, eq(offerLineItems.offerId, commercialOffers.id))
    .where(and(
      isNull(commercialOffers.deletedAt),
      sql`${offerLineItems.lineType} IN ('section', 'category')`,
      sql`length(${offerLineItems.designation}) > 8`,
    ))
    .limit(1)
  if (header) {
    const results = await searchByDmsCode(header.designation.slice(0, 16).trim(), 40)
    const lineHits = results.filter((r) => r.entityType === 'offer_line_item')
    check(`« ${header.designation.slice(0, 16).trim() }» ne remonte aucun en-tête comme ligne`,
      lineHits.every((r) => r.label !== header.designation),
      lineHits.map((r) => r.label).join(' | '))
  } else {
    console.log('  (aucun en-tête en base — rien à vérifier)')
  }

  console.log(`\n${passed} réussis, ${failed} échoués`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
