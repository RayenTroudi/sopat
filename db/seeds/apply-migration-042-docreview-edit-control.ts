/**
 * Applies migration 0042 — édition contrôlée du FOR-MI-01 : grille de lignes,
 * numéro de révision, auteur de la dernière modification, signature de clôture.
 *
 *   npx tsx --env-file=.env db/seeds/apply-migration-042-docreview-edit-control.ts
 *
 * Purement additif et rejouable.
 */
import { db } from '../index'
import { sql } from 'drizzle-orm'
import { readFileSync } from 'fs'
import { join } from 'path'
import { splitSqlStatements } from './lib/split-sql'

async function main() {
  const file = join(__dirname, '..', 'migrations', '0042_docreview_edit_control.sql')

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
    SELECT (SELECT count(*) FROM document_reviews)                                  AS reviews,
           (SELECT count(*) FROM document_review_lines)                             AS lines,
           (SELECT count(*) FROM information_schema.columns
             WHERE table_name = 'document_reviews'
               AND column_name IN ('process_code','revision_number','updated_by',
                                   'completed_at','completed_by'))                  AS new_columns
  `)
  console.log('\nRésumé :', summary.rows[0])
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
