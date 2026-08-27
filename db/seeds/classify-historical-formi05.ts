/**
 * Classifies the 2025 FOR-MI-05 register rows as historical/imported records and
 * backfills `process_affected` where the department maps unambiguously.
 *
 * Why this exists
 * ---------------
 * The 47 rows migrated from the Excel register predate the platform's ISO 9001
 * workflow, so they carry no evidence asset and no effectiveness verification.
 * Marking them `recordOrigin = 'imported'` lets the application represent them
 * faithfully instead of fabricating the missing documentation, while the full
 * workflow stays mandatory for every new non-conformity.
 *
 * Nothing is deleted, and no status is changed — in particular the 14 fiches
 * closed in the source register keep their status, closedAt and closedBy.
 *
 * Department -> ISO process mapping
 * ---------------------------------
 * `process_affected` is the project-lifecycle phase enum (etudes | realisation |
 * entretien), which only covers the three operational processes. The support and
 * management processes (AC, CO, MI1, MI2, RH) have no phase equivalent, so they
 * are deliberately left NULL rather than guessed.
 *
 *   ET   -> etudes        Processus Études
 *   RE1  -> realisation   PRS-RE-01 « Processus Réalisation »
 *   RE2  -> entretien     PRS-RE-02 « Processus Entretien »
 *   AC   -> NULL          Achats — support process, no project phase
 *   CO   -> NULL          Commercial — support process, no project phase
 *   MI1  -> NULL          Management Intégré — management process, no project phase
 *   MI2  -> NULL          Management Intégré — management process, no project phase
 *   RH   -> NULL          Ressources Humaines — support process, no project phase
 *
 * Run:     npx tsx --env-file=.env db/seeds/classify-historical-formi05.ts [--dry]
 * Revert:  npx tsx --env-file=.env db/seeds/classify-historical-formi05.ts --revert
 */
import { db } from '../index'
import { nonConformances, correctiveActions, users, recordAuditLog } from '../schema'
import { eq, and, inArray, like, isNull, sql } from 'drizzle-orm'
import { recordAudit, type AuditActor } from '../../src/lib/audit-record'

const DRY = process.argv.includes('--dry')
const REVERT = process.argv.includes('--revert')

/** The source workbook these rows came from. */
const SOURCE = 'FOR MI 05 Registre de suivi des NC PNC et réclamations 2025.xlsx'

/** Unambiguous reference prefix of the imported register rows. */
const REFERENCE_PREFIX = 'FOR-MI-05/2025/%'

type Phase = 'etudes' | 'realisation' | 'entretien'

/** Only departments with a verified project-phase equivalent appear here. */
const DEPT_TO_PHASE: Record<string, Phase> = {
  ET:  'etudes',
  RE1: 'realisation',
  RE2: 'entretien',
}

/** Departments deliberately left unmapped, with the reason recorded. */
const UNMAPPED_REASON: Record<string, string> = {
  AC:  'Processus support Achats — aucun équivalent dans le référentiel de phases projet',
  CO:  'Processus support Commercial — aucun équivalent dans le référentiel de phases projet',
  MI1: 'Processus de management intégré — aucun équivalent dans le référentiel de phases projet',
  MI2: 'Processus de management intégré — aucun équivalent dans le référentiel de phases projet',
  RH:  'Processus support Ressources Humaines — aucun équivalent dans le référentiel de phases projet',
}

async function main() {
  const [adminRow] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.email, 'admin@sopat.tn'))
    .limit(1)
  const [fallback] = adminRow
    ? [adminRow]
    : await db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).limit(1)
  const actor: AuditActor = {
    userId: fallback.id, name: fallback.name, email: fallback.email, role: fallback.role,
  }

  const rows = await db
    .select({
      id: nonConformances.id,
      reference: nonConformances.reference,
      ficheNum: nonConformances.ncFicheNum,
      dept: nonConformances.dept,
      status: nonConformances.status,
      closedAt: nonConformances.closedAt,
      processAffected: nonConformances.processAffected,
      recordOrigin: nonConformances.recordOrigin,
    })
    .from(nonConformances)
    .where(and(like(nonConformances.reference, REFERENCE_PREFIX), isNull(nonConformances.deletedAt)))

  console.log(`Matched ${rows.length} register rows (${REFERENCE_PREFIX})\n`)
  if (rows.length === 0) { console.log('Nothing to do.'); process.exit(0) }

  const ids = rows.map((r) => r.id)

  // ── Revert ────────────────────────────────────────────────────────────────
  if (REVERT) {
    // Only clears what this script sets, and only on rows it classified.
    const target = rows.filter((r) => r.recordOrigin === 'imported')
    if (!DRY) {
      const targetIds = target.map((r) => r.id)
      if (targetIds.length) {
        await db.update(nonConformances)
          .set({ recordOrigin: 'platform', importedFrom: null, importedAt: null })
          .where(inArray(nonConformances.id, targetIds))
        await db.update(nonConformances)
          .set({ processAffected: null })
          .where(and(
            inArray(nonConformances.id, targetIds),
            inArray(nonConformances.dept, ['ET', 'RE1', 'RE2']),
          ))
        await db.update(correctiveActions)
          .set({ recordOrigin: 'platform', importedFrom: null, importedAt: null })
          .where(inArray(correctiveActions.ncId, targetIds))
        await db.delete(recordAuditLog).where(and(
          inArray(recordAuditLog.entityId, targetIds),
          inArray(recordAuditLog.action, ['imported', 'reclassified']),
        ))
      }
    }
    console.log(`${DRY ? '[dry run] would revert' : 'Reverted'} ${target.length} rows to recordOrigin='platform' and cleared the backfilled phases.`)
    process.exit(0)
  }

  // ── Classify + backfill ───────────────────────────────────────────────────
  const now = new Date()
  const byDept = new Map<string, number>()
  let mapped = 0, unmapped = 0

  for (const r of rows) {
    const dept = r.dept ?? '(aucun)'
    byDept.set(dept, (byDept.get(dept) ?? 0) + 1)
    const phase = r.dept ? DEPT_TO_PHASE[r.dept] : undefined
    if (phase) mapped++; else unmapped++

    if (DRY) continue

    await db.update(nonConformances)
      .set({
        recordOrigin: 'imported',
        importedFrom: SOURCE,
        importedAt: now,
        // Never overwrite a phase somebody already set by hand.
        ...(phase && r.processAffected === null ? { processAffected: phase } : {}),
      })
      .where(eq(nonConformances.id, r.id))

    // Provenance entry: states plainly why the evidence/effectiveness fields are
    // empty, so an auditor reading the trail is not left to infer it.
    await recordAudit(db, {
      entityType: 'non_conformance',
      entityId: r.id,
      action: 'imported',
      actor,
      newState: {
        recordOrigin: 'imported',
        importedFrom: SOURCE,
        ...(phase && r.processAffected === null ? { processAffected: phase } : {}),
      },
      metadata: {
        note:
          "Fiche reprise du registre Excel FOR-MI-05 2025. Le système d'origine ne " +
          "collectait ni preuve d'action corrective ni vérification d'efficacité : ces " +
          'champs sont donc vides par construction et non par omission. Aucune preuve ni ' +
          "vérification n'a été fabriquée lors de la reprise.",
        ficheNum: r.ficheNum,
        statusPreserved: r.status,
        closedAtPreserved: r.closedAt?.toISOString() ?? null,
        processMapping: phase
          ? `${r.dept} → ${phase}`
          : `${r.dept} → non mappé : ${r.dept ? UNMAPPED_REASON[r.dept] ?? 'département inconnu' : 'département absent'}`,
      },
    })
  }

  if (!DRY) {
    await db.update(correctiveActions)
      .set({ recordOrigin: 'imported', importedFrom: SOURCE, importedAt: now })
      .where(inArray(correctiveActions.ncId, ids))
  }

  // ── Report ────────────────────────────────────────────────────────────────
  console.log('Department → process mapping')
  for (const [dept, n] of [...byDept.entries()].sort()) {
    const phase = DEPT_TO_PHASE[dept]
    console.log(
      `  ${dept.padEnd(4)} ${String(n).padStart(2)} fiches  →  ` +
      (phase ? phase : `NULL  (${UNMAPPED_REASON[dept] ?? 'département non reconnu'})`)
    )
  }
  console.log(`\n${DRY ? '[dry run] ' : ''}${rows.length} fiches classified as imported`)
  console.log(`  ${mapped} with a backfilled process, ${unmapped} left NULL for manual classification`)

  if (!DRY) {
    const [{ closedIntact }] = await db
      .select({ closedIntact: sql<number>`count(*)` })
      .from(nonConformances)
      .where(and(
        inArray(nonConformances.id, ids),
        eq(nonConformances.status, 'closed'),
        sql`closed_at is not null`,
      ))
    console.log(`  ${closedIntact} closed fiches still carry their original closure date`)
  }

  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
