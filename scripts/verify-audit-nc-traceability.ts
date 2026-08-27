/**
 * Audit finding → NC traceability, Zod payload rejection, and the
 * updateManagementReview protected-field contract.
 *
 * Every record created here is removed again; the script asserts no residue.
 *
 * This suite raises a real NC, which allocates a number from the current-year
 * reference counter. Numbers are never reused, so each run leaves a permanent
 * gap — run it against an isolated Neon branch. See scripts/lib/test-target.ts.
 *
 *   TEST_DATABASE_URL="postgres://…branch…" npx tsx --env-file=.env scripts/verify-audit-nc-traceability.ts
 */
import { selectTestTarget } from './lib/test-target'

// Must run before the first database operation. `db` is a lazy Proxy that
// resolves DATABASE_URL on first use, not on import, so the static imports
// below are safe once the target has been chosen here.
const target = selectTestTarget(true)
console.log(`Cible : ${target.label}\n`)

import { db } from '../db/index'
import {
  auditPrograms, auditProgramItems, nonConformances, correctiveActions,
  managementReviews, users, documents, dmsDocumentLinks, recordAuditLog,
  referenceSequences, ncReferenceSequences,
} from '../db/schema'
import { eq, and, inArray, like, sql, isNotNull } from 'drizzle-orm'
import {
  createAuditProgram, createNcFromAuditFinding, getNcOriginFinding,
  getAuditProgramById, upsertAuditProgramItems, checkNcClosePrerequisites,
  getNcById,
} from '../src/lib/db/iso'
import {
  monthlyPlanSchema, annualPlanSchema, pvProvisoireSchema, ganttSchema,
  lineItemsSchema, weeklyPlanCreateSchema, weeklyPlanUpdateSchema,
  portfolioSettingsSchema, qualityChecklistSchema, pvDefinitiveSchema,
} from '../src/lib/validation/project-docs'
import type { AuditActor } from '../src/lib/audit-record'

let pass = 0, fail = 0
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`) }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`) }
}

const Y = 2909
const REVIEW_REF_MARK = 'ZZTEST'

/** Snapshot of everything that must be identical afterwards. */
type Baseline = { ncCount: number; auditCount: number; programCount: number; reviewCount: number }

async function snapshot(): Promise<Baseline> {
  const [r] = await db.select({
    ncCount:      sql<number>`(select count(*) from non_conformances)`,
    auditCount:   sql<number>`(select count(*) from audit_logs)`,
    programCount: sql<number>`(select count(*) from audit_programs)`,
    reviewCount:  sql<number>`(select count(*) from management_reviews)`,
  }).from(users).limit(1)
  return {
    ncCount: Number(r.ncCount), auditCount: Number(r.auditCount),
    programCount: Number(r.programCount), reviewCount: Number(r.reviewCount),
  }
}

async function cleanup() {
  // Programmes created by this run, and any NC they raised.
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
      await db.delete(correctiveActions).where(inArray(correctiveActions.ncId, ncIds))
      await db.delete(recordAuditLog).where(inArray(recordAuditLog.entityId, ncIds))
      await db.delete(nonConformances).where(inArray(nonConformances.id, ncIds))
      for (const n of ncs) if (n.code) await dropDoc(n.code)
    }
    await db.delete(auditPrograms).where(inArray(auditPrograms.id, progIds))
    for (const p of progs) if (p.code) await dropDoc(p.code)
  }
  await db.delete(referenceSequences).where(eq(referenceSequences.year, Y))
  await db.delete(ncReferenceSequences).where(eq(ncReferenceSequences.year, Y))
  // Temporary management review
  const revs = await db.select({ id: managementReviews.id })
    .from(managementReviews).where(like(managementReviews.participants, `%${REVIEW_REF_MARK}%`))
  if (revs.length) {
    await db.delete(managementReviews).where(inArray(managementReviews.id, revs.map((r) => r.id)))
  }
}

async function dropDoc(code: string) {
  const docs = await db.select({ id: documents.id }).from(documents).where(eq(documents.code, code))
  for (const d of docs) await db.delete(dmsDocumentLinks).where(eq(dmsDocumentLinks.documentId, d.id))
  await db.delete(documents).where(eq(documents.code, code))
}

async function main() {
  const [adminRow] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users).where(eq(users.email, 'admin@sopat.tn')).limit(1)
  const [fallback] = adminRow ? [adminRow]
    : await db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).limit(1)
  const admin = fallback
  const actor: AuditActor = { userId: admin.id, name: admin.name, email: admin.email, role: admin.role }

  await cleanup()
  const before = await snapshot()
  const [seqBefore] = await db.select().from(ncReferenceSequences)
    .where(eq(ncReferenceSequences.year, new Date().getFullYear()))

  // ══ TASK 1 — audit finding → NC ═════════════════════════════════════════
  console.log('\n── Audit finding → NC traceability ──')

  const program = await createAuditProgram({
    dept: 'MI', scheduledDate: new Date(Y, 2, 10), createdBy: admin.id,
  })
  await upsertAuditProgramItems(program.id, [
    { agendaStep: 'Revue du processus management intégré', clauseRef: '9.2 / 9.3',
      conformity: 'NC', response: 'Analyse des changements non maîtrisée.', sortOrder: 0 },
    { agendaStep: 'Revue documentaire', clauseRef: '7.5', conformity: 'C', sortOrder: 1 },
  ], admin.id)

  const loaded = (await getAuditProgramById(program.id))!
  const finding = loaded.items.find((i) => i.conformity === 'NC')!
  const conformItem = loaded.items.find((i) => i.conformity === 'C')!

  console.log('\n1. A finding can raise an NC')
  const raised = await createNcFromAuditFinding({
    itemId: finding.id, detectedBy: admin.id, createdBy: admin.id, actor,
  })
  check('creation succeeded', raised.ok === true, 'ok' in raised ? '' : String(raised))
  if (!raised.ok) { console.log('  aborting'); await cleanup(); process.exit(1) }
  check('reference follows NC-YYYY-NNN', /^NC-\d{4}-\d{3}$/.test(raised.reference), raised.reference)

  console.log('\n2. The finding holds the relationship')
  const [linked] = await db.select({ ncId: auditProgramItems.ncId })
    .from(auditProgramItems).where(eq(auditProgramItems.id, finding.id))
  check('finding.nc_id points at the new NC', linked.ncId === raised.ncId, String(linked.ncId))

  console.log('\n3. Finding → NC navigation')
  const reloaded = (await getAuditProgramById(program.id))!
  const reFinding = reloaded.items.find((i) => i.id === finding.id)!
  check('the item exposes its NC id', reFinding.ncId === raised.ncId, String(reFinding.ncId))
  check('the item exposes the NC reference', reFinding.ncReference === raised.reference,
    String(reFinding.ncReference))

  console.log('\n4. NC → finding navigation')
  const origin = await getNcOriginFinding(raised.ncId)
  check('the NC finds its originating finding', origin?.itemId === finding.id, String(origin?.itemId))
  check('the programme is reachable from the NC', origin?.programRef === program.reference,
    String(origin?.programRef))

  console.log('\n5. A finding cannot raise a second NC')
  const dup = await createNcFromAuditFinding({
    itemId: finding.id, detectedBy: admin.id, createdBy: admin.id, actor,
  })
  check('the duplicate is refused', dup.ok === false, 'it was allowed')
  check('the refusal returns the existing NC', !dup.ok && dup.existingNcId === raised.ncId,
    !dup.ok ? String(dup.existingNcId) : '')
  const [{ ncsForFinding }] = await db.select({ ncsForFinding: sql<number>`count(*)` })
    .from(auditProgramItems).where(and(eq(auditProgramItems.id, finding.id), isNotNull(auditProgramItems.ncId)))
  check('still exactly one NC on the finding', Number(ncsForFinding) === 1, String(ncsForFinding))

  console.log('\n6. The clause reference stays traceable')
  check('clause reference readable from the NC', origin?.clauseRef === '9.2 / 9.3', String(origin?.clauseRef))
  const ncRow = (await getNcById(raised.ncId))!
  check('clause reference echoed on the NC record', ncRow.referenceDoc === '9.2 / 9.3',
    String(ncRow.referenceDoc))
  check('source recorded as audit', ncRow.ncSource === 'audit', String(ncRow.ncSource))

  console.log('\n7. The link survives a re-save of the programme items')
  await upsertAuditProgramItems(program.id, reloaded.items.map((i) => ({
    id: i.id, agendaStep: i.agendaStep, clauseRef: i.clauseRef ?? undefined,
    response: i.response ?? undefined, conformity: i.conformity ?? undefined,
    evidence: 'preuve ajoutée', sortOrder: i.sortOrder,
  })), admin.id)
  const afterSave = (await getAuditProgramById(program.id))!
  const survived = afterSave.items.find((i) => i.ncId === raised.ncId)
  check('the NC link survived delete-and-reinsert', !!survived, 'link lost on save')
  check('the conforming item still has no NC',
    afterSave.items.find((i) => i.agendaStep === conformItem.agendaStep)?.ncId === null)

  console.log('\n8. NC closure rules are unchanged for the new NC')
  const gate = await checkNcClosePrerequisites(raised.ncId, admin.id, 'closed')
  check('closure still blocked without evidence', gate.ok === false, gate.reason ?? '')
  check('it is not treated as historical', gate.historical === false)
  check('record origin is platform', ncRow.recordOrigin === 'platform', ncRow.recordOrigin)

  console.log('\n9. Historical records untouched')
  const [{ importedLinked }] = await db.select({ importedLinked: sql<number>`count(*)` })
    .from(nonConformances)
    .where(and(eq(nonConformances.recordOrigin, 'imported'), isNotNull(nonConformances.auditId)))
  check('no imported NC was given an audit link', Number(importedLinked) === 0, String(importedLinked))
  const [{ importedFindings }] = await db.select({ importedFindings: sql<number>`count(*)` })
    .from(auditProgramItems)
    .where(and(isNotNull(auditProgramItems.ncId), sql`nc_id in (select id from non_conformances where record_origin = 'imported')`))
  check('no imported NC was attached to a finding', Number(importedFindings) === 0, String(importedFindings))

  console.log('\n10. Reference sequences remain correct')
  const seqs = await db.select().from(ncReferenceSequences).where(inArray(ncReferenceSequences.year, [2025, 2026]))
  check('nc/2025 untouched at 3', seqs.find((s) => s.year === 2025)?.lastNumber === 3,
    String(seqs.find((s) => s.year === 2025)?.lastNumber))
  // The NC is created through generateNcReference(), which numbers by the current
  // year — so this run consumes exactly one number from it. Numbers are never
  // reused, so the counter must advance by one and never go backwards.
  const [seqAfter] = await db.select().from(ncReferenceSequences)
    .where(eq(ncReferenceSequences.year, new Date().getFullYear()))
  check('current-year counter advanced by exactly one',
    seqAfter.lastNumber === (seqBefore?.lastNumber ?? 0) + 1,
    `${seqBefore?.lastNumber} -> ${seqAfter.lastNumber}`)

  // ══ TASK 2 — Zod payload rejection ══════════════════════════════════════
  console.log('\n── Zod validation on project-document routes ──')

  console.log('\n11. Malformed payloads are rejected')
  check('monthly-plan: missing moisAnnee', !monthlyPlanSchema.safeParse({}).success)
  check('monthly-plan: wrong task shape',
    !monthlyPlanSchema.safeParse({ moisAnnee: '2026-01', tasks: [{ taskLabel: 1 }] }).success)
  check('annual-plan: annee must be a number',
    !annualPlanSchema.safeParse({ annee: 'deux-mille' }).success)
  check('annual-plan: month out of range',
    !annualPlanSchema.safeParse({ annee: 2026, monthlyData: [{ month: 13, frequence: '', jours: '', nbrePrevu: 0, nbreRealise: 0 }] }).success)
  check('gantt: bad row type', !ganttSchema.safeParse({ ganttRows: [{ rowId: 'a', label: 'b', type: 'nope', prWeeks: [], reWeeks: [] }] }).success)
  check('line items: items required', !lineItemsSchema.safeParse({}).success)
  check('weekly create: week bounds required', !weeklyPlanCreateSchema.safeParse({ region: 'Nord' }).success)
  check('quality checklist: bad item', !qualityChecklistSchema.safeParse({ items: [{ itemId: 'x' }] }).success)
  check('null body is rejected', !pvProvisoireSchema.safeParse(null).success)

  console.log('\n12. Valid payloads still pass, unknown keys stripped')
  check('monthly-plan accepts a valid body',
    monthlyPlanSchema.safeParse({ moisAnnee: '2026-01', fournitures: 'x' }).success)
  check('weekly update stays partial', weeklyPlanUpdateSchema.safeParse({ region: 'Nord' }).success)
  const stripped = pvDefinitiveSchema.safeParse({ date: '2026-01-01', createdBy: 'attacker', id: 'x' })
  check('pv-definitive strips unknown keys',
    stripped.success && !('createdBy' in stripped.data) && !('id' in stripped.data),
    JSON.stringify(stripped.success ? stripped.data : stripped.error.issues))
  const settings = portfolioSettingsSchema.safeParse({ ceoName: 'X', isSingleton: false, updatedBy: 'y' })
  check('portfolio settings strips isSingleton/updatedBy',
    settings.success && !('isSingleton' in settings.data) && !('updatedBy' in settings.data))
  const jsonb = pvProvisoireSchema.safeParse({
    signatories: [{ name: 'A', role: 'B', organisation: 'C', signed: true }],
    checklistItems: [{ designation: 'd', observation: 'o', decision: 'x', action: 'a', responsable: 'r', delai: 't', reserve: false }],
  })
  check('JSONB arrays survive validation intact',
    jsonb.success && jsonb.data.signatories?.length === 1 && jsonb.data.checklistItems?.length === 1)

  // ══ TASK 3 — management review integration ══════════════════════════════
  console.log('\n── updateManagementReview protected fields ──')

  const { applyManagementReviewUpdate } = await import('../src/lib/db/management-reviews')

  const [review] = await db.insert(managementReviews).values({
    reference: `REV-${Y}-${REVIEW_REF_MARK}`,
    reviewDate: `${Y}-03-15`,
    status: 'planned',
    participants: `Participants initiaux ${REVIEW_REF_MARK}`,
    conclusions: 'Conclusions initiales',
    createdBy: admin.id,
  }).returning()

  console.log('\n13. Legitimate fields update')
  const ok = await applyManagementReviewUpdate(review.id, {
    conclusions: 'Conclusions révisées',
    status: 'held',
    participants: `Participants révisés ${REVIEW_REF_MARK}`,
  })
  check('the update succeeded', ok.success === true, ok.error ?? '')
  const [afterEdit] = await db.select().from(managementReviews).where(eq(managementReviews.id, review.id))
  check('conclusions updated', afterEdit.conclusions === 'Conclusions révisées', afterEdit.conclusions ?? '')
  check('status updated', afterEdit.status === 'held', afterEdit.status)
  check('participants updated', afterEdit.participants?.includes('révisés') === true,
    afterEdit.participants ?? '')

  console.log('\n14. Invalid values are rejected')
  const badStatus = await applyManagementReviewUpdate(review.id, { status: 'annule' })
  check('an unknown status is refused', badStatus.success === false, JSON.stringify(badStatus))
  const badDate = await applyManagementReviewUpdate(review.id, { reviewDate: '15/03/2909' })
  check('a malformed date is refused', badDate.success === false, JSON.stringify(badDate))
  const [unchangedByBad] = await db.select().from(managementReviews).where(eq(managementReviews.id, review.id))
  check('status unchanged after a refused update', unchangedByBad.status === 'held', unchangedByBad.status)

  console.log('\n15. Protected fields cannot be overwritten')
  const forged = {
    id: '00000000-0000-0000-0000-000000000000',
    reference: 'REV-HACKED',
    createdAt: new Date(1999, 0, 1),
    createdBy: '00000000-0000-0000-0000-000000000000',
    deletedAt: new Date(),
    updatedAt: new Date(1999, 0, 1),
    conclusions: 'Conclusions finales',
  }
  const forgedRes = await applyManagementReviewUpdate(review.id, forged)
  check('the call succeeds, ignoring the forged keys', forgedRes.success === true, forgedRes.error ?? '')
  const [afterForge] = await db.select().from(managementReviews).where(eq(managementReviews.id, review.id))
  check('id unchanged', afterForge.id === review.id)
  check('reference unchanged', afterForge.reference === review.reference, afterForge.reference)
  check('createdAt unchanged', afterForge.createdAt.getTime() === review.createdAt.getTime(),
    String(afterForge.createdAt))
  check('createdBy unchanged', afterForge.createdBy === review.createdBy)
  check('deletedAt still null', afterForge.deletedAt === null, String(afterForge.deletedAt))
  check('updatedAt not rolled back to 1999', afterForge.updatedAt.getFullYear() > 2000,
    String(afterForge.updatedAt))
  check('the legitimate field in the same call still applied',
    afterForge.conclusions === 'Conclusions finales', afterForge.conclusions ?? '')

  console.log('\n16. Cleanup leaves no residue')
  await cleanup()
  const after = await snapshot()
  check('non_conformances count restored', after.ncCount === before.ncCount,
    `${before.ncCount} -> ${after.ncCount}`)
  check('audit_logs count restored', after.auditCount === before.auditCount)
  check('audit_programs count restored', after.programCount === before.programCount,
    `${before.programCount} -> ${after.programCount}`)
  check('management_reviews count restored', after.reviewCount === before.reviewCount,
    `${before.reviewCount} -> ${after.reviewCount}`)
  const [{ leftover }] = await db.select({ leftover: sql<number>`count(*)` })
    .from(auditPrograms).where(like(auditPrograms.reference, `AUD-%-${Y}-%`))
  check('no test programme remains', Number(leftover) === 0)

  const [seqFinal] = await db.select().from(ncReferenceSequences)
    .where(eq(ncReferenceSequences.year, new Date().getFullYear()))
  const consumed = (seqFinal?.lastNumber ?? 0) - (seqBefore?.lastNumber ?? 0)
  console.log(
    `\n  Numéros de référence consommés : ${consumed} ` +
    `(sur ${target.isolated ? 'la branche de test' : 'LA BASE CONFIGURÉE'})`
  )

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1) })
