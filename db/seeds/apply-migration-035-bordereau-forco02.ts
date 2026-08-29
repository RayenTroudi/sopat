/**
 * Applies migration 0035 — FOR-CO-02 « Bordereau des prix ».
 *
 * The usual splitter in this folder cuts on `;` at end of line, which would
 * shred the `DO $$ … END $$` blocks and the `offer_versions_guard` function
 * body: both contain semicolons of their own. This one tracks dollar-quoting,
 * so a `$$ … $$` region is passed through whole.
 *
 *   npx tsx --env-file=.env db/seeds/apply-migration-035-bordereau-forco02.ts
 */
import { db } from '../index'
import { sql } from 'drizzle-orm'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Splits on `;`, skipping the ones that are not statement terminators.
 *
 * Three regions are opaque: `$tag$ … $tag$` bodies, `'…'` literals, and `--`
 * comments. The comments matter as much as the dollar quoting here — this
 * migration's prose explains business rules in sentences, and a single
 * semicolon inside one would otherwise cut a statement in half.
 */
function splitStatements(raw: string): string[] {
  const out: string[] = []
  let current = ''
  let dollarTag: string | null = null
  let inString = false

  for (let i = 0; i < raw.length; i++) {
    if (dollarTag) {
      if (raw.startsWith(dollarTag, i)) {
        current += dollarTag
        i += dollarTag.length - 1
        dollarTag = null
      } else {
        current += raw[i]
      }
      continue
    }

    if (inString) {
      current += raw[i]
      if (raw[i] === "'") inString = false
      continue
    }

    if (raw.startsWith('--', i)) {
      const end = raw.indexOf('\n', i)
      i = end === -1 ? raw.length : end - 1
      continue
    }

    const dollar = raw.slice(i, i + 20).match(/^\$[A-Za-z_]*\$/)
    if (dollar) {
      dollarTag = dollar[0]
      current += dollarTag
      i += dollarTag.length - 1
      continue
    }

    if (raw[i] === "'") {
      inString = true
      current += raw[i]
      continue
    }

    if (raw[i] === ';') {
      out.push(current)
      current = ''
      continue
    }
    current += raw[i]
  }
  out.push(current)

  return out.map((s) => s.trim()).filter((s) => s.length > 0)
}

async function main() {
  const file = join(__dirname, '..', 'migrations', '0035_bordereau_forco02.sql')
  const statements = splitStatements(readFileSync(file, 'utf8'))

  for (const stmt of statements) {
    try {
      await db.execute(sql.raw(stmt))
      console.log(`OK: ${stmt.slice(0, 70).replace(/\s+/g, ' ')}…`)
    } catch (e: unknown) {
      const err = e as Error & { cause?: Error }
      const msg = `${err?.message ?? ''} ${err?.cause?.message ?? ''}`
      if (/already exists|does not exist/i.test(msg) && /DROP|IF NOT EXISTS|IF EXISTS/i.test(stmt)) {
        console.log(`Ignoré (déjà appliqué) : ${stmt.slice(0, 60).replace(/\s+/g, ' ')}…`)
      } else {
        console.error(`ÉCHEC sur : ${stmt.slice(0, 200).replace(/\s+/g, ' ')}`)
        throw e
      }
    }
  }

  console.log('Migration 0035 appliquée : FOR-CO-02 « Bordereau des prix »')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
