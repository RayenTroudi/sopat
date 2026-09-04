/**
 * Applies migration 0044 — FOR-MI-04 : PV de réunion, structure relationnelle
 * (participants, ordre du jour, plan d'action) et contrôle des révisions.
 *
 *   npx tsx --env-file=.env db/seeds/apply-migration-044-meeting-minutes-structure.ts
 *
 * Purement additif et rejouable. Dépend de 0020 : l'enum `document_review_status`
 * y est créé avec FOR-MI-01, et le PV le réutilise.
 */
import { db } from '../index'
import { sql } from 'drizzle-orm'
import { readFileSync } from 'fs'
import { join } from 'path'
import { splitSqlStatements } from './lib/split-sql'

async function main() {
  const file = join(__dirname, '..', 'migrations', '0044_meeting_minutes_structure.sql')

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
    SELECT (SELECT count(*) FROM meeting_minutes WHERE deleted_at IS NULL)      AS pv,
           (SELECT count(*) FROM meeting_participants)                          AS participants,
           (SELECT count(*) FROM meeting_agenda_items)                          AS ordre_du_jour,
           (SELECT count(*) FROM meeting_action_items)                          AS actions,
           (SELECT count(*) FROM information_schema.columns
             WHERE table_name = 'meeting_minutes'
               AND column_name IN ('project_id','status','revision_number','completed_at',
                                   'completed_by','updated_by','recommendations',
                                   'next_meeting_time'))                        AS pv_new_columns,
           (SELECT count(*) FROM information_schema.columns
             WHERE table_name = 'meeting_action_items'
               AND column_name IN ('actual_date','follow_up','comments','sort_order',
                                   'deleted_at','updated_by'))                  AS action_new_columns
  `)
  console.log('\nRésumé :', summary.rows[0])
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
