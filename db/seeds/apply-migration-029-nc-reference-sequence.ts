import { db } from '../index'
import { sql } from 'drizzle-orm'
import { readFileSync } from 'fs'
import { join } from 'path'

async function main() {
  const file = join(__dirname, '..', 'migrations', '0029_nc_reference_sequence.sql')
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
      console.log(`OK: ${stmt.slice(0, 70).replace(/\s+/g, ' ')}...`)
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
  console.log('Migration 0029 applied: nc_reference_sequences')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
