/**
 * Verifies the FOR-MI-05 fixes end to end against the real data layer.
 * Creates a throwaway NC, exercises the repaired code paths, then removes it.
 *
 * Run: npx tsx --env-file=.env scripts/verify-formi05.ts
 */
import { db } from '../db/index'
import { nonConformances, correctiveActions, users, documents, dmsDocumentLinks, recordAuditLog } from '../db/schema'
import { eq, and, isNotNull, isNull, sql } from 'drizzle-orm'
import {
  createNc, getNcById, updateNcFields, updateNcStatus, createCapa, updateCapa,
  listNcsForRegisterExport, listNcs, getNcAuditTrail, checkNcClosePrerequisites,
} from '../src/lib/db/iso'
import type { AuditActor } from '../src/lib/audit-record'

let pass = 0, fail = 0
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`) }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`) }
}

async function main() {
  const [adminRow] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .limit(1)
  const admin = adminRow
  const actor: AuditActor = {
    userId: adminRow.id, name: adminRow.name, email: adminRow.email, role: adminRow.role,
  }

  console.log('\n1. Repaired register data')
  const [agg] = await db
    .select({
      derog: sql<number>`count(*) filter (where derogation_auth)`,
      rebut: sql<number>`count(*) filter (where rebut)`,
      closedNoDate: sql<number>`count(*) filter (where status = 'closed' and closed_at is null)`,
      riskDesig: sql<number>`count(risk_designation)`,
      freeText: sql<number>`count(correction_deadline_planned_text)`,
      mi: sql<number>`count(*) filter (where dept::text = 'MI1')`,
      xRef: sql<number>`count(*) filter (where client_response_ref = 'X')`,
    })
    .from(nonConformances)
    .where(and(isNull(nonConformances.deletedAt), isNotNull(nonConformances.ncFicheNum)))

  check('no NC claims a derogation', Number(agg.derog) === 0, `got ${agg.derog}`)
  check('no NC claims rebut', Number(agg.rebut) === 0, `got ${agg.rebut}`)
  check('no closed NC lacks a closure date', Number(agg.closedNoDate) === 0, `got ${agg.closedNoDate}`)
  check('risk designations preserved', Number(agg.riskDesig) === 19, `got ${agg.riskDesig}`)
  check('free-text deadlines preserved', Number(agg.freeText) === 16, `got ${agg.freeText}`)
  check('MI split into MI1 (13 per the sheet stats)', Number(agg.mi) === 13, `got ${agg.mi}`)
  check('"X" placeholders cleared from R/O ref', Number(agg.xRef) === 0, `got ${agg.xRef}`)

  console.log('\n2. Register export covers every FOR-MI-05 column')
  const exported = await listNcsForRegisterExport({})
  check('export returns the full register', exported.length >= 47, `got ${exported.length}`)
  check('export is ordered by N° Fiche', exported[0]?.ncFicheNum === 1, `got ${exported[0]?.ncFicheNum}`)
  const f1 = exported.find((n) => n.ncFicheNum === 1)
  check('export carries the risk designation', f1?.riskDesignation === 'qualité du service', `got ${f1?.riskDesignation}`)
  check('export carries CAPA rows', (f1?.capa.length ?? 0) > 0)

  console.log('\n3. New NC accepts the previously-unreachable fields')
  const created = await createNc({
    reference: `TEST-VERIFY-${Date.now()}`,
    description: 'Fiche de vérification automatique — à supprimer.',
    ncFicheNum: 9999,
    ncMonth: 'Décembre',
    detectedAt: new Date('2025-03-15T00:00:00.000Z'),
    dept: 'MI2',
    correctionProgress: 0.4,
    correctionDeadlinePlannedText: 'S3 Juin 2025',
    clientResponseRef: 'REF-42',
    isRisk: true,
    riskDesignation: 'qualité du service',
    needsSecondCapa: true,
    detectedBy: admin.id,
    createdBy: admin.id,
    actor,
  })
  const fetched = (await getNcById(created.id))!
  check('ncFicheNum stored', fetched.ncFicheNum === 9999)
  check('ncMonth stored', fetched.ncMonth === 'Décembre')
  check('detectedAt honoured (not now())', fetched.detectedAt.toISOString().startsWith('2025-03-15'), fetched.detectedAt.toISOString())
  check('dept MI2 accepted', fetched.dept === 'MI2')
  check('correctionProgress stored', fetched.correctionProgress === 0.4)
  check('free-text deadline stored', fetched.correctionDeadlinePlannedText === 'S3 Juin 2025')
  check('clientResponseRef stored', fetched.clientResponseRef === 'REF-42')
  check('riskDesignation stored', fetched.riskDesignation === 'qualité du service')
  check('needsSecondCapa stored', fetched.needsSecondCapa === true)

  console.log('\n4. CAPA accepts a free-text responsible and planning expressions')
  const capa = await createCapa({
    ncId: created.id,
    actionDescription: 'Action corrective de vérification automatique.',
    responsibleName: 'RMI',
    deadlinePlannedText: 'Réunion du groupe',
    progressStatus: '70%',
    createdBy: admin.id,
    actor,
  })
  const withCapa = (await getNcById(created.id))!
  const c = withCapa.capa.find((x) => x.id === capa.id)!
  check('CAPA created without a user account', c.responsibleId === null)
  check('free-text responsible surfaces (not the joined user)', c.responsibleName === 'RMI', `got ${c.responsibleName}`)
  check('CAPA free-text deadline stored', c.deadlinePlannedText === 'Réunion du groupe')
  check('CAPA progress stored', c.progressStatus === '70%')

  console.log('\n5. Field edits reach the database')
  await updateNcFields(created.id, {
    impact: 'Impact révisé',
    correctionProgress: 0.9,
    isOpportunity: true,
    opportunityDesignation: 'A améliorer',
    riskDesignation: null,
  }, actor)
  const edited = (await getNcById(created.id))!
  check('impact updated', edited.impact === 'Impact révisé')
  check('correctionProgress updated', edited.correctionProgress === 0.9)
  check('opportunityDesignation updated', edited.opportunityDesignation === 'A améliorer')
  check('riskDesignation cleared to null', edited.riskDesignation === null)

  console.log('\n6. Closure record survives later edits')
  const firstClosure = new Date('2025-06-01T00:00:00.000Z')
  await updateNcStatus(created.id, 'closed', admin.id, { closedAt: firstClosure, actor })
  const closed = (await getNcById(created.id))!
  check('closedAt set on first closure', closed.closedAt?.toISOString().startsWith('2025-06-01') ?? false)
  const originalCloser = closed.closedById

  // Re-saving an already-closed NC (e.g. editing the root cause) must not
  // re-stamp the closure with today's date and the current editor.
  await updateNcStatus(created.id, 'closed', admin.id, { rootCause: 'Cause révisée', actor })
  const resaved = (await getNcById(created.id))!
  check('closedAt NOT re-stamped on re-save', resaved.closedAt?.toISOString().startsWith('2025-06-01') ?? false,
    `got ${resaved.closedAt?.toISOString()}`)
  check('closedBy preserved on re-save', resaved.closedById === originalCloser)
  check('rootCause still updated', resaved.rootCause === 'Cause révisée')

  // Reopening must clear the closure.
  await updateNcStatus(created.id, 'in_progress', admin.id, { actor })
  const reopened = (await getNcById(created.id))!
  check('reopening clears closedAt', reopened.closedAt === null)
  check('reopening clears closedBy', reopened.closedById === null)

  console.log('\n7. Photos resolve to a URL (were never rendered before)')
  const photoShape = (await getNcById(created.id))!
  check('NcDetail exposes beforePhotoUrl', 'beforePhotoUrl' in photoShape)
  check('NcDetail exposes afterPhotoUrl', 'afterPhotoUrl' in photoShape)
  check('no photo uploaded yet -> null', photoShape.beforePhotoUrl === null)
  const [anyPhoto] = await db
    .select({ id: nonConformances.id })
    .from(nonConformances)
    .where(isNotNull(nonConformances.beforePhotoAssetId))
    .limit(1)
  if (anyPhoto) {
    const withPhoto = (await getNcById(anyPhoto.id))!
    check('an uploaded photo resolves to a URL', !!withPhoto.beforePhotoUrl, 'still null')
  } else {
    console.log('  SKIP  no NC has a photo asset to resolve')
  }

  console.log('\n8. Pagination total honours every filter')
  const allNc = await listNcs({ pageSize: 1 })
  const deptFiltered = await listNcs({ dept: 'RH', pageSize: 1 })
  const [{ rhCount }] = await db
    .select({ rhCount: sql<number>`count(*)` })
    .from(nonConformances)
    .where(and(isNull(nonConformances.deletedAt), eq(nonConformances.dept, 'RH')))
  check('unfiltered total is the whole register', allNc.total >= 47, `got ${allNc.total}`)
  check('dept filter narrows the total', deptFiltered.total === Number(rhCount),
    `total=${deptFiltered.total} actual=${rhCount}`)
  check('filtered total differs from unfiltered', deptFiltered.total < allNc.total)
  const searchFiltered = await listNcs({ search: 'polyvalence', pageSize: 1 })
  check('search filter narrows the total', searchFiltered.total < allNc.total,
    `got ${searchFiltered.total}`)

  console.log('\n9. ISO audit trail is written')
  await updateCapa(capa.id, { progressStatus: '100%', status: 'closed' }, actor)
  const trail = await getNcAuditTrail(created.id)
  const actions = trail.map((t) => `${t.entityType}:${t.action}`)
  check('NC creation journalled', actions.includes('non_conformance:created'), actions.join(', '))
  check('field edit journalled', actions.includes('non_conformance:updated'))
  check('closure journalled as "closed"', actions.includes('non_conformance:closed'))
  check('reopening journalled as "reopened"', actions.includes('non_conformance:reopened'))
  check('CAPA creation journalled', actions.includes('corrective_action:created'))
  check('CAPA closure journalled', actions.includes('corrective_action:closed'))
  // Several "updated" entries exist (the field edit, then a later root-cause
  // edit); pick the one that actually carries the impact change.
  const edit = trail.find((t) =>
    t.entityType === 'non_conformance' &&
    t.action === 'updated' &&
    !!(t.newState as Record<string, unknown> | null)?.impact
  )
  const prev = edit?.previousState as Record<string, unknown> | null
  const next = edit?.newState as Record<string, unknown> | null
  check('trail records the previous value', prev?.impact === null || prev?.impact === undefined
    ? true : String(prev?.impact) !== 'Impact révisé')
  check('trail records the new value', String(next?.impact) === 'Impact révisé', JSON.stringify(next))
  check('trail records who acted', !!edit?.actorName)
  check('trail records the role at the time', !!edit?.actorRole)
  const unchangedBefore = trail.length
  await updateNcFields(created.id, { impact: 'Impact révisé' }, actor)
  const trailAfter = await getNcAuditTrail(created.id)
  check('a no-op re-save adds no entry', trailAfter.length === unchangedBefore,
    `${unchangedBefore} -> ${trailAfter.length}`)

  console.log('\n10. Historical vs new records (ISO 9001 workflow integrity)')

  // A NEW record must still satisfy the full chain before closure.
  const newCheck = await checkNcClosePrerequisites(created.id, admin.id, 'closed')
  check('NEW NC cannot be closed without evidence', newCheck.ok === false, newCheck.reason ?? '')
  check('NEW NC block cites the missing evidence',
    (newCheck.reason ?? '').includes('preuve'), newCheck.reason ?? '')
  check('NEW NC is not flagged historical', newCheck.historical === false)

  // Verify the block is about evidence specifically, not a missing CAPA:
  // the test fiche already has one CAPA attached.
  const testNc = (await getNcById(created.id))!
  check('NEW NC does have a CAPA (so the block is the evidence rule)', testNc.capa.length > 0)

  // The imported records are exempted — without fabricating anything.
  const [histRow] = await db
    .select({ id: nonConformances.id, fiche: nonConformances.ncFicheNum })
    .from(nonConformances)
    .where(and(eq(nonConformances.recordOrigin, 'imported'), eq(nonConformances.status, 'closed')))
    .limit(1)
  const histCheck = await checkNcClosePrerequisites(histRow.id, admin.id, 'closed')
  check('historical NC may be closed without evidence', histCheck.ok === true, histCheck.reason ?? '')
  check('historical exemption is flagged as such', histCheck.historical === true)

  // …but 'verified' is a present-tense claim and still needs a real verification.
  const histVerify = await checkNcClosePrerequisites(histRow.id, admin.id, 'verified')
  check('historical NC still cannot be marked verified without a real verification',
    histVerify.ok === false, histVerify.reason ?? '')
  check('the refusal explains the historical situation',
    (histVerify.reason ?? '').includes('historique'), histVerify.reason ?? '')

  // No evidence or effectiveness was invented anywhere.
  const [{ fabricatedEvidence }] = await db
    .select({ fabricatedEvidence: sql<number>`count(*)` })
    .from(correctiveActions)
    .where(and(
      eq(correctiveActions.recordOrigin, 'imported'),
      sql`(evidence_asset_id is not null or effectiveness_verified = true)`,
    ))
  check('no evidence or effectiveness fabricated on imported CAPAs',
    Number(fabricatedEvidence) === 0, `got ${fabricatedEvidence}`)

  console.log('\n11. The 14 closed historical fiches are intact')
  const [closedAgg] = await db
    .select({
      n: sql<number>`count(*)`,
      withDate: sql<number>`count(closed_at)`,
      withBy: sql<number>`count(closed_by)`,
    })
    .from(nonConformances)
    .where(and(
      eq(nonConformances.recordOrigin, 'imported'),
      eq(nonConformances.status, 'closed'),
      isNull(nonConformances.deletedAt),
    ))
  check('still 14 closed historical fiches', Number(closedAgg.n) === 14, `got ${closedAgg.n}`)
  check('all keep their original closure date', Number(closedAgg.withDate) === 14, `got ${closedAgg.withDate}`)
  check('all keep a recorded closer', Number(closedAgg.withBy) === 14, `got ${closedAgg.withBy}`)

  console.log('\n12. Processus filter over the backfilled historical records')
  const entretien = await listNcs({ process: 'entretien', pageSize: 100 })
  const realisation = await listNcs({ process: 'realisation', pageSize: 100 })
  const etudes = await listNcs({ process: 'etudes', pageSize: 100 })
  check('entretien returns the 13 RE2 fiches', entretien.rows.filter((r) => r.dept === 'RE2').length === 13,
    `got ${entretien.rows.filter((r) => r.dept === 'RE2').length}`)
  check('realisation returns the 4 RE1 fiches', realisation.rows.filter((r) => r.dept === 'RE1').length === 4,
    `got ${realisation.rows.filter((r) => r.dept === 'RE1').length}`)
  check('etudes returns the 4 ET fiches', etudes.rows.filter((r) => r.dept === 'ET').length === 4,
    `got ${etudes.rows.filter((r) => r.dept === 'ET').length}`)
  check('the filter total matches the rows', entretien.total >= 13, `got ${entretien.total}`)

  console.log('\n13. Ambiguous departments were left NULL, not guessed')
  const unmapped = await db
    .select({ dept: nonConformances.dept, n: sql<number>`count(*)` })
    .from(nonConformances)
    .where(and(
      eq(nonConformances.recordOrigin, 'imported'),
      isNull(nonConformances.processAffected),
    ))
    .groupBy(nonConformances.dept)
  const unmappedDepts = unmapped.map((u) => u.dept).sort()
  check('exactly the support/management processes are unmapped',
    JSON.stringify(unmappedDepts) === JSON.stringify(['AC', 'CO', 'MI1', 'RH']),
    JSON.stringify(unmappedDepts))
  const totalUnmapped = unmapped.reduce((a, u) => a + Number(u.n), 0)
  check('26 fiches await manual classification', totalUnmapped === 26, `got ${totalUnmapped}`)
  const [{ mappedWrong }] = await db
    .select({ mappedWrong: sql<number>`count(*)` })
    .from(nonConformances)
    .where(and(
      eq(nonConformances.recordOrigin, 'imported'),
      sql`dept::text in ('AC','CO','MI1','MI2','RH')`,
      sql`process_affected is not null`,
    ))
  check('no support-process fiche received a guessed phase', Number(mappedWrong) === 0, `got ${mappedWrong}`)

  console.log('\n14. recordOrigin is not reachable through the data-layer update path')
  await updateNcFields(created.id, { impact: 'Contrôle origine' } as Parameters<typeof updateNcFields>[1])
  const stillPlatform = (await getNcById(created.id))!
  check('a new NC stays recordOrigin=platform', stillPlatform.recordOrigin === 'platform',
    stillPlatform.recordOrigin)

  console.log('\n15. Closure rule cannot be bypassed through any exposed path')
  // The gate lives in the PATCH route. The only other writer of `status` is
  // updateNcStatus, whose sole production caller is that same gated route.
  // updateNcFields must therefore be unable to move an NC to a closed state.
  const [preBypass] = await db.select({ status: nonConformances.status })
    .from(nonConformances).where(eq(nonConformances.id, created.id))
  await updateNcFields(created.id, {
    status: 'closed', closedAt: new Date(), closedBy: admin.id, impact: 'Sonde de contournement',
  } as unknown as Parameters<typeof updateNcFields>[1])
  const [postBypass] = await db.select({
    status: nonConformances.status, closedAt: nonConformances.closedAt,
  }).from(nonConformances).where(eq(nonConformances.id, created.id))
  check('updateNcFields cannot set status', postBypass.status === preBypass.status,
    `${preBypass.status} -> ${postBypass.status}`)
  check('updateNcFields cannot stamp a closure date', postBypass.closedAt === null,
    String(postBypass.closedAt))
  const [bypassCheck] = await db.select({ impact: nonConformances.impact })
    .from(nonConformances).where(eq(nonConformances.id, created.id))
  check('the legitimate field in the same call still applied',
    bypassCheck.impact === 'Sonde de contournement', bypassCheck.impact ?? '')

  // And the gate itself still refuses this NC.
  const stillBlocked = await checkNcClosePrerequisites(created.id, admin.id, 'closed')
  check('the closure gate still refuses it', stillBlocked.ok === false, stillBlocked.reason ?? '')

  // ── Cleanup ────────────────────────────────────────────────────────────────
  const codes = [created.dmsDocumentCode, capa.dmsDocumentCode].filter(Boolean) as string[]
  const capaIds = (await db.select({ id: correctiveActions.id }).from(correctiveActions)
    .where(eq(correctiveActions.ncId, created.id))).map((c) => c.id)
  for (const cid of capaIds) {
    await db.delete(recordAuditLog).where(eq(recordAuditLog.entityId, cid))
  }
  await db.delete(recordAuditLog).where(eq(recordAuditLog.entityId, created.id))
  await db.delete(correctiveActions).where(eq(correctiveActions.ncId, created.id))
  await db.delete(nonConformances).where(eq(nonConformances.id, created.id))
  for (const code of codes) {
    const docRows = await db.select({ id: documents.id }).from(documents).where(eq(documents.code, code))
    for (const d of docRows) await db.delete(dmsDocumentLinks).where(eq(dmsDocumentLinks.documentId, d.id))
    await db.delete(documents).where(eq(documents.code, code))
  }
  console.log('\n  (test fiche and its DMS entries removed)')

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
