/**
 * Verifies the audit reference generators: atomicity under concurrency, correct
 * seeding, no reuse after deletion, per-year and per-department independence.
 *
 * Mirrors scripts/verify-nc-reference.ts.
 *
 * Run: npx tsx --env-file=.env scripts/verify-audit-references.ts
 */
import { db } from '../db/index'
import { auditLogs, auditPrograms, referenceSequences, users, documents, dmsDocumentLinks } from '../db/schema'
import { eq, and, sql, inArray, like } from 'drizzle-orm'
import {
  generateAuditReference, generateAuditProgramReference, createAuditProgram,
  updateAuditProgram, checkAuditProgramScheduleChange, getAuditProgramById,
  updateAudit,
} from '../src/lib/db/iso'

let pass = 0, fail = 0
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`) }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`) }
}

/** Far-future years so real sequences are never disturbed. */
const Y1 = 2907
const Y2 = 2908

async function cleanup() {
  const doomed = await db.select({ id: auditPrograms.id, code: auditPrograms.dmsDocumentCode })
    .from(auditPrograms).where(like(auditPrograms.reference, 'AUD-%-290%'))
  for (const d of doomed) {
    if (!d.code) continue
    const docs = await db.select({ id: documents.id }).from(documents).where(eq(documents.code, d.code))
    for (const doc of docs) await db.delete(dmsDocumentLinks).where(eq(dmsDocumentLinks.documentId, doc.id))
    await db.delete(documents).where(eq(documents.code, d.code))
  }
  await db.delete(auditLogs).where(like(auditLogs.reference, 'AUD-290%'))
  await db.delete(auditPrograms).where(like(auditPrograms.reference, 'AUD-%-290%'))
  await db.delete(referenceSequences).where(inArray(referenceSequences.year, [Y1, Y2, Y2 + 1]))
}

async function main() {
  const [admin] = await db.select({ id: users.id }).from(users).limit(1)
  await cleanup()
  // Snapshot so section 12 can assert "unchanged by this suite" rather than an
  // absolute value — other suites legitimately advance the current-year counter.
  const ncSeqBefore = await db.execute<{ year: number; last_number: number }>(
    sql`SELECT year, last_number FROM nc_reference_sequences ORDER BY year`
  )

  // ══ generateAuditReference ══════════════════════════════════════════════
  console.log('\n── AUD-YYYY-NNN (audit_logs) ──')

  console.log('\n1. Seeding from existing references, not row counts')
  const seeded = await db.select().from(referenceSequences)
    .where(and(eq(referenceSequences.scope, 'audit'), eq(referenceSequences.year, 2025)))
  check('2025 seeded from AUD-2025-003', seeded[0]?.lastNumber === 3, `got ${seeded[0]?.lastNumber}`)
  const existing = await db.select({ reference: auditLogs.reference }).from(auditLogs)
    .where(sql`reference ~ '^AUD-[0-9]{4}-[0-9]+$'`).orderBy(auditLogs.reference)
  check('the 3 existing audit references are unchanged',
    JSON.stringify(existing.map((r) => r.reference)) ===
    JSON.stringify(['AUD-2025-001', 'AUD-2025-002', 'AUD-2025-003']),
    JSON.stringify(existing.map((r) => r.reference)))

  console.log('\n2. Correct format and starting number')
  const a1 = await generateAuditReference(Y1)
  check(`fresh year starts at 001`, a1 === `AUD-${Y1}-001`, a1)
  check('format is AUD-YYYY-NNN (3 digits)', /^AUD-\d{4}-\d{3}$/.test(a1), a1)
  const a2 = await generateAuditReference(Y1)
  check('increments to 002', a2 === `AUD-${Y1}-002`, a2)

  console.log('\n3. 25 simultaneous allocations')
  const refs = await Promise.all(Array.from({ length: 25 }, () => generateAuditReference(Y1)))
  check('25 concurrent callers got 25 distinct references', new Set(refs).size === 25,
    `${new Set(refs).size} distinct`)
  const nums = refs.map((r) => Number(r.slice(-3))).sort((a, b) => a - b)
  check('contiguous block, no gap or repeat',
    nums[0] === 3 && nums[24] === 27 && nums.every((n, i) => i === 0 || n === nums[i - 1] + 1),
    `${nums[0]}..${nums[24]}`)

  console.log('\n4. Concurrent allocation + insertion (unique constraint holds)')
  const created = await Promise.all(Array.from({ length: 10 }, async () => {
    const reference = await generateAuditReference(Y1)
    const [row] = await db.insert(auditLogs).values({
      reference, auditorId: admin.id, auditDate: new Date(),
      processAudited: 'test', status: 'scheduled', createdBy: admin.id,
    }).returning({ id: auditLogs.id, reference: auditLogs.reference })
    return row
  }))
  check('10 concurrent inserts all succeeded', created.length === 10)
  check('no unique-constraint failure', new Set(created.map((c) => c.reference)).size === 10)

  console.log('\n5. Deletion does not free a number')
  const victim = created[created.length - 1]
  const victimNum = Number(victim.reference.slice(-3))
  await db.delete(auditLogs).where(eq(auditLogs.id, victim.id))
  const afterHard = await generateAuditReference(Y1)
  check('hard-deleted number is not reissued', Number(afterHard.slice(-3)) > victimNum,
    `deleted ${victimNum}, next ${afterHard}`)
  // audit_logs has no deletedAt; softDeleteAudit() sets status='completed'.
  const alive = created[0]
  await db.update(auditLogs).set({ status: 'completed' }).where(eq(auditLogs.id, alive.id))
  const afterSoft = await generateAuditReference(Y1)
  check('a soft-deleted (status=completed) number is not reissued',
    afterSoft !== alive.reference && Number(afterSoft.slice(-3)) > Number(alive.reference.slice(-3)),
    `soft-deleted ${alive.reference}, next ${afterSoft}`)

  console.log('\n6. Years are independent')
  const other = await generateAuditReference(Y2)
  check(`${Y2} starts its own sequence at 001`, other === `AUD-${Y2}-001`, other)
  const back = await generateAuditReference(Y1)
  check(`${Y1} continues past ${Y2}`, Number(back.slice(-3)) > 1, back)

  // ══ generateAuditProgramReference ═══════════════════════════════════════
  console.log('\n── AUD-DEPT-YYYY-NN (audit_programs) ──')

  console.log('\n7. Seeding, format and starting number')
  const pSeed = await db.select().from(referenceSequences)
    .where(and(eq(referenceSequences.scope, 'audit_program:AC'), eq(referenceSequences.year, 2026)))
  check('AC/2026 seeded from AUD-AC-2026-01', pSeed[0]?.lastNumber === 1, `got ${pSeed[0]?.lastNumber}`)
  const p1 = await generateAuditProgramReference('AC', Y1)
  check('fresh dept/year starts at 01', p1 === `AUD-AC-${Y1}-01`, p1)
  check('format is AUD-DEPT-YYYY-NN (2 digits)', /^AUD-[A-Z0-9]+-\d{4}-\d{2}$/.test(p1), p1)

  console.log('\n8. 25 simultaneous allocations')
  const pRefs = await Promise.all(Array.from({ length: 25 }, () => generateAuditProgramReference('AC', Y1)))
  check('25 concurrent callers got 25 distinct references', new Set(pRefs).size === 25,
    `${new Set(pRefs).size} distinct`)
  const pNums = pRefs.map((r) => Number(r.slice(-2))).sort((a, b) => a - b)
  check('contiguous block, no gap or repeat',
    pNums[0] === 2 && pNums[24] === 26 && pNums.every((n, i) => i === 0 || n === pNums[i - 1] + 1),
    `${pNums[0]}..${pNums[24]}`)

  console.log('\n9. Departments hold independent counters')
  const re1 = await generateAuditProgramReference('RE1', Y1)
  check(`RE1/${Y1} starts at 01, unaffected by AC`, re1 === `AUD-RE1-${Y1}-01`, re1)
  const acNext = await generateAuditProgramReference('AC', Y1)
  check('AC continues its own counter', Number(acNext.slice(-2)) > 26, acNext)
  const re1Next = await generateAuditProgramReference('RE1', Y1)
  check('RE1 continues its own counter', re1Next === `AUD-RE1-${Y1}-02`, re1Next)

  console.log('\n10. Concurrent allocation + insertion, and deletion non-reuse')
  const pCreated = await Promise.all(Array.from({ length: 10 }, async () => {
    const reference = await generateAuditProgramReference('ET', Y1)
    const [row] = await db.insert(auditPrograms).values({
      reference, year: Y1, dept: 'ET', status: 'planifie', createdBy: admin.id,
    }).returning({ id: auditPrograms.id, reference: auditPrograms.reference })
    return row
  }))
  check('10 concurrent inserts all succeeded', pCreated.length === 10)
  check('no unique-constraint failure', new Set(pCreated.map((c) => c.reference)).size === 10)
  const pVictim = pCreated[pCreated.length - 1]
  await db.delete(auditPrograms).where(eq(auditPrograms.id, pVictim.id))
  const pAfter = await generateAuditProgramReference('ET', Y1)
  check('hard-deleted number is not reissued',
    Number(pAfter.slice(-2)) > Number(pVictim.reference.slice(-2)),
    `deleted ${pVictim.reference}, next ${pAfter}`)

  console.log('\n11. Year rollover and scope isolation')
  const rollover = await generateAuditProgramReference('AC', Y2 + 1)
  check('a brand-new year rolls over to 01', rollover === `AUD-AC-${Y2 + 1}-01`, rollover)
  const auditScope = await db.select().from(referenceSequences)
    .where(and(eq(referenceSequences.scope, 'audit'), eq(referenceSequences.year, Y1)))
  const progScope = await db.select().from(referenceSequences)
    .where(and(eq(referenceSequences.scope, 'audit_program:AC'), eq(referenceSequences.year, Y1)))
  check('audit and audit_program counters are separate rows',
    auditScope.length === 1 && progScope.length === 1)
  check('they hold different values (no shared consumption)',
    auditScope[0].lastNumber !== progScope[0].lastNumber,
    `audit=${auditScope[0].lastNumber} program=${progScope[0].lastNumber}`)

  console.log('\n12. NC sequence untouched by this work')
  const ncSeq = await db.execute<{ year: number; last_number: number }>(
    sql`SELECT year, last_number FROM nc_reference_sequences ORDER BY year`
  )
  check('nc_reference_sequences unchanged by this suite',
    JSON.stringify(ncSeq.rows) === JSON.stringify(ncSeqBefore.rows),
    `${JSON.stringify(ncSeqBefore.rows)} -> ${JSON.stringify(ncSeq.rows)}`)
  check('nc/2025 still 3', Number(ncSeq.rows.find((r) => Number(r.year) === 2025)?.last_number) === 3)

  // ══ createAuditProgram: reference year must match the stored year ═══════
  console.log('\n── createAuditProgram year consistency ──')

  console.log('\n13. Scheduled in the current year')
  const sameYear = await createAuditProgram({
    dept: 'CO',
    scheduledDate: new Date(Y1, 5, 15), // June of Y1
    createdBy: admin.id,
  })
  check(`year column is ${Y1}`, sameYear.year === Y1, String(sameYear.year))
  check('reference carries the same year',
    sameYear.reference.startsWith(`AUD-CO-${Y1}-`), sameYear.reference)

  console.log('\n14. Created in December, scheduled for the following January')
  // The reported case: creating in December 2026 for January 2027 must number
  // the programme in 2027, not in the year it was entered.
  const nextYear = await createAuditProgram({
    dept: 'CO',
    scheduledDate: new Date(Y2, 0, 12), // January of Y2
    createdBy: admin.id,
  })
  check(`year column is ${Y2}`, nextYear.year === Y2, String(nextYear.year))
  check(`reference is AUD-CO-${Y2}-NN, not AUD-CO-${Y1}-NN`,
    nextYear.reference.startsWith(`AUD-CO-${Y2}-`), nextYear.reference)
  check('reference year and year column agree',
    Number(nextYear.reference.split('-')[2]) === nextYear.year,
    `${nextYear.reference} vs year=${nextYear.year}`)
  // The programme is genuinely created now, so the real creation year differs
  // from the scheduled year — this is the December-2026 / January-2027 shape.
  const creationYear = new Date().getFullYear()
  check(`created in ${creationYear} but numbered in ${Y2}`,
    !nextYear.reference.startsWith(`AUD-CO-${creationYear}-`) &&
    !nextYear.reference.startsWith(`AUD-CO-${Y1}-`),
    nextYear.reference)
  check('format is unchanged', /^AUD-[A-Z0-9]+-\d{4}-\d{2}$/.test(nextYear.reference),
    nextYear.reference)

  console.log('\n15. The two years keep separate counters after that')
  const backToY1 = await createAuditProgram({
    dept: 'CO', scheduledDate: new Date(Y1, 7, 1), createdBy: admin.id,
  })
  check(`${Y1} continues at 02`, backToY1.reference === `AUD-CO-${Y1}-02`, backToY1.reference)
  const moreY2 = await createAuditProgram({
    dept: 'CO', scheduledDate: new Date(Y2, 1, 1), createdBy: admin.id,
  })
  check(`${Y2} continues at 02`, moreY2.reference === `AUD-CO-${Y2}-02`, moreY2.reference)

  console.log('\n16. No scheduled date falls back to the current year')
  const noDate = await createAuditProgram({ dept: 'CO', createdBy: admin.id })
  const thisYear = new Date().getFullYear()
  check('year column is the current year', noDate.year === thisYear, String(noDate.year))
  check('reference carries the current year',
    noDate.reference.startsWith(`AUD-CO-${thisYear}-`), noDate.reference)
  // Clean up this one separately — it lands in a real year, not a test year.
  if (noDate.dmsDocumentCode) {
    const docs = await db.select({ id: documents.id }).from(documents)
      .where(eq(documents.code, noDate.dmsDocumentCode))
    for (const doc of docs) await db.delete(dmsDocumentLinks).where(eq(dmsDocumentLinks.documentId, doc.id))
    await db.delete(documents).where(eq(documents.code, noDate.dmsDocumentCode))
  }
  await db.delete(auditPrograms).where(eq(auditPrograms.id, noDate.id))
  await db.delete(referenceSequences).where(
    and(eq(referenceSequences.scope, 'audit_program:CO'), eq(referenceSequences.year, thisYear))
  )

  console.log('\n17. Pre-existing audit programmes are untouched')
  const untouched = await db
    .select({ reference: auditPrograms.reference, year: auditPrograms.year })
    .from(auditPrograms)
    .where(sql`reference !~ '290[0-9]'`)
    .orderBy(auditPrograms.reference)
  check('the original AUD-AC-2026-01 still reads the same',
    JSON.stringify(untouched) === JSON.stringify([{ reference: 'AUD-AC-2026-01', year: 2026 }]),
    JSON.stringify(untouched))

  // ══ updateAuditProgram: the year invariant ══════════════════════════════
  console.log('\n── updateAuditProgram year invariant ──')

  const subject = await createAuditProgram({
    dept: 'RH',
    scheduledDate: new Date(Y1, 0, 15), // 15 January Y1
    createdBy: admin.id,
  })
  const subjectRef = subject.reference
  const subjectYear = subject.year

  console.log('\n18. Same-year reschedule is allowed')
  const sameYearMove = await checkAuditProgramScheduleChange(subject.id, new Date(Y1, 11, 20))
  check('moving 15 Jan → 20 Dec of the same year passes the check', sameYearMove.ok === true,
    sameYearMove.reason ?? '')
  await updateAuditProgram(subject.id, { scheduledDate: new Date(Y1, 11, 20) })
  const afterSameYear = (await getAuditProgramById(subject.id))!
  check('the reschedule was applied',
    afterSameYear.scheduledDate?.getFullYear() === Y1 && afterSameYear.scheduledDate?.getMonth() === 11,
    String(afterSameYear.scheduledDate))
  check('reference unchanged by a same-year move', afterSameYear.reference === subjectRef,
    afterSameYear.reference)
  check('year column unchanged by a same-year move', afterSameYear.year === subjectYear,
    String(afterSameYear.year))

  console.log('\n19. Cross-year reschedule is rejected')
  const crossYear = await checkAuditProgramScheduleChange(subject.id, new Date(Y2, 0, 15))
  check('moving Dec Y1 → Jan Y2 is refused', crossYear.ok === false, 'it was allowed')
  check('the reason names the reference', (crossYear.reason ?? '').includes(subjectRef),
    crossYear.reason ?? '')
  check('the reason names the locked year', (crossYear.reason ?? '').includes(String(subjectYear)),
    crossYear.reason ?? '')

  console.log('\n20. Nothing changed after a rejected update')
  const afterReject = (await getAuditProgramById(subject.id))!
  check('reference untouched', afterReject.reference === subjectRef, afterReject.reference)
  check('year untouched', afterReject.year === subjectYear, String(afterReject.year))
  check('scheduled date untouched',
    afterReject.scheduledDate?.getFullYear() === Y1 && afterReject.scheduledDate?.getMonth() === 11,
    String(afterReject.scheduledDate))

  console.log('\n21. Other fields still update normally')
  await updateAuditProgram(subject.id, { title: 'Titre révisé', status: 'en_cours' })
  const afterFieldEdit = (await getAuditProgramById(subject.id))!
  check('title updated', afterFieldEdit.title === 'Titre révisé', afterFieldEdit.title ?? '')
  check('status updated', afterFieldEdit.status === 'en_cours', afterFieldEdit.status)
  check('reference still unchanged', afterFieldEdit.reference === subjectRef, afterFieldEdit.reference)

  console.log('\n22. Clearing the scheduled date is allowed')
  const clearing = await checkAuditProgramScheduleChange(subject.id, null)
  check('unscheduling passes the check', clearing.ok === true, clearing.reason ?? '')
  const untouchedUpdate = await checkAuditProgramScheduleChange(subject.id, undefined)
  check('an update that omits scheduledDate passes the check', untouchedUpdate.ok === true,
    untouchedUpdate.reason ?? '')

  console.log('\n23. `year` cannot be supplied independently')
  // It is absent from both the route's zod schema and updateAuditProgram's input
  // type, so a caller cannot set it. Prove the data layer ignores it even when forced.
  await updateAuditProgram(subject.id, { year: Y2, notes: 'tentative' } as unknown as Parameters<typeof updateAuditProgram>[1])
  const afterYearAttempt = (await getAuditProgramById(subject.id))!
  check('year is still the original', afterYearAttempt.year === subjectYear, String(afterYearAttempt.year))
  check('reference is still the original', afterYearAttempt.reference === subjectRef,
    afterYearAttempt.reference)

  console.log('\n24. A pre-existing inconsistency is neither repaired nor frozen')
  // Force a legacy-shaped row: scheduled year deliberately different from `year`.
  const legacy = await createAuditProgram({
    dept: 'MI', scheduledDate: new Date(Y1, 3, 1), createdBy: admin.id,
  })
  await db.update(auditPrograms)
    .set({ scheduledDate: new Date(Y2, 3, 1) }) // now inconsistent with year = Y1
    .where(eq(auditPrograms.id, legacy.id))
  const legacyMove = await checkAuditProgramScheduleChange(legacy.id, new Date(Y2, 6, 1))
  check('an already-inconsistent record is not blocked', legacyMove.ok === true, legacyMove.reason ?? '')
  const legacyAfter = (await getAuditProgramById(legacy.id))!
  check('its reference was not rewritten', legacyAfter.reference === legacy.reference,
    legacyAfter.reference)
  check('its year was not silently repaired', legacyAfter.year === legacy.year,
    String(legacyAfter.year))

  console.log('\n25. A missing programme reports not-found, not a crash')
  const missing = await checkAuditProgramScheduleChange(
    '00000000-0000-0000-0000-000000000000', new Date(Y1, 0, 1))
  check('unknown id is refused cleanly', missing.ok === false && missing.reason === 'Programme introuvable',
    missing.reason ?? '')

  console.log('\n26. The pre-existing real programme is still untouched')
  const realRows = await db
    .select({ reference: auditPrograms.reference, year: auditPrograms.year,
              scheduled: auditPrograms.scheduledDate })
    .from(auditPrograms)
    .where(sql`reference !~ '290[0-9]'`)
  check('AUD-AC-2026-01 unchanged: year 2026, scheduled 2026',
    realRows.length === 1 && realRows[0].reference === 'AUD-AC-2026-01' &&
    realRows[0].year === 2026 && realRows[0].scheduled?.getFullYear() === 2026,
    JSON.stringify(realRows))

  // ══ updateAudit: explicit allowlist, no mass assignment ═════════════════
  console.log('\n── updateAudit field protection ──')

  const originalDate = new Date(Y1, 4, 20)
  const auditRef = await generateAuditReference(Y1)
  const [subjectAudit] = await db.insert(auditLogs).values({
    reference: auditRef,
    auditorId: admin.id,
    auditDate: originalDate,
    processAudited: 'Études & Conception',
    scope: 'Périmètre initial',
    findings: null,
    status: 'scheduled',
    createdBy: admin.id,
  }).returning()

  console.log('\n27. Legitimate fields still update')
  await updateAudit(subjectAudit.id, { findings: 'Constat A', scope: 'Périmètre révisé' })
  const [afterEdit] = await db.select().from(auditLogs).where(eq(auditLogs.id, subjectAudit.id))
  check('findings updated', afterEdit.findings === 'Constat A', afterEdit.findings ?? '')
  check('scope updated', afterEdit.scope === 'Périmètre révisé', afterEdit.scope ?? '')
  await updateAudit(subjectAudit.id, { status: 'in_progress' })
  const [afterStatus] = await db.select().from(auditLogs).where(eq(auditLogs.id, subjectAudit.id))
  check('status updated', afterStatus.status === 'in_progress', afterStatus.status)

  console.log('\n28. completedAt behaviour is unchanged')
  await updateAudit(subjectAudit.id, { completedAt: new Date(Y1, 0, 1) })
  const [noStamp] = await db.select().from(auditLogs).where(eq(auditLogs.id, subjectAudit.id))
  check('completedAt alone is ignored, as before', noStamp.completedAt === null,
    String(noStamp.completedAt))
  const closeStamp = new Date(Y1, 5, 30)
  await updateAudit(subjectAudit.id, { status: 'completed', completedAt: closeStamp })
  const [stamped] = await db.select().from(auditLogs).where(eq(auditLogs.id, subjectAudit.id))
  check('closing stamps the supplied completedAt',
    stamped.completedAt?.getTime() === closeStamp.getTime(), String(stamped.completedAt))

  console.log('\n29. Protected fields cannot be mass-assigned')
  // Forced past TypeScript exactly as an untrusted caller would.
  const forced = {
    reference: 'AUD-1999-999',
    auditDate: new Date(1999, 0, 1),
    auditorId: '00000000-0000-0000-0000-000000000000',
    processAudited: 'PIRATÉ',
    dmsDocumentCode: 'FOR-XX-99',
    createdBy: '00000000-0000-0000-0000-000000000000',
    createdAt: new Date(1999, 0, 1),
    id: '00000000-0000-0000-0000-000000000000',
    findings: 'Constat B',
  } as unknown as Parameters<typeof updateAudit>[1]
  await updateAudit(subjectAudit.id, forced)
  const [hardened] = await db.select().from(auditLogs).where(eq(auditLogs.id, subjectAudit.id))
  check('reference unchanged', hardened.reference === auditRef, hardened.reference)
  check('auditDate unchanged', hardened.auditDate.getTime() === originalDate.getTime(),
    String(hardened.auditDate))
  check('auditorId unchanged', hardened.auditorId === admin.id, hardened.auditorId)
  check('processAudited unchanged', hardened.processAudited === 'Études & Conception',
    hardened.processAudited)
  check('dmsDocumentCode unchanged', hardened.dmsDocumentCode === subjectAudit.dmsDocumentCode,
    String(hardened.dmsDocumentCode))
  check('createdBy unchanged', hardened.createdBy === admin.id, hardened.createdBy)
  check('createdAt unchanged', hardened.createdAt.getTime() === subjectAudit.createdAt.getTime(),
    String(hardened.createdAt))
  check('id unchanged', hardened.id === subjectAudit.id, hardened.id)
  check('the legitimate field in the same call still applied',
    hardened.findings === 'Constat B', hardened.findings ?? '')

  console.log('\n30. Unknown columns are not written')
  await updateAudit(subjectAudit.id,
    { totallyUnknownColumn: 'x', scope: 'Périmètre final' } as unknown as Parameters<typeof updateAudit>[1])
  const [afterUnknown] = await db.select().from(auditLogs).where(eq(auditLogs.id, subjectAudit.id))
  check('an unknown key does not break the update', afterUnknown.scope === 'Périmètre final',
    afterUnknown.scope ?? '')
  check('reference still intact after an unknown key', afterUnknown.reference === auditRef,
    afterUnknown.reference)

  console.log('\n31. Pre-existing audit records are untouched')
  const realAudits = await db
    .select({ reference: auditLogs.reference, auditDate: auditLogs.auditDate })
    .from(auditLogs)
    .where(sql`reference !~ '290[0-9]'`)
    .orderBy(auditLogs.reference)
  check('the 3 seeded audits keep their references',
    JSON.stringify(realAudits.map((r) => r.reference)) ===
    JSON.stringify(['AUD-2025-001', 'AUD-2025-002', 'AUD-2025-003']),
    JSON.stringify(realAudits.map((r) => r.reference)))
  check('their audit dates are unchanged (2016 / 2021 / 2026)',
    realAudits.map((r) => r.auditDate.getFullYear()).join(',') === '2016,2021,2026',
    realAudits.map((r) => r.auditDate.getFullYear()).join(','))

  await cleanup()
  console.log('\n  (test references and sequences removed)')
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch(async (e) => { console.error(e); await cleanup().catch(() => {}); process.exit(1) })
