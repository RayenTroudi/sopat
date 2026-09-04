/**
 * Applies migration 0043 — FOR-MI-02 : rapport de veille annuel, grille des 13
 * colonnes du formulaire, numéro de révision et auteur de la modification.
 *
 *   npx tsx --env-file=.env db/seeds/apply-migration-043-regwatch-report-grid.ts
 *
 * Purement additif et rejouable. Dépend de 0020 : l'enum `document_review_status`
 * y est créé avec FOR-MI-01, et le rapport de veille le réutilise.
 */
import { db } from '../index'
import { sql } from 'drizzle-orm'
import { readFileSync } from 'fs'
import { join } from 'path'
import { splitSqlStatements } from './lib/split-sql'

async function main() {
  const file = join(__dirname, '..', 'migrations', '0043_regwatch_report_grid.sql')

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
    SELECT (SELECT count(*) FROM regulatory_watch_reports)                          AS reports,
           (SELECT count(*) FROM regulatory_watch)                                  AS entries,
           (SELECT count(*) FROM information_schema.columns
             WHERE table_name = 'regulatory_watch'
               AND column_name IN ('report_id','watch_date','watch_type','axis','content',
                                   'version','consultation_source','results','application_level',
                                   'conformity_assessment','associated_risk','process_code',
                                   'comments','sort_order','updated_by'))           AS new_columns
  `)
  console.log('\nRésumé :', summary.rows[0])
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
