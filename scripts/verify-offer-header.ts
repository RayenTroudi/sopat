/**
 * FOR-CO-02 — l'en-tête commercial : verrou, journal, et montant dérivé.
 *
 * Ce que ce test protège
 * ----------------------
 * Les huit champs de l'en-tête portent l'ENGAGEMENT : à qui l'offre est faite,
 * pour quel montant, jusqu'à quand. Ils étaient en lecture seule à l'écran mais
 * `updateOffer` les écrivait sans vérifier le verrou du bordereau ni laisser la
 * moindre trace — on pouvait changer le client d'une offre approuvée sans que
 * rien ne le dise.
 *
 * Les champs désactivés à l'écran ne prouvent rien : une server action est
 * appelable directement. Ce test l'appelle donc SANS passer par l'interface.
 *
 *   TEST_DATABASE_URL="postgres://…branche…" \
 *   npx tsx --env-file=.env scripts/verify-offer-header.ts
 */
import { selectTestTarget } from './lib/test-target'

if (!process.env.TEST_DATABASE_URL?.trim()) {
  console.error('\nCe test crée et supprime une offre. Exigez TEST_DATABASE_URL.\n')
  process.exit(2)
}
const target = selectTestTarget(false)
console.log(`Cible : ${target.label}\n`)

import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '../db/index'
import {
  commercialOffers, offerImports, offerLineItems, offerPaymentMilestones,
  offerVersions, projects, recordAuditLog, users,
} from '../db/schema'
import {
  approveOfferVersion, createBordereauLine, createOfferVersion, submitOfferVersion,
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

async function main() {
  const before = {
    commercialOffers: await count('commercial_offers'),
    recordAuditLog: await count('record_audit_log'),
  }

  const [actorRow] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users).where(eq(users.role, 'admin')).limit(1)
  const freeProjects = await db.execute<{ id: string; client_id: string | null }>(sql`
    SELECT p.id::text, p.client_id::text
      FROM projects p
     WHERE p.deleted_at IS NULL
       AND NOT EXISTS (
             SELECT 1 FROM commercial_offers o
              WHERE o.project_id = p.id AND o.approved_version_id IS NOT NULL
                AND o.deleted_at IS NULL)
     LIMIT 1`)
  if (!actorRow || freeProjects.rows.length === 0) {
    console.error('Fixtures manquantes (rôle admin ou projet libre).')
    process.exit(2)
  }
  const [project] = await db
    .select({ id: projects.id, clientId: projects.clientId })
    .from(projects).where(eq(projects.id, freeProjects.rows[0].id)).limit(1)

  const actor: AuditActor = {
    userId: actorRow.id, name: actorRow.name, email: actorRow.email, role: actorRow.role,
  }

  const [offer] = await db.insert(commercialOffers).values({
    reference: `TST-HEAD-${Date.now().toString(36).toUpperCase()}`,
    projectTitle: 'Vérification en-tête FOR-CO-02',
    projectId: project.id,
    currency: 'TND',
    vatRate: '0.1900',
    createdBy: actorRow.id,
  }).returning({ id: commercialOffers.id })
  const offerId = offer.id

  /*
   * On appelle la fonction du REGISTRE, pas la server action.
   *
   * L'action fait l'authentification (`cookies()`) et l'invalidation de cache :
   * elle exige un contexte de requête et ne peut pas tourner ici. La règle
   * métier — verrou et journal — vit dans `updateOfferRecord`, exactement comme
   * `updateBordereauLine` pour les lignes, et c'est elle qu'il faut éprouver.
   */
  const { updateOfferRecord } = await import('../src/lib/db/commercial')
  const updateOffer = (id: string, data: Parameters<typeof updateOfferRecord>[1]) =>
    updateOfferRecord(id, data, actor)

  try {
    console.log('1. Brouillon : les huit champs sont modifiables')
    const first = await updateOffer(offerId, {
      clientName: 'Client Témoin',
      projectType: 'Jardin résidentiel',
      description: 'Aménagement complet.',
      amount: '9000',
      sentDate: '2026-08-20',
      validityDate: '2026-09-30',
      responsible: 'M. Karim Ben Salah',
      notes: 'Note initiale.',
    })
    check('la mise à jour est acceptée', first.success === true, JSON.stringify(first))
    const [afterFirst] = await db.select().from(commercialOffers).where(eq(commercialOffers.id, offerId))
    check('client enregistré', afterFirst.clientName === 'Client Témoin')
    check('type de projet enregistré', afterFirst.projectType === 'Jardin résidentiel')
    check('description enregistrée', afterFirst.description === 'Aménagement complet.')
    check('montant enregistré', Number(afterFirst.amount) === 9000, String(afterFirst.amount))
    check("date d'envoi enregistrée", String(afterFirst.sentDate) === '2026-08-20', String(afterFirst.sentDate))
    check('validité enregistrée', String(afterFirst.validityDate) === '2026-09-30')
    check('responsable enregistré', afterFirst.responsible === 'M. Karim Ben Salah')
    check('notes enregistrées', afterFirst.notes === 'Note initiale.')

    console.log('\n2. Le journal porte le champ, sa valeur d-avant et sa valeur d-après')
    const [trail] = await db.select().from(recordAuditLog)
      .where(and(eq(recordAuditLog.entityType, 'commercial_offer'), eq(recordAuditLog.entityId, offerId)))
      .orderBy(desc(recordAuditLog.occurredAt)).limit(1)
    const prev = trail?.previousState as Record<string, unknown> | null
    const next = trail?.newState as Record<string, unknown> | null
    check('une entrée de journal existe pour l-en-tête',
      (trail?.metadata as Record<string, unknown> | null)?.scope === 'entete')
    check('AVANT — le client était vide', prev !== null && prev.clientName === null, JSON.stringify(prev))
    check('APRÈS — le client est nommé', next?.clientName === 'Client Témoin')
    check('le montant figure avec ses deux valeurs',
      prev?.amount === null && next?.amount === '9000', JSON.stringify([prev?.amount, next?.amount]))
    check('l-acteur et son rôle au moment du fait sont figés',
      trail?.actorName !== null && trail?.actorRoleSnapshot === actorRow.role)

    console.log('\n3. Rien de changé, rien de journalisé')
    const auditBefore = await count('record_audit_log')
    await updateOffer(offerId, { responsible: 'M. Karim Ben Salah' })
    check('réécrire une valeur identique n-ajoute pas de ligne de journal',
      (await count('record_audit_log')) === auditBefore)

    console.log('\n4. Bordereau approuvé : l-engagement est figé, l-administratif reste ouvert')
    await createBordereauLine(offerId, {
      lineType: 'item', designation: 'Palmier', unit: 'P', quantity: 4, unitPrice: 300,
    }, actor.userId, actor)
    const v = await createOfferVersion(offerId, { changeSummary: 'Chiffrage' }, actor.userId, actor)
    const versionId = v.success ? v.versionId : ''
    await submitOfferVersion(offerId, versionId, actor.userId, actor)
    const approved = await approveOfferVersion(offerId, versionId, actor.userId, actor)
    check('le bordereau est approuvé', approved.success === true, JSON.stringify(approved))

    for (const [field, payload] of [
      ['client',      { clientName: 'Client Substitué' }],
      ['montant',     { amount: '1' }],
      ['validité',    { validityDate: '2030-01-01' }],
      ["date d'envoi", { sentDate: '2030-01-01' }],
      ['description', { description: 'Réécrite' }],
      ['type',        { projectType: 'Autre' }],
      ['devise',      { currency: 'EUR' }],
    ] as [string, Record<string, string>][]) {
      const res = await updateOffer(offerId, payload)
      check(`${field} : refusé sur une offre approuvée`,
        res.success === false && String(res.error).includes('verrouillé'),
        JSON.stringify(res))
    }

    const [locked] = await db.select().from(commercialOffers).where(eq(commercialOffers.id, offerId))
    check('aucune de ces tentatives n-a modifié la base',
      locked.clientName === 'Client Témoin' && Number(locked.amount) === 1200 &&
      String(locked.validityDate) === '2026-09-30' && locked.currency === 'TND',
      `${locked.clientName} / ${locked.amount} / ${locked.validityDate} / ${locked.currency}`)

    const notesOk = await updateOffer(offerId, { notes: 'Note après approbation.' })
    check('les notes restent modifiables', notesOk.success === true, JSON.stringify(notesOk))
    const respOk = await updateOffer(offerId, { responsible: 'Mme Leila Trabelsi' })
    check('le responsable reste modifiable', respOk.success === true)

    console.log('\n5. Le statut commercial reste pilotable après approbation')
    // Gagner une offre APRÈS avoir approuvé son bordereau est le circuit normal :
    // le verrou ne doit pas le bloquer.
    const won = await updateOffer(offerId, { status: 'gagnee', decisionDate: '2026-09-01' })
    check('marquer l-offre « gagnée » reste possible', won.success === true, JSON.stringify(won))
    const [wonRow] = await db.select().from(commercialOffers).where(eq(commercialOffers.id, offerId))
    check('le statut est bien enregistré', wonRow.status === 'gagnee')

    console.log('\n6. Le montant est dérivé dès qu-il y a des lignes')
    check('amount vaut la somme HTVA du bordereau, pas la saisie initiale',
      Number(wonRow.amount) === 1200, String(wonRow.amount))
  } finally {
    console.log('\n7. Nettoyage')
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
    `)
  }

  console.log('\n8. Données existantes inchangées')
  const after = {
    commercialOffers: await count('commercial_offers'),
    recordAuditLog: await count('record_audit_log'),
  }
  for (const key of Object.keys(before) as (keyof typeof before)[]) {
    check(`${key} : ${before[key]} → ${after[key]}`, before[key] === after[key])
  }

  console.log(`\n${passed} réussis, ${failed} échoués`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
