import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env manually
const envPath = resolve(__dirname, '../.env')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  const key = trimmed.slice(0, eq).trim()
  const val = trimmed.slice(eq + 1).trim()
  if (!process.env[key]) process.env[key] = val
}

const url = process.env.DATABASE_URL
if (!url) { console.error('DATABASE_URL not found'); process.exit(1) }

console.log('Connecting to Neon...')
const sql = neon(url)
const db = drizzle(sql)

console.log('Running migrations from', resolve(__dirname, '../db/migrations'))
migrate(db, { migrationsFolder: resolve(__dirname, '../db/migrations') })
  .then(() => { console.log('✓ Migration complete'); process.exit(0) })
  .catch(e => { console.error('✗ Migration failed:', e.message); process.exit(1) })
