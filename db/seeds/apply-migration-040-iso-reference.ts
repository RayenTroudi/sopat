/**
 * Applies migration 0040 — the ISO 9001:2015 clause register and the SOPAT
 * process cartography, with the reusable FOR-MI-14 audit criteria.
 *
 *   npx tsx --env-file=.env db/seeds/apply-migration-040-iso-reference.ts
 *
 * Safe to re-run: every statement is IF NOT EXISTS or ON CONFLICT DO NOTHING,
 * and the backfill only inserts rows that are missing. Running it twice changes
 * nothing.
 *
 * Statements are split by ./lib/split-sql, which tracks dollar-quoted bodies:
 * this migration contains a `DO $$ … $$;` block (the ADD CONSTRAINT guard, since
 * PostgreSQL has no ADD CONSTRAINT IF NOT EXISTS), and the naive end-of-line
 * semicolon split used by the earlier runners would cut it in half.
 */
import { db } from '../index'
import { sql } from 'drizzle-orm'
import { readFileSync } from 'fs'
import { join } from 'path'
import { splitSqlStatements } from './lib/split-sql'

async function main() {
  const file = join(__dirname, '..', 'migrations', '0040_iso_clause_process_reference.sql')
  const raw = readFileSync(file, 'utf8')
  const statements = splitSqlStatements(raw)

  for (const stmt of statements) {
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
    SELECT (SELECT count(*) FROM iso_clauses)                 AS clauses,
           (SELECT count(*) FROM qms_processes)               AS processes,
           (SELECT count(*) FROM qms_process_steps)           AS steps,
           (SELECT count(*) FROM qms_process_clauses)         AS process_clauses,
           (SELECT count(*) FROM qms_process_step_clauses)    AS step_clauses,
           (SELECT count(*) FROM audit_program_clauses)       AS programme_clauses,
           (SELECT count(*) FROM audit_program_item_clauses)  AS finding_clauses,
           (SELECT count(*) FROM audit_program_items
              WHERE process_step_id IS NOT NULL)              AS findings_linked_to_criteria
  `)
  console.log('\nMigration 0040 applied.')
  console.table(summary.rows)

  // Findings whose wording matched no template step keep their text and are
  // simply not linked. Reported rather than guessed at.
  const unlinked = await db.execute(sql`
    SELECT ap.reference, i.agenda_step
    FROM audit_program_items i
    JOIN audit_programs ap ON ap.id = i.audit_program_id
    WHERE i.process_step_id IS NULL
    ORDER BY ap.reference, i.sort_order
  `)
  if (unlinked.rows.length > 0) {
    console.log(
      `\n${unlinked.rows.length} constat(s) sans critère réutilisable associé — ` +
      `libellé hérité de l'ancienne interface, à rattacher à la main si souhaité :`
    )
    console.table(unlinked.rows)
  }

  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
