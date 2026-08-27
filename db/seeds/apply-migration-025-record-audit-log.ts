import { db } from '../index'
import { sql } from 'drizzle-orm'
import { readFileSync } from 'fs'
import { join } from 'path'

async function main() {
  const file = join(__dirname, '..', 'migrations', '0025_record_audit_log.sql')
  const raw = readFileSync(file, 'utf8')
  const statements = raw
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) =>
      s
        .split(/\r?\n/)
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim()
    )
    .filter((s) => s.length > 0)

  for (const stmt of statements) {
    try {
      await db.execute(sql.raw(stmt))
    } catch (e: unknown) {
      const err = e as Error & { cause?: Error }
      const msg = `${err?.message ?? ''} ${err?.cause?.message ?? ''}`
      if (/already exists/i.test(msg)) {
        console.log(`Skipped (exists): ${stmt.slice(0, 60)}...`)
      } else {
        throw e
      }
    }
  }
  console.log('Migration 0025 applied: record_audit_log')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
