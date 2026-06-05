import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envContent = readFileSync(resolve(__dirname, '../.env'), 'utf-8')
for (const line of envContent.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  const k = t.slice(0, eq).trim(), v = t.slice(eq + 1).trim()
  if (!process.env[k]) process.env[k] = v
}

const { neon } = await import('@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)

const [count] = await sql.query(`SELECT COUNT(*) FROM "Post" WHERE status = 'publish'`)
console.log('Published posts:', count.count)

if (Number(count.count) === 0) {
  console.log('\nThe Post table is empty — blog posts need to be imported from WordPress.')
  console.log('Run: npx tsx scripts/import-wp-posts.ts')
}
