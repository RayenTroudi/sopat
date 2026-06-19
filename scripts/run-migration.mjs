// One-shot migration runner using the `pg` package (supports raw SQL strings).
// Usage: node scripts/run-migration.mjs db/migrations/0008_dms.sql
import { readFileSync } from 'fs'
import pg from 'pg'

const { Client } = pg

const url = process.env.DATABASE_URL
if (!url) { console.error('DATABASE_URL not set'); process.exit(1) }

const file = process.argv[2]
if (!file) { console.error('Usage: node scripts/run-migration.mjs <file.sql>'); process.exit(1) }

const sql = readFileSync(file, 'utf8')

const client = new Client({ connectionString: url })
await client.connect()
console.log(`Connected. Applying ${file} …`)

try {
  // Run the whole file in one shot — pg supports multi-statement queries.
  await client.query(sql)
  console.log('Done — migration applied successfully.')
} catch (err) {
  console.error('Migration failed:', err.message)
  if (err.detail) console.error('Detail:', err.detail)
  if (err.hint)   console.error('Hint:', err.hint)
  process.exit(1)
} finally {
  await client.end()
}
