/**
 * Supprime les offres jetables laissées par une vérification interrompue.
 *
 * Ne touche QUE les références commençant par `TST-`, et refuse de tourner
 * sans `TEST_DATABASE_URL` : c'est un outil de branche isolée, pas un outil de
 * production.
 *
 *   TEST_DATABASE_URL="postgres://…" npx tsx --env-file=.env scripts/qms-purge-test-offers.ts
 */
import { selectTestTarget } from './lib/test-target'

if (!process.env.TEST_DATABASE_URL?.trim()) {
  console.error('\nRefus : ce script supprime des lignes. Exigez TEST_DATABASE_URL.\n')
  process.exit(2)
}
const target = selectTestTarget(false)
console.log(`Cible : ${target.label}\n`)

import { eq, like, sql } from 'drizzle-orm'
import { db } from '../db/index'
import {
  commercialOffers, offerImports, offerLineItems, offerPaymentMilestones, offerVersions, projects,
} from '../db/schema'

async function main() {
  const stale = await db
    .select({ id: commercialOffers.id, reference: commercialOffers.reference })
    .from(commercialOffers)
    .where(like(commercialOffers.reference, 'TST-%'))

  if (stale.length === 0) { console.log('Rien à purger.'); process.exit(0) }

  await db.update(projects).set({
    contractAmountSourceOfferId: null,
    contractAmountSourceVersionId: null,
    contractAmountSuggested: null,
    contractAmountConfirmedBy: null,
    contractAmountConfirmedAt: null,
  }).where(sql`contract_amount_source_offer_id IN (
    SELECT id FROM commercial_offers WHERE reference LIKE 'TST-%'
  )`)

  await db.execute(sql.raw('ALTER TABLE offer_versions DISABLE TRIGGER offer_versions_guard_trg'))
  try {
    for (const o of stale) {
      await db.update(commercialOffers).set({ approvedVersionId: null })
        .where(eq(commercialOffers.id, o.id))
      await db.delete(offerVersions).where(eq(offerVersions.offerId, o.id))
    }
  } finally {
    await db.execute(sql.raw('ALTER TABLE offer_versions ENABLE TRIGGER offer_versions_guard_trg'))
  }

  for (const o of stale) {
    await db.delete(offerImports).where(eq(offerImports.offerId, o.id))
    await db.delete(offerPaymentMilestones).where(eq(offerPaymentMilestones.offerId, o.id))
    await db.delete(offerLineItems).where(eq(offerLineItems.offerId, o.id))
    await db.delete(commercialOffers).where(eq(commercialOffers.id, o.id))
    await db.execute(sql`
      DELETE FROM record_audit_log
       WHERE (entity_type = 'commercial_offer' AND entity_id = ${o.id}::uuid)
          OR (entity_type = 'bordereau_line' AND metadata->>'offerId' = ${o.id})
    `)
    console.log(`purgé : ${o.reference}`)
  }
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
