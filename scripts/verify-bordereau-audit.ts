/**
 * FOR-CO-02 — le journal permet-il de RECONSTITUER un changement ?
 *
 * Compter les lignes de journal ne prouve rien. La question d'un auditeur est
 * toujours la même : « ce prix est passé de 450 à 480 : qui, quand, sur quel
 * document, quelle version, et pourquoi ? ». Ce test exécute un scénario
 * complet, puis relit le journal et exige que chacune de ces réponses en
 * sorte — valeur d'avant comprise.
 *
 * Une entrée qui ne dirait que « lineCount: 8 » ferait échouer ce test, et
 * c'est le but : c'est ce que le journal disait avant l'audit.
 *
 *   TEST_DATABASE_URL="postgres://…branche…" \
 *   npx tsx --env-file=.env scripts/verify-bordereau-audit.ts
 */
import { selectTestTarget } from './lib/test-target'

if (!process.env.TEST_DATABASE_URL?.trim()) {
  console.error('\nCe test écrit et supprime. Exigez TEST_DATABASE_URL.\n')
  process.exit(2)
}
const target = selectTestTarget(false)
console.log(`Cible : ${target.label}\n`)

import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '../db/index'
import {
  commercialOffers, offerImports, offerLineItems, offerPaymentMilestones,
  offerVersions, projects, recordAuditLog, users,
} from '../db/schema'
import {
  approveOfferVersion, createBordereauLine, createOfferVersion, deleteBordereauLine,
  moveBordereauLine, rejectOfferVersion, reopenOfferBordereau, submitOfferVersion,
  updateBordereauLine, confirmContractAmount,
} from '../src/lib/db/bordereau'
import type { AuditActor } from '../src/lib/audit-record'

let passed = 0
let failed = 0
function check(label: string, ok: boolean, detail = '') {
  if (ok) { passed++; console.log(`  ok   ${label}`) }
  else { failed++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`) }
}

async function count(table: string): Promise<number> {
  const r = await db.execute<{ n: string }>(sql.raw(`SELECT count(*)::text AS n FROM ${table}`))
  return Number(r.rows[0].n)
}

type Trail = typeof recordAuditLog.$inferSelect

async function main() {
  const before = {
    commercialOffers: await count('commercial_offers'),
    recordAuditLog: await count('record_audit_log'),
    offerLineItems: await count('offer_line_items'),
  }

  const [actorRow] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users).where(eq(users.role, 'admin')).limit(1)
  // Un chantier ne peut porter qu'UN bordereau approuvé. Choisir « le premier
  // projet venu » rendrait la suite dépendante de l'ordre d'exécution : une
  // offre approuvée laissée par un autre essai ferait échouer l'approbation
  // ici, pour une raison étrangère à ce qui est vérifié.
  const freeProjects = await db.execute<{ id: string; client_id: string | null }>(sql`
    SELECT p.id::text, p.client_id::text
      FROM projects p
     WHERE p.deleted_at IS NULL
       AND NOT EXISTS (
             SELECT 1 FROM commercial_offers o
              WHERE o.project_id = p.id
                AND o.approved_version_id IS NOT NULL
                AND o.deleted_at IS NULL)
     LIMIT 1`)
  if (freeProjects.rows.length === 0) {
    console.error('\nAucun projet sans bordereau approuvé : purgez les offres de test.')
    process.exit(2)
  }

  const [project] = await db
    .select({
      id: projects.id, clientId: projects.clientId,
      contractAmount: projects.contractAmount,
      contractAmountSuggested: projects.contractAmountSuggested,
      contractAmountSourceOfferId: projects.contractAmountSourceOfferId,
      contractAmountSourceVersionId: projects.contractAmountSourceVersionId,
      contractAmountConfirmedBy: projects.contractAmountConfirmedBy,
      contractAmountConfirmedAt: projects.contractAmountConfirmedAt,
    })
    .from(projects).where(eq(projects.id, freeProjects.rows[0].id)).limit(1)
  if (!actorRow || !project) { console.error('Fixtures manquantes.'); process.exit(2) }

  const actor: AuditActor = {
    userId: actorRow.id, name: actorRow.name, email: actorRow.email, role: actorRow.role,
  }

  const [offer] = await db.insert(commercialOffers).values({
    reference: `TST-AUDIT-${Date.now().toString(36).toUpperCase()}`,
    projectTitle: 'Vérification journal FOR-CO-02',
    projectId: project.id,
    clientId: project.clientId,
    currency: 'TND',
    vatRate: '0.1900',
    createdBy: actorRow.id,
  }).returning({ id: commercialOffers.id })
  const offerId = offer.id

  try {
    // ── Le scénario exact de la question posée ────────────────────────────
    const section = await createBordereauLine(offerId, {
      lineType: 'section', sourceCode: 'II.', designation: 'FOURNITURE DES VEGETAUX',
    }, actor.userId, actor)
    const sectionId = section.success ? section.lineId : ''
    const cat = await createBordereauLine(offerId, {
      parentId: sectionId, lineType: 'category', sourceCode: 'II.1', designation: 'LES PALMIERS',
    }, actor.userId, actor)
    const catId = cat.success ? cat.lineId : ''
    const line = await createBordereauLine(offerId, {
      parentId: catId, lineType: 'item', designation: 'Palmier Phoenix canariensis',
      unit: 'P', quantity: 20, unitPrice: 450,
    }, actor.userId, actor)
    const lineId = line.success ? line.lineId : ''

    // 450 → 480, le cas de l'énoncé.
    await updateBordereauLine(offerId, lineId, { unitPrice: 480 }, actor)

    const trail = await db.select().from(recordAuditLog)
      .where(and(eq(recordAuditLog.entityType, 'bordereau_line'), eq(recordAuditLog.entityId, lineId)))
      .orderBy(asc(recordAuditLog.occurredAt))

    console.log('1. « Prix unitaire : 450 → 480 » se lit-il dans le journal ?')
    const updated = trail.find((t: Trail) => t.action === 'updated')
    check('une entrée « modifiée » existe pour CETTE ligne', updated !== undefined)
    const prev = updated?.previousState as Record<string, unknown> | null
    const next = updated?.newState as Record<string, unknown> | null
    check('QUOI  — le champ modifié est nommé',
      prev !== null && 'unitPrice' in (prev ?? {}), JSON.stringify(prev))
    check('AVANT — la valeur précédente est 450', Number(prev?.unitPrice) === 450, JSON.stringify(prev))
    check('APRÈS — la nouvelle valeur est 480', Number(next?.unitPrice) === 480, JSON.stringify(next))
    check('QUI   — l-acteur est nommé', updated?.actorName === (actorRow.name ?? actorRow.email),
      String(updated?.actorName))
    check("QUI   — son rôle AU MOMENT DU FAIT est figé", updated?.actorRoleSnapshot === actorRow.role)
    check('QUAND — l-entrée est horodatée', updated?.occurredAt instanceof Date)
    const meta = updated?.metadata as Record<string, unknown> | null
    check('QUEL DOCUMENT — le formulaire est nommé', meta?.form === 'FOR-CO-02', JSON.stringify(meta))
    check('QUEL BORDEREAU — l-offre est nommée', meta?.offerId === offerId)
    check('QUELLE LIGNE — la désignation est reprise, lisible sans jointure',
      String(meta?.designation).includes('Phoenix'), String(meta?.designation))
    check("le journal ne se contente PAS d'un compteur de lignes",
      !('lineCount' in (next ?? {})) && 'unitPrice' in (next ?? {}), JSON.stringify(next))

    console.log('\n2. Seul ce qui a changé est journalisé')
    await updateBordereauLine(offerId, lineId, { unitPrice: 480 }, actor)
    const afterNoop = await db.select({ n: sql<number>`count(*)::int` }).from(recordAuditLog)
      .where(and(eq(recordAuditLog.entityType, 'bordereau_line'),
                 eq(recordAuditLog.entityId, lineId), eq(recordAuditLog.action, 'updated')))
    check('réécrire la même valeur n-ajoute pas de ligne de journal vide',
      afterNoop[0].n === 1, String(afterNoop[0].n))

    await updateBordereauLine(offerId, lineId, { designation: 'Palmier Phoenix canariensis 3 m', unitPrice: 500 }, actor)
    const multi = (await db.select().from(recordAuditLog)
      .where(and(eq(recordAuditLog.entityType, 'bordereau_line'), eq(recordAuditLog.entityId, lineId),
                 eq(recordAuditLog.action, 'updated')))
      .orderBy(asc(recordAuditLog.occurredAt))).at(-1) as Trail | undefined
    check('deux champs modifiés ensemble donnent deux couples avant/après',
      Object.keys((multi?.previousState as object) ?? {}).length === 2 &&
      Number((multi?.newState as Record<string, unknown>)?.unitPrice) === 500,
      JSON.stringify(multi?.newState))

    console.log('\n3. Déplacement et suppression laissent une trace de nature différente')
    await moveBordereauLine(offerId, lineId, { parentId: sectionId }, actor)
    const moved = (await db.select().from(recordAuditLog)
      .where(and(eq(recordAuditLog.entityType, 'bordereau_line'),
                 eq(recordAuditLog.entityId, lineId), eq(recordAuditLog.action, 'moved')))).at(0) as Trail | undefined
    check('le déplacement dit d-où et vers où',
      (moved?.previousState as Record<string, unknown>)?.parentId === catId &&
      (moved?.newState as Record<string, unknown>)?.parentId === sectionId,
      JSON.stringify([moved?.previousState, moved?.newState]))

    const doomed = await createBordereauLine(offerId, {
      parentId: sectionId, lineType: 'item', designation: 'Ligne à supprimer',
      unit: 'U', quantity: 2, unitPrice: 125,
    }, actor.userId, actor)
    const doomedId = doomed.success ? doomed.lineId : ''
    await deleteBordereauLine(offerId, doomedId, actor)
    const deleted = (await db.select().from(recordAuditLog)
      .where(and(eq(recordAuditLog.entityType, 'bordereau_line'),
                 eq(recordAuditLog.entityId, doomedId), eq(recordAuditLog.action, 'deleted')))).at(0) as Trail | undefined
    const gone = deleted?.previousState as Record<string, unknown> | null
    check('la suppression conserve les chiffres de la ligne disparue',
      gone?.designation === 'Ligne à supprimer' && Number(gone?.unitPrice) === 125 &&
      Number(gone?.quantity) === 2, JSON.stringify(gone))
    check('la ligne supprimée n-est plus en base, mais reste lisible dans le journal',
      (await db.select().from(offerLineItems).where(eq(offerLineItems.id, doomedId))).length === 0)

    console.log('\n4. Le cycle de vie : chaque acte, avec son POURQUOI quand il en faut un')
    const v1 = await createOfferVersion(offerId, { changeSummary: 'Chiffrage initial' }, actor.userId, actor)
    const v1Id = v1.success ? v1.versionId : ''
    await submitOfferVersion(offerId, v1Id, actor.userId, actor)
    await rejectOfferVersion(offerId, v1Id, 'Prix palmier au-dessus du devis fournisseur', actor.userId, actor)

    const offerTrail = await db.select().from(recordAuditLog)
      .where(and(eq(recordAuditLog.entityType, 'commercial_offer'), eq(recordAuditLog.entityId, offerId)))
      .orderBy(asc(recordAuditLog.occurredAt))
    const byAction = (a: string) => offerTrail.filter((t: Trail) => t.action === a)

    check('la création de version est tracée', byAction('created').length >= 1)
    check('la SOUMISSION est tracée comme un acte distinct', byAction('submitted').length === 1)
    const submitted = byAction('submitted')[0] as Trail
    check('elle nomme la version soumise',
      Number((submitted.newState as Record<string, unknown>)?.versionNo) === 1)
    const rejectedEntry = byAction('rejected')[0] as Trail | undefined
    check('le REFUS est tracé', rejectedEntry !== undefined)
    check('POURQUOI — le motif du refus est dans le journal',
      String((rejectedEntry?.metadata as Record<string, unknown>)?.reason).includes('devis fournisseur'),
      JSON.stringify(rejectedEntry?.metadata))
    check("l'auto-revue est signalée dans le journal, pas seulement à l'écran",
      (rejectedEntry?.metadata as Record<string, unknown>)?.selfReviewed === true)

    const v2 = await createOfferVersion(offerId, { changeSummary: 'Prix corrigé' }, actor.userId, actor)
    const v2Id = v2.success ? v2.versionId : ''
    await submitOfferVersion(offerId, v2Id, actor.userId, actor)
    await approveOfferVersion(offerId, v2Id, actor.userId, actor)
    const approvedEntry = byAction('approved')[0] as Trail | undefined
    const approvedAll = (await db.select().from(recordAuditLog)
      .where(and(eq(recordAuditLog.entityType, 'commercial_offer'), eq(recordAuditLog.entityId, offerId),
                 eq(recordAuditLog.action, 'approved')))).at(0) as Trail | undefined
    check("l'APPROBATION est tracée", approvedAll !== undefined || approvedEntry !== undefined)
    check('elle nomme la version approuvée ET le montant engagé',
      Number((approvedAll?.newState as Record<string, unknown>)?.versionNo) === 2 &&
      (approvedAll?.newState as Record<string, unknown>)?.totalTtc !== undefined,
      JSON.stringify(approvedAll?.newState))

    console.log('\n5. Le montant contractuel : les deux chiffres et leur base')
    await confirmContractAmount(project.id,
      { offerId, suggestedAmount: 11900, approvedAmount: 11500 }, actor.userId, actor)
    const contractTrail = (await db.select().from(recordAuditLog)
      .where(and(eq(recordAuditLog.entityType, 'project_contract_amount'),
                 eq(recordAuditLog.entityId, project.id)))
      .orderBy(asc(recordAuditLog.occurredAt))).at(-1) as Trail | undefined
    const cNew = contractTrail?.newState as Record<string, unknown> | null
    check('le journal garde la valeur SUGGÉRÉE et la valeur CONFIRMÉE',
      Number(cNew?.suggestedAmount) === 11900 && Number(cNew?.approvedAmount) === 11500,
      JSON.stringify(cNew))
    check("il nomme la version qui a servi de base", cNew?.sourceVersionId === v2Id)
    check('il atteste que le budget de coût n-a pas été touché',
      'approvedBudgetUnchanged' in ((contractTrail?.metadata as object) ?? {}),
      JSON.stringify(contractTrail?.metadata))

    console.log('\n6. La réouverture : le POURQUOI est exigé et conservé')
    await reopenOfferBordereau(offerId, 'Le client demande une remise sur les palmiers', actor.userId, actor)
    const reopened = (await db.select().from(recordAuditLog)
      .where(and(eq(recordAuditLog.entityType, 'commercial_offer'), eq(recordAuditLog.entityId, offerId),
                 eq(recordAuditLog.action, 'reopened')))).at(0) as Trail | undefined
    check('la réouverture est tracée avec son motif',
      String((reopened?.metadata as Record<string, unknown>)?.reason).includes('remise'),
      JSON.stringify(reopened?.metadata))
    const [supersededVersion] = await db.select().from(offerVersions).where(eq(offerVersions.id, v2Id))
    check('le motif est AUSSI porté par la version remplacée, auto-portante',
      supersededVersion.reopenReason?.includes('remise') === true)

    console.log('\n7. Reconstitution complète, du journal seul')
    const full = await db.select().from(recordAuditLog)
      .where(sql`(entity_type = 'commercial_offer' AND entity_id = ${offerId}::uuid)
                 OR (entity_type = 'bordereau_line' AND metadata->>'offerId' = ${offerId})`)
      .orderBy(asc(recordAuditLog.occurredAt))
    const actions = full.map((t: Trail) => t.action)
    check('la chronologie contient les actes du cycle, dans l-ordre',
      actions.includes('created') && actions.indexOf('submitted') < actions.indexOf('rejected') &&
      actions.indexOf('rejected') < actions.lastIndexOf('approved'),
      actions.join(' → '))
    check('chaque entrée nomme son acteur et son rôle',
      full.every((t: Trail) => t.actorName && t.actorRoleSnapshot))
    check('chaque entrée est horodatée', full.every((t: Trail) => t.occurredAt instanceof Date))
    console.log(`  (chronologie : ${actions.join(' → ')})`)
  } finally {
    console.log('\n8. Nettoyage')
    await db.update(projects).set({
      contractAmount: project.contractAmount,
      contractAmountSuggested: project.contractAmountSuggested,
      contractAmountSourceOfferId: project.contractAmountSourceOfferId,
      contractAmountSourceVersionId: project.contractAmountSourceVersionId,
      contractAmountConfirmedBy: project.contractAmountConfirmedBy,
      contractAmountConfirmedAt: project.contractAmountConfirmedAt,
    }).where(eq(projects.id, project.id))
    await db.update(commercialOffers).set({ approvedVersionId: null })
      .where(eq(commercialOffers.id, offerId))
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
    await db.execute(sql`
      DELETE FROM record_audit_log
       WHERE (entity_type = 'commercial_offer' AND entity_id = ${offerId}::uuid)
          OR (entity_type = 'bordereau_line' AND metadata->>'offerId' = ${offerId})
          OR (entity_type = 'project_contract_amount' AND entity_id = ${project.id}::uuid
              AND occurred_at > now() - interval '1 hour')
    `)
  }

  console.log('\n9. Données existantes inchangées')
  const after = {
    commercialOffers: await count('commercial_offers'),
    recordAuditLog: await count('record_audit_log'),
    offerLineItems: await count('offer_line_items'),
  }
  for (const key of Object.keys(before) as (keyof typeof before)[]) {
    check(`${key} : ${before[key]} → ${after[key]}`, before[key] === after[key])
  }

  console.log(`\n${passed} réussis, ${failed} échoués`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
