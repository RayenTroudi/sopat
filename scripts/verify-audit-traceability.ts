/**
 * Chaîne de traçabilité complète d'un audit interne, exécutée pour de vrai.
 *
 * Déroule un audit du processus Entretien de bout en bout — planification depuis
 * la cartographie, exécution avec preuve objective, constat non conforme,
 * ouverture d'une NC, action corrective, vérification d'efficacité, clôture — puis
 * relit la chaîne dans les deux sens DEPUIS LA BASE, pas depuis les objets
 * retournés par les fonctions.
 *
 *   clause ISO → processus → critère → programme → constat → preuve
 *              → non-conformité → action corrective → vérification → clôture
 *
 * Contient aussi les tests de non-régression des deux pertes de données
 * corrigées précédemment : un enregistrement ne doit jamais détacher une NC ni
 * effacer une preuve.
 *
 * ÉCRIT en base et consomme des numéros de référence : exige une branche de test.
 *
 *   TEST_DATABASE_URL="postgres://…branche…" npx tsx --env-file=.env scripts/verify-audit-traceability.ts
 */
import { selectTestTarget } from './lib/test-target'

const target = selectTestTarget(true)
console.log(`Cible : ${target.label}\n`)

import { db } from '../db/index'
import {
  users, auditPrograms, auditProgramItems, auditProgramItemClauses,
  cloudinaryAssets,
} from '../db/schema'
import { and, eq, sql } from 'drizzle-orm'
import {
  createAuditProgram, getAuditProgramById, upsertAuditProgramItems,
  createNcFromAuditFinding, getNcOriginFinding, createCapa, updateCapa,
  checkNcClosePrerequisites, updateNcStatus, getNcById,
} from '../src/lib/db/iso'
import { getAnnualCoverage, getAuditClauseCoverage } from '../src/lib/db/iso-reference'

let passed = 0
let failed = 0
const check = (label: string, ok: boolean, detail = '') => {
  if (ok) { passed++; console.log(`  ok    ${label}`) }
  else { failed++; console.log(`  ÉCHEC ${label}${detail ? ` — ${detail}` : ''}`) }
}
const section = (t: string) => console.log(`\n${t}`)

const YEAR = new Date().getFullYear() + 1  // année de test, hors programme réel

async function main() {
  const [auditor] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(and(eq(users.isInternalAuditor, true), eq(users.isActive, true)))
    .limit(1)
  if (!auditor) {
    console.error('Aucun auditeur interne qualifié en base (LIS-MI-05) — impossible de dérouler le scénario.')
    process.exit(1)
  }
  const actor = { userId: auditor.id, name: auditor.name, email: auditor.email, role: auditor.role }

  // ── 1. Planification depuis la cartographie ───────────────────────────────
  section('1. Planification de l\'audit Entretien depuis la cartographie')
  const program = await createAuditProgram({
    dept: 'RE2',
    title: `Audit interne Entretien ${YEAR} (scénario de vérification)`,
    auditorName: auditor.name, auditorId: auditor.id,
    auditeeResponsible: 'Pilote processus Entretien',
    scheduledDate: new Date(`${YEAR}-05-29T13:00:00Z`),
    scope: "Travaux d'entretien des espaces verts — tous sites",
    objectives: "Vérifier la conformité et l'efficacité du processus Entretien",
    seedFromTemplate: true,
    createdBy: auditor.id,
  })
  const planned = await getAuditProgramById(program.id)
  check('le programme reprend les 10 étapes du classeur RE2', planned!.items.length === 10,
    String(planned!.items.length))
  check('le référentiel ISO du processus est appliqué', planned!.clauseCodes.length === 11,
    planned!.clauseCodes.join('; '))
  check('les documents de référence viennent de la cartographie',
    (planned!.referenceDocuments ?? '').includes('PRS-RE-02'))

  const target_ = planned!.items.find((i) => i.agendaStep.startsWith('Réalisation (Travaux'))!
  check('le critère audité porte ses clauses ISO', target_.clauseCodes.length > 0,
    target_.clauseCodes.join(', '))
  check('le critère référence son étape réutilisable', target_.processStepId !== null)

  // ── 2. Exécution avec preuve objective ────────────────────────────────────
  section('2. Exécution — conformité, observations, preuve objective')
  await upsertAuditProgramItems(program.id, planned!.items.map((i) => ({
    id: i.id, agendaStep: i.agendaStep, clauseCodes: i.clauseCodes, processStepId: i.processStepId,
    conformity: i.id === target_.id ? 'NC' : 'C',
    response: i.id === target_.id
      ? "Passages d'arrosage automatique non consignés sur trois chantiers en avril."
      : 'Dispositions vérifiées, aucun écart.',
    evidence: i.id === target_.id
      ? 'FOR-RE-08 avril — Villa Somrani, Résidence El Manar, Hôtel Sousse'
      : 'Enregistrements consultés en séance',
    sortOrder: i.sortOrder,
  })), auditor.id)

  const executed = await getAuditProgramById(program.id)
  const finding = executed!.items.find((i) => i.id === target_.id)!
  check('le constat est enregistré non conforme', finding.conformity === 'NC')
  check('la preuve objective est enregistrée', (finding.evidence ?? '').includes('FOR-RE-08'))
  check('les liens de clause survivent à l\'enregistrement',
    finding.clauseCodes.length === target_.clauseCodes.length)

  // ── 3. NC → action corrective → vérification → clôture ────────────────────
  section('3. Non-conformité, action corrective, vérification, clôture')
  const ncRes = await createNcFromAuditFinding({
    itemId: finding.id, ncType: 'systeme',
    detectedBy: auditor.id, createdBy: auditor.id, actor,
  })
  check('une non-conformité s\'ouvre depuis le constat', ncRes.ok, JSON.stringify(ncRes))
  if (!ncRes.ok) { console.error('arrêt : NC non créée'); process.exit(1) }
  const ncId = ncRes.ncId

  const capa = await createCapa({
    ncId,
    actionDescription: "Consigner chaque passage d'arrosage sur FOR-RE-08 ; contrôle hebdomadaire.",
    responsibleName: 'Pilote processus Entretien',
    deadlinePlanned: new Date(`${YEAR}-07-31T00:00:00Z`),
    createdBy: auditor.id, actor,
  })
  check('une action corrective est rattachée à la NC', !!capa.id)

  // La règle de clôture est antérieure à ce travail et doit continuer de mordre.
  const refused = await checkNcClosePrerequisites(ncId, auditor.id, 'closed')
  check('la clôture est refusée tant que la preuve d\'action manque', refused.ok === false,
    refused.reason ?? '')

  const [asset] = await db.insert(cloudinaryAssets).values({
    publicId:  `sopat/capa/verif-${Date.now()}`,
    url:       'http://res.cloudinary.com/sopat/preuve.pdf',
    secureUrl: 'https://res.cloudinary.com/sopat/preuve.pdf',
    assetType: 'reception_document', format: 'pdf', bytes: 1024,
    uploadedBy: auditor.id, createdBy: auditor.id,
  }).returning()

  await updateCapa(capa.id, {
    evidenceAssetId: asset.id, status: 'closed',
    effectivenessVerified: true, verifiedBy: auditor.id,
    evalDateActual: new Date(), closedAt: new Date(),
    progressStatus: 'Vérifiée efficace — chantiers recontrôlés',
  }, actor)

  const allowed = await checkNcClosePrerequisites(ncId, auditor.id, 'closed')
  check('la clôture est permise une fois preuve et vérification enregistrées',
    allowed.ok === true, allowed.reason ?? '')
  await updateNcStatus(ncId, 'closed', auditor.id, { actor })
  const nc = await getNcById(ncId)
  check('la non-conformité est clôturée', nc?.status === 'closed', String(nc?.status))
  check('la vérification d\'efficacité est persistée',
    nc!.capa.some((c) => c.effectivenessVerified && c.verifiedAt !== null))

  // ── 4. Chaîne relue depuis la base, dans les deux sens ────────────────────
  section('4. Traçabilité relue en base, aller et retour')
  const forward = await db.execute(sql`
    SELECT c.code AS clause, p.name AS processus, s.label AS critere, ap.reference AS programme,
           i.agenda_step AS constat, i.conformity, i.evidence AS preuve,
           nc.reference AS nc, ca.effectiveness_verified AS verifiee, ca.closed_at
    FROM iso_clauses c
    JOIN audit_program_item_clauses apic ON apic.clause_code = c.code
    JOIN audit_program_items i           ON i.id = apic.item_id
    JOIN audit_programs ap               ON ap.id = i.audit_program_id
    JOIN qms_processes p                 ON p.code = ap.dept
    JOIN qms_process_steps s             ON s.id = i.process_step_id
    JOIN non_conformances nc             ON nc.id = i.nc_id
    JOIN corrective_actions ca           ON ca.nc_id = nc.id
    WHERE ap.id = ${program.id} AND i.id = ${finding.id}
    ORDER BY c.sort_key`)
  check('aller : chaque clause du constat atteint l\'action corrective clôturée',
    forward.rows.length === finding.clauseCodes.length, String(forward.rows.length))
  const f = forward.rows[0] as Record<string, unknown> | undefined
  check('chaque maillon de l\'aller est une ligne réelle',
    !!f?.processus && !!f?.critere && !!f?.programme && !!f?.preuve && !!f?.nc && f?.verifiee === true,
    JSON.stringify(f))

  const backward = await db.execute(sql`
    SELECT ca.id AS capa, nc.reference AS nc, i.agenda_step AS constat, s.label AS critere,
           string_agg(apic.clause_code, ', ' ORDER BY apic.clause_code) AS clauses,
           ap.reference AS programme, p.name AS processus
    FROM corrective_actions ca
    JOIN non_conformances nc             ON nc.id = ca.nc_id
    JOIN audit_program_items i           ON i.nc_id = nc.id
    JOIN qms_process_steps s             ON s.id = i.process_step_id
    JOIN audit_program_item_clauses apic ON apic.item_id = i.id
    JOIN audit_programs ap               ON ap.id = i.audit_program_id
    JOIN qms_processes p                 ON p.code = ap.dept
    WHERE ca.id = ${capa.id}
    GROUP BY ca.id, nc.reference, i.agenda_step, s.label, ap.reference, p.name`)
  check('retour : l\'action corrective remonte jusqu\'à ses clauses ISO', backward.rows.length === 1,
    JSON.stringify(backward.rows[0] ?? null))
  const b = backward.rows[0] as Record<string, string> | undefined
  check('le retour nomme le processus et le critère',
    b?.processus === 'Processus Entretien' && !!b?.critere, JSON.stringify(b))

  const origin = await getNcOriginFinding(ncId)
  check('getNcOriginFinding ramène la NC à son constat d\'audit',
    origin?.programId === program.id && origin.agendaStep === finding.agendaStep)

  // ── 5. Couverture, à l'échelle de l'audit et de l'année ───────────────────
  section('5. Couverture de cet audit et du programme annuel')
  const auditCov = await getAuditClauseCoverage(program.id)
  check('l\'audit expose son propre périmètre de clauses', auditCov.length === 11, String(auditCov.length))
  check('une clause du périmètre porte le constat qui l\'a évaluée',
    auditCov.some((c) => c.conformityIssues === 1))
  check('une clause auditée à l\'échelle du processus n\'a pas de critère propre',
    auditCov.some((c) => c.criteria.length === 0))

  const annual = await getAnnualCoverage(YEAR)
  check('les états de couverture forment une partition',
    annual.totals.executed + annual.totals.planned + annual.totals.notPlanned +
    annual.totals.unassigned === annual.totals.auditable)
  check('un seul processus planifié laisse les autres clauses « à planifier »',
    annual.totals.notPlanned > 0 && annual.totals.processesPlanned >= 1)

  // ── 6. Non-régression : aucune perte silencieuse ──────────────────────────
  section('6. Non-régression — aucune perte de données silencieuse')
  const before = await getAuditProgramById(program.id)
  const ref = before!.items.find((i) => i.id === finding.id)!

  for (let n = 1; n <= 3; n++) {
    const cur = await getAuditProgramById(program.id)
    await upsertAuditProgramItems(program.id, cur!.items.map((i) => ({
      id: i.id, agendaStep: i.agendaStep, clauseCodes: i.clauseCodes, processStepId: i.processStepId,
      response: i.response ?? undefined, conformity: i.conformity ?? undefined,
      evidence: i.evidence ?? undefined, sortOrder: i.sortOrder,
    })), auditor.id)
    const after = await getAuditProgramById(program.id)
    const t = after!.items.find((i) => i.id === finding.id)
    check(`enregistrement ${n} : la NC reste rattachée`, t?.ncId === ncId)
    check(`enregistrement ${n} : l'identifiant de ligne est stable`, t?.id === finding.id)
    check(`enregistrement ${n} : le critère reste rattaché`, t?.processStepId === ref.processStepId)
  }

  // Charge utile ne portant que l'agenda — celle du formulaire de création et
  // d'un réordonnancement. Elle ne doit rien effacer.
  const cur2 = await getAuditProgramById(program.id)
  await upsertAuditProgramItems(program.id,
    cur2!.items.map((i, idx) => ({ id: i.id, agendaStep: i.agendaStep, sortOrder: idx })), auditor.id)
  const partial = await getAuditProgramById(program.id)
  const tp = partial!.items.find((i) => i.id === finding.id)!
  check('enregistrement partiel : la preuve est conservée', tp.evidence === ref.evidence)
  check('enregistrement partiel : la conformité est conservée', tp.conformity === ref.conformity)
  check('enregistrement partiel : les observations sont conservées', tp.response === ref.response)
  check('enregistrement partiel : la NC reste rattachée', tp.ncId === ncId)
  check('enregistrement partiel : les clauses restent rattachées',
    tp.clauseCodes.length === ref.clauseCodes.length)
  check('enregistrement partiel : le critère reste rattaché', tp.processStepId === ref.processStepId)

  // Un constat porteur d'une NC ne se supprime pas depuis le formulaire.
  const cur3 = await getAuditProgramById(program.id)
  const res3 = await upsertAuditProgramItems(program.id,
    cur3!.items.filter((i) => i.id !== finding.id)
      .map((i, idx) => ({ id: i.id, agendaStep: i.agendaStep, sortOrder: idx })), auditor.id)
  check('un constat porteur d\'une NC est conservé et signalé', res3.retainedWithNc.length === 1)
  const after3 = await getAuditProgramById(program.id)
  check('il figure toujours au dossier avec sa NC',
    after3!.items.some((i) => i.id === finding.id && i.ncId === ncId))
  const links = await db.select().from(auditProgramItemClauses)
    .where(eq(auditProgramItemClauses.itemId, finding.id))
  check('ses liens de clause survivent aussi', links.length === ref.clauseCodes.length)

  // ── 7. Nettoyage ──────────────────────────────────────────────────────────
  // Le programme de test reste en base : une référence émise est immuable et
  // la NC qu'il porte est un enregistrement qualité. Il est marqué annulé, ce
  // qui l'exclut de tout calcul de couverture.
  await db.update(auditPrograms).set({ status: 'annule', notes: 'Scénario de vérification automatisé.' })
    .where(eq(auditPrograms.id, program.id))
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(auditProgramItems)
    .where(eq(auditProgramItems.auditProgramId, program.id))
  check('le programme de test est neutralisé sans rien détruire', Number(n) === 10, String(n))

  console.log(`\n${passed} ok, ${failed} échec(s)`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
