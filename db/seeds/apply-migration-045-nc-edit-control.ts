/**
 * Applies migration 0045 — FOR-MI-05 : contrôle des modifications du registre
 * NC/PNC/réclamations (`updated_by` + `revision_number` sur la fiche et sur
 * l'action corrective).
 *
 *   npx tsx --env-file=.env db/seeds/apply-migration-045-nc-edit-control.ts
 *
 * Purement additif et rejouable. Ne dépend d'aucune migration récente : les
 * tables `non_conformances` et `corrective_actions` existent depuis l'origine.
 */
import { db } from '../index'
import { sql } from 'drizzle-orm'
import { readFileSync } from 'fs'
import { join } from 'path'
import { splitSqlStatements } from './lib/split-sql'

async function main() {
  const file = join(__dirname, '..', 'migrations', '0045_nc_edit_control.sql')

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
    SELECT (SELECT count(*) FROM non_conformances WHERE deleted_at IS NULL)  AS fiches,
           (SELECT count(*) FROM corrective_actions)                          AS actions_correctives,
           (SELECT count(*) FROM information_schema.columns
             WHERE table_name = 'non_conformances'
               AND column_name IN ('updated_by','revision_number'))           AS nc_new_columns,
           (SELECT count(*) FROM information_schema.columns
             WHERE table_name = 'corrective_actions'
               AND column_name IN ('updated_by','revision_number'))           AS capa_new_columns
  `)
  console.log('\nRésumé :', summary.rows[0])
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
