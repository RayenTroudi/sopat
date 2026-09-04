/**
 * Applies migration 0041 — clause applicability, criterion provenance, and
 * resolution of the legacy findings that 0040 could not attach to a criterion.
 *
 *   npx tsx --env-file=.env db/seeds/apply-migration-041-clause-scope.ts
 *
 * Safe to re-run. Requires 0040 to have been applied first.
 */
import { db } from '../index'
import { sql } from 'drizzle-orm'
import { readFileSync } from 'fs'
import { join } from 'path'
import { splitSqlStatements } from './lib/split-sql'

async function main() {
  const file = join(__dirname, '..', 'migrations', '0041_clause_scope_and_legacy_criteria.sql')

  for (const stmt of splitSqlStatements(readFileSync(file, 'utf8'))) {
    try {
      await db.execute(sql.raw(stmt))
      console.log(`OK: ${stmt.slice(0, 70).replace(/\s+/g, ' ')}...`)
    } catch (e: unknown) {
      const err = e as Error & { cause?: Error }
      const msg = `${err?.message ?? ''} ${err?.cause?.message ?? ''}`
      if (/already exists/i.test(msg)) {
        console.log(`Skipped (exists): ${stmt.slice(0, 60).replace(/\s+/g, ' ')}...`)
      } else {
        throw e
      }
    }
  }

  const summary = await db.execute(sql`
    SELECT (SELECT count(*) FROM qms_clause_decisions)                              AS clause_decisions,
           (SELECT count(*) FROM qms_process_steps WHERE criterion_type = 'process') AS process_criteria,
           (SELECT count(*) FROM qms_process_clauses WHERE coverage_mode = 'process') AS process_wide_clauses,
           (SELECT count(*) FROM qms_process_step_aliases)                          AS legacy_aliases,
           (SELECT count(*) FROM audit_program_items WHERE process_step_id IS NOT NULL) AS findings_with_criterion,
           (SELECT count(*) FROM audit_program_item_clauses)                        AS finding_clauses
  `)
  console.log('\nMigration 0041 applied.')
  console.table(summary.rows)

  // A finding is only genuinely unresolved when its label matches neither a
  // workbook step nor a recorded legacy alias.
  const unresolved = await db.execute(sql`
    SELECT ap.reference, i.agenda_step
    FROM audit_program_items i
    JOIN audit_programs ap ON ap.id = i.audit_program_id
    WHERE i.process_step_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM qms_process_step_aliases a
        WHERE a.process_code = ap.dept AND a.alias_label = i.agenda_step)
    ORDER BY ap.reference, i.sort_order
  `)
  if (unresolved.rows.length === 0) {
    console.log('\nAucun constat orphelin : tous sont rattachés à un critère ou à un libellé hérité connu.')
  } else {
    console.log(`\n${unresolved.rows.length} constat(s) réellement non identifié(s) :`)
    console.table(unresolved.rows)
  }

  // Findings whose legacy label stood for two workbook steps: not orphans, but
  // they carry no single criterion and that is worth stating plainly.
  const merged = await db.execute(sql`
    SELECT ap.reference, i.agenda_step,
           (SELECT count(*) FROM qms_process_step_aliases a
             WHERE a.process_code = ap.dept AND a.alias_label = i.agenda_step) AS criteria
    FROM audit_program_items i
    JOIN audit_programs ap ON ap.id = i.audit_program_id
    WHERE i.process_step_id IS NULL
    ORDER BY ap.reference, i.sort_order
  `)
  if (merged.rows.length > 0) {
    console.log('\nConstats dont le libellé hérité recouvrait plusieurs critères du classeur :')
    console.table(merged.rows)
  }

  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
