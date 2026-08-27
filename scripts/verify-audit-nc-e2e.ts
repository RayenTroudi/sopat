/**
 * End-to-end lifecycle of the audit finding → NC → CAPA → closure workflow,
 * plus the traceability integrity invariants and an existing-data regression check.
 *
 * Runs through the real production functions — no shortcuts around createNc,
 * createNcFromAuditFinding, upsertAuditProgramItems or checkNcClosePrerequisites.
 *
 * This test allocates a real NC reference number, so it must run against an
 * isolated Neon branch. See scripts/lib/test-target.ts.
 *
 *   TEST_DATABASE_URL="postgres://…branch…" npx tsx --env-file=.env scripts/verify-audit-nc-e2e.ts
 */
import { selectTestTarget } from './lib/test-target'

// Must run before the first database operation. `db` is a lazy Proxy that
// resolves DATABASE_URL on first use, not on import, so static imports below
// are safe once the target has been chosen here.
const target = selectTestTarget(true)
console.log(`Cible : ${target.label}\n`)

import { db } from '../db/index'
import {
  auditPrograms, auditProgramItems, nonConformances, correctiveActions,
  managementReviews, users, documents, dmsDocumentLinks, recordAuditLog,
  ncReferenceSequences, referenceSequences,
} from '../db/schema'
import { eq, and, inArray, like, sql, isNotNull } from 'drizzle-orm'
import {
  createAuditProgram, createNcFromAuditFinding, getNcOriginFinding,
  getAuditProgramById, upsertAuditProgramItems, checkNcClosePrerequisites,
  getNcById, createCapa, updateCapa, updateNcStatus,
} from '../src/lib/db/iso'
import type { AuditActor } from '../src/lib/audit-record'
import { ncFromFindingSchema } from '../src/lib/validation/project-docs'

let pass = 0, fail = 0
/** NCs created by this run — each consumes exactly one reference number. */
let ncsCreated = 0
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`) }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`) }
}

const Y = 2911

type Counts = {
  programs: number; items: number; audits: number
  ncs: number; capas: number; reviews: number; docs: number
}

async function counts(): Promise<Counts> {
  const [r] = await db.select({
    programs: sql<number>`(select count(*) from audit_programs)`,
    items:    sql<number>`(select count(*) from audit_program_items)`,
    audits:   sql<number>`(select count(*) from audit_logs)`,
    ncs:      sql<number>`(select count(*) from non_conformances)`,
    capas:    sql<number>`(select count(*) from corrective_actions)`,
    reviews:  sql<number>`(select count(*) from management_reviews)`,
    docs:     sql<number>`(select count(*) from documents)`,
  }).from(users).limit(1)
  return {
    programs: Number(r.programs), items: Number(r.items), audits: Number(r.audits),
    ncs: Number(r.ncs), capas: Number(r.capas), reviews: Number(r.reviews), docs: Number(r.docs),
  }
}

async function dropDoc(code: string | null) {
  if (!code) return
  const docs = await db.select({ id: documents.id }).from(documents).where(eq(documents.code, code))
  for (const d of docs) await db.delete(dmsDocumentLinks).where(eq(dmsDocumentLinks.documentId, d.id))
  await db.delete(documents).where(eq(documents.code, code))
}

async function cleanup() {
  const progs = await db.select({ id: auditPrograms.id, code: auditPrograms.dmsDocumentCode })
    .from(auditPrograms).where(like(auditPrograms.reference, `AUD-%-${Y}-%`))
  const progIds = progs.map((p) => p.id)
  if (progIds.length) {
    const items = await db.select({ ncId: auditProgramItems.ncId })
      .from(auditProgramItems).where(inArray(auditProgramItems.auditProgramId, progIds))
    const ncIds = items.map((i) => i.ncId).filter(Boolean) as string[]
    await db.delete(auditProgramItems).where(inArray(auditProgramItems.auditProgramId, progIds))
    if (ncIds.length) {
      const ncs = await db.select({ id: nonConformances.id, code: nonConformances.dmsDocumentCode })
        .from(nonConformances).where(inArray(nonConformances.id, ncIds))
      const capas = await db.select({ id: correctiveActions.id, code: correctiveActions.dmsDocumentCode })
        .from(correctiveActions).where(inArray(correctiveActions.ncId, ncIds))
      await db.delete(correctiveActions).where(inArray(correctiveActions.ncId, ncIds))
      for (const c of capas) { await db.delete(recordAuditLog).where(eq(recordAuditLog.entityId, c.id)); await dropDoc(c.code) }
      await db.delete(recordAuditLog).where(inArray(recordAuditLog.entityId, ncIds))
      await db.delete(nonConformances).where(inArray(nonConformances.id, ncIds))
      for (const n of ncs) await dropDoc(n.code)
    }
    await db.delete(auditPrograms).where(inArray(auditPrograms.id, progIds))
    for (const p of progs) await dropDoc(p.code)
  }
  await db.delete(referenceSequences).where(eq(referenceSequences.year, Y))
  await db.delete(ncReferenceSequences).where(eq(ncReferenceSequences.year, Y))
}

async function main() {
  const [adminRow] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users).where(eq(users.email, 'admin@sopat.tn')).limit(1)
  const [any] = adminRow ? [adminRow]
    : await db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).limit(1)
  const admin = any
  const actor: AuditActor = { userId: admin.id, name: admin.name, email: admin.email, role: admin.role }
  // A second account, so effectiveness verification has an independent verifier.
  const [other] = await db.select({ id: users.id }).from(users)
    .where(sql`id <> ${admin.id}`).limit(1)

  await cleanup()
  const before = await counts()
  const [seqBefore] = await db.select().from(ncReferenceSequences)
    .where(eq(ncReferenceSequences.year, new Date().getFullYear()))

  // ══ 1–2. Temporary programme and a non-conforming finding ═══════════════
  console.log('── Cycle complet constat → NC → CAPA → clôture ──')
  console.log('\n1. Programme et constat temporaires')
  const program = await createAuditProgram({
    dept: 'ET',
    auditorName: 'Mme Houda Ben Yahia',
    scheduledDate: new Date(Y, 4, 12),
    createdBy: admin.id,
  })
  await upsertAuditProgramItems(program.id, [
    { agendaStep: 'Revue des éléments d\'entrée de la conception', clauseRef: '8.3.3',
      conformity: 'NC', response: 'Exigences légales non recensées avant conception.', sortOrder: 0 },
    { agendaStep: 'Vérification de la conception', clauseRef: '8.3.4',
      conformity: 'C', response: 'Conforme.', sortOrder: 1 },
    { agendaStep: 'Validation client', clauseRef: '8.3.4', conformity: 'PA', sortOrder: 2 },
  ], admin.id)
  const loaded = (await getAuditProgramById(program.id))!
  const finding = loaded.items.find((i) => i.conformity === 'NC')!
  const neighbour = loaded.items.find((i) => i.conformity === 'C')!
  check('programme created', !!program.id)
  check('3 findings recorded', loaded.items.length === 3, String(loaded.items.length))
  check('the NC finding carries its clause', finding.clauseRef === '8.3.3', String(finding.clauseRef))

  console.log('\n2. Éligibilité « Créer une non-conformité »')
  // The UI offers the action when conformity is NC and no NC exists yet.
  check('finding is eligible (conformity NC, no NC yet)',
    finding.conformity === 'NC' && finding.ncId === null)
  check('a conforming finding is not eligible', neighbour.conformity === 'C' && neighbour.ncId === null)

  console.log('\n3. Création via le workflow réel')
  const raised = await createNcFromAuditFinding({
    itemId: finding.id, detectedBy: admin.id, createdBy: admin.id, actor,
  })
  check('creation succeeded', raised.ok === true, JSON.stringify(raised))
  if (!raised.ok) { await cleanup(); console.log('aborting'); process.exit(1) }
  ncsCreated++
  const nc = (await getNcById(raised.ncId))!

  console.log('\n4. Contenu de la NC')
  check('nc_source = audit', nc.ncSource === 'audit', String(nc.ncSource))
  check('department taken from the programme', nc.dept === 'ET', String(nc.dept))
  check('clause_ref transferred to referenceDoc', nc.referenceDoc === '8.3.3', String(nc.referenceDoc))
  check('auditor preserved', nc.auditorName === 'Mme Houda Ben Yahia', String(nc.auditorName))
  check('detector preserved', nc.detectorName === 'Mme Houda Ben Yahia', String(nc.detectorName))
  check('description generated from step + observation',
    nc.description.includes('éléments d\'entrée') && nc.description.includes('Exigences légales'),
    nc.description)
  check('reference follows NC-YYYY-NNN', /^NC-\d{4}-\d{3}$/.test(nc.reference), nc.reference)
  check('DMS code attached', !!nc.dmsDocumentCode, String(nc.dmsDocumentCode))
  check('record origin is platform', nc.recordOrigin === 'platform', nc.recordOrigin)
  const trail = await db.select({ action: recordAuditLog.action }).from(recordAuditLog)
    .where(eq(recordAuditLog.entityId, raised.ncId))
  check('audit trail written', trail.some((t) => t.action === 'created'), JSON.stringify(trail))

  console.log('\n5. Navigation constat → NC')
  const afterCreate = (await getAuditProgramById(program.id))!
  const f2 = afterCreate.items.find((i) => i.id === finding.id)!
  check('finding exposes nc_id', f2.ncId === raised.ncId, String(f2.ncId))
  check('finding exposes the NC reference', f2.ncReference === nc.reference, String(f2.ncReference))

  console.log('\n6. Navigation NC → constat / programme')
  const origin = await getNcOriginFinding(raised.ncId)
  check('NC resolves its finding', origin?.itemId === finding.id, String(origin?.itemId))
  check('clause readable from the NC', origin?.clauseRef === '8.3.3', String(origin?.clauseRef))
  check('programme reference readable', origin?.programRef === program.reference, String(origin?.programRef))
  check('programme year readable', origin?.programYear === Y, String(origin?.programYear))

  // ══ 7–10. The link survives saves ═══════════════════════════════════════
  console.log('\n7. Le lien survit à une sauvegarde du programme')
  await upsertAuditProgramItems(program.id, afterCreate.items.map((i) => ({
    id: i.id, agendaStep: i.agendaStep, clauseRef: i.clauseRef ?? undefined,
    response: i.response ?? undefined, conformity: i.conformity ?? undefined,
    evidence: i.evidence ?? undefined, sortOrder: i.sortOrder,
  })), admin.id)
  const afterSave1 = (await getAuditProgramById(program.id))!
  check('nc_id survived delete-and-reinsert',
    afterSave1.items.some((i) => i.ncId === raised.ncId), 'link lost')

  console.log('\n8. Rechargement depuis la base')
  const [dbItem] = await db.select({ ncId: auditProgramItems.ncId })
    .from(auditProgramItems).where(eq(auditProgramItems.ncId, raised.ncId))
  check('relationship present in the database', dbItem?.ncId === raised.ncId, String(dbItem?.ncId))

  console.log('\n9. Modification de champs sans rapport, puis sauvegarde')
  const reSaved = afterSave1.items.map((i) => ({
    id: i.id, agendaStep: i.agendaStep, clauseRef: i.clauseRef ?? undefined,
    response: i.ncId ? i.response ?? undefined : 'Observation modifiée',
    conformity: i.conformity ?? undefined,
    evidence: 'Preuve ajoutée après coup', sortOrder: i.sortOrder,
  }))
  await upsertAuditProgramItems(program.id, reSaved, admin.id)
  const afterSave2 = (await getAuditProgramById(program.id))!
  const linked2 = afterSave2.items.find((i) => i.ncId === raised.ncId)
  check('relationship still present', !!linked2, 'link lost on second save')
  check('the unrelated edit applied',
    afterSave2.items.some((i) => i.response === 'Observation modifiée'))
  check('evidence applied to the linked finding too',
    linked2?.evidence === 'Preuve ajoutée après coup', String(linked2?.evidence))

  console.log('\n10. Suppression d\'un constat sans rapport')
  // Drop the PA row entirely; the NC link on another row must be unaffected.
  await upsertAuditProgramItems(program.id, afterSave2.items
    .filter((i) => i.conformity !== 'PA')
    .map((i) => ({
      id: i.id, agendaStep: i.agendaStep, clauseRef: i.clauseRef ?? undefined,
      response: i.response ?? undefined, conformity: i.conformity ?? undefined,
      evidence: i.evidence ?? undefined, sortOrder: i.sortOrder,
    })), admin.id)
  const afterDrop = (await getAuditProgramById(program.id))!
  check('unrelated finding removed', afterDrop.items.length === 2, String(afterDrop.items.length))
  check('NC relationship untouched by the removal',
    afterDrop.items.some((i) => i.ncId === raised.ncId))

  // ══ 11–12. Duplicate prevention ═════════════════════════════════════════
  console.log('\n11. Deuxième NC depuis le même constat')
  const linkedNow = afterDrop.items.find((i) => i.ncId === raised.ncId)!
  const dup = await createNcFromAuditFinding({
    itemId: linkedNow.id, detectedBy: admin.id, createdBy: admin.id, actor,
  })
  check('refused', dup.ok === false, 'a second NC was created')
  check('returns the existing NC', !dup.ok && dup.existingNcId === raised.ncId,
    !dup.ok ? String(dup.existingNcId) : '')
  const [{ ncCount }] = await db.select({ ncCount: sql<number>`count(*)` })
    .from(nonConformances).where(eq(nonConformances.referenceDoc, '8.3.3'))
  check('still exactly one NC for this clause', Number(ncCount) === 1, String(ncCount))

  console.log('\n12. Contrainte unique en dernier recours')
  let uniqueHeld = false
  try {
    // Try to attach the same NC to a second finding directly.
    const otherItem = afterDrop.items.find((i) => i.ncId === null)!
    await db.update(auditProgramItems).set({ ncId: raised.ncId })
      .where(eq(auditProgramItems.id, otherItem.id))
  } catch { uniqueHeld = true }
  check('the database refuses a second finding on the same NC', uniqueHeld,
    'the partial unique index did not fire')

  // ══ 13–14. Normal CAPA / closure workflow ═══════════════════════════════
  console.log('\n13. La NC suit le workflow CAPA normal')
  const capa = await createCapa({
    ncId: raised.ncId,
    actionDescription: 'Recenser les exigences légales applicables avant chaque conception.',
    responsibleName: 'RMI',
    createdBy: admin.id,
    actor,
  })
  check('CAPA created', !!capa.id)
  const gateNoEvidence = await checkNcClosePrerequisites(raised.ncId, admin.id, 'closed')
  check('closure blocked without evidence', gateNoEvidence.ok === false, gateNoEvidence.reason ?? '')
  check('block cites the missing evidence', (gateNoEvidence.reason ?? '').includes('preuve'),
    gateNoEvidence.reason ?? '')
  check('not treated as historical', gateNoEvidence.historical === false)

  const [asset] = await db.select({ id: sql<string>`id` })
    .from(sql`cloudinary_assets`).limit(1) as unknown as Array<{ id: string }>
  if (asset?.id) {
    await updateCapa(capa.id, { evidenceAssetId: asset.id }, actor)
    const gateNoVerif = await checkNcClosePrerequisites(raised.ncId, admin.id, 'closed')
    check('still blocked without effectiveness verification', gateNoVerif.ok === false,
      gateNoVerif.reason ?? '')
    if (other?.id) {
      await updateCapa(capa.id, { effectivenessVerified: true, verifiedBy: other.id }, actor)
      const gateOk = await checkNcClosePrerequisites(raised.ncId, admin.id, 'closed')
      check('closure permitted once evidence + verification exist', gateOk.ok === true,
        gateOk.reason ?? '')
      await updateNcStatus(raised.ncId, 'closed', admin.id, { actor })
      const closed = (await getNcById(raised.ncId))!
      check('NC closed through the normal path', closed.status === 'closed', closed.status)
      check('closure date recorded', closed.closedAt !== null)
      const stillLinked = await getNcOriginFinding(raised.ncId)
      check('traceability intact after closure', stillLinked?.itemId === linkedNow.id)
    } else {
      console.log('  SKIP  no second user account for an independent verifier')
    }
  } else {
    console.log('  SKIP  no cloudinary asset available to act as evidence')
  }

  // ══ 15. Historical protection ═══════════════════════════════════════════
  console.log('\n14. Données historiques intactes')
  const [{ impWithAudit }] = await db.select({ impWithAudit: sql<number>`count(*)` })
    .from(nonConformances)
    .where(and(eq(nonConformances.recordOrigin, 'imported'), isNotNull(nonConformances.auditId)))
  check('no imported NC has an audit_id', Number(impWithAudit) === 0, String(impWithAudit))
  const [{ impLinked }] = await db.select({ impLinked: sql<number>`count(*)` })
    .from(auditProgramItems)
    .where(sql`nc_id in (select id from non_conformances where record_origin = 'imported')`)
  check('no imported NC is attached to a finding', Number(impLinked) === 0, String(impLinked))
  const [{ formi05 }] = await db.select({ formi05: sql<number>`count(*)` })
    .from(nonConformances).where(like(nonConformances.reference, 'FOR-MI-05/%'))
  check('FOR-MI-05 register still holds 47 fiches', Number(formi05) === 47, String(formi05))
  const [{ unmapped }] = await db.select({ unmapped: sql<number>`count(*)` })
    .from(nonConformances)
    .where(sql`record_origin = 'imported' and process_affected is null`)
  check('26 unmapped fiches unchanged', Number(unmapped) === 26, String(unmapped))

  // ══ 16. Regression ══════════════════════════════════════════════════════
  console.log('\n15. Sécurité de l\'endpoint')
  const forged = ncFromFindingSchema.safeParse({
    description: 'Description suffisamment longue pour passer la validation.',
    ncId: '00000000-0000-0000-0000-000000000000',
    reference: 'NC-1999-999',
    status: 'closed',
    recordOrigin: 'imported',
    dept: 'RH',
    ncSource: 'interne',
    detectedBy: '00000000-0000-0000-0000-000000000000',
  })
  const keys = forged.success ? Object.keys(forged.data) : []
  check('only description / ncType / assignedTo are accepted',
    forged.success && keys.every((k) => ['description', 'ncType', 'assignedTo'].includes(k)),
    JSON.stringify(keys))
  check('an existing NC cannot be attached through the payload', !keys.includes('ncId'))
  check('protected NC fields are stripped',
    !keys.includes('reference') && !keys.includes('status') && !keys.includes('recordOrigin'))
  check('a too-short description is refused',
    !ncFromFindingSchema.safeParse({ description: 'court' }).success)
  check('an unknown ncType is refused',
    !ncFromFindingSchema.safeParse({ ncType: 'inventé' }).success)
  check('a non-uuid assignee is refused',
    !ncFromFindingSchema.safeParse({ assignedTo: 'moi' }).success)

  // Cross-programme isolation: even if the route's membership guard were
  // bypassed, the NC is built from the programme the *item* belongs to — never
  // from the id in the URL — so ids cannot be mixed to cross-contaminate.
  const otherProgram = await createAuditProgram({
    dept: 'RH', scheduledDate: new Date(Y, 6, 1), createdBy: admin.id,
  })
  await upsertAuditProgramItems(otherProgram.id, [
    { agendaStep: 'Constat appartenant à un autre programme', clauseRef: '7.2',
      conformity: 'NC', response: 'Observation.', sortOrder: 0 },
  ], admin.id)
  const otherItem = (await getAuditProgramById(otherProgram.id))!.items[0]
  const crossed = await createNcFromAuditFinding({
    itemId: otherItem.id, detectedBy: admin.id, createdBy: admin.id, actor,
  })
  check('an item resolves against its own programme', crossed.ok === true, JSON.stringify(crossed))
  if (crossed.ok) {
    ncsCreated++
    const crossedNc = (await getNcById(crossed.ncId))!
    check('the NC took the item\'s own department', crossedNc.dept === 'RH', String(crossedNc.dept))
    check('and the item\'s own clause reference', crossedNc.referenceDoc === '7.2',
      String(crossedNc.referenceDoc))
  }

  console.log('\n15. Base restaurée après nettoyage')
  await cleanup()
  const after = await counts()
  check('audit_programs restored', after.programs === before.programs, `${before.programs} -> ${after.programs}`)
  check('audit_program_items restored', after.items === before.items, `${before.items} -> ${after.items}`)
  check('audit_logs restored', after.audits === before.audits, `${before.audits} -> ${after.audits}`)
  check('non_conformances restored', after.ncs === before.ncs, `${before.ncs} -> ${after.ncs}`)
  check('corrective_actions restored', after.capas === before.capas, `${before.capas} -> ${after.capas}`)
  check('management_reviews still empty', after.reviews === 0 && before.reviews === 0, String(after.reviews))
  check('no DMS test documents remain', after.docs === before.docs, `${before.docs} -> ${after.docs}`)
  const [{ leftover }] = await db.select({ leftover: sql<number>`count(*)` })
    .from(auditPrograms).where(like(auditPrograms.reference, `AUD-%-${Y}-%`))
  check('no test programme remains', Number(leftover) === 0)

  const [seqAfter] = await db.select().from(ncReferenceSequences)
    .where(eq(ncReferenceSequences.year, new Date().getFullYear()))
  const consumed = (seqAfter?.lastNumber ?? 0) - (seqBefore?.lastNumber ?? 0)
  console.log(`\n  Numéros de référence consommés : ${consumed} (sur ${target.isolated ? 'la branche de test' : 'LA BASE CONFIGURÉE'})`)
  check(`one reference per NC created (${ncsCreated}), never reused`,
    consumed === ncsCreated, `consommés ${consumed}, NC créées ${ncsCreated}`)

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1) })
