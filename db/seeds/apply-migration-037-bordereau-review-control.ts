/**
 * Applies migration 0037 — revue formelle FOR-CO-02, traçabilité de version et
 * conservation du classeur source.
 *
 * Réutilise le découpeur de 0035/0036 : le fichier redéfinit
 * `offer_versions_guard()`, dont le corps `$guard$ … $guard$` contient ses
 * propres point-virgules qu'un découpage naïf couperait en deux, et sa prose
 * contient des apostrophes.
 *
 * Chaque instruction part dans sa propre transaction implicite, ce qui est
 * exactement ce dont `ALTER TYPE … ADD VALUE` a besoin : la valeur ajoutée doit
 * être committée avant que la contrainte CHECK qui la nomme soit créée.
 *
 *   npx tsx --env-file=.env db/seeds/apply-migration-037-bordereau-review-control.ts
 */
import { db } from '../index'
import { sql } from 'drizzle-orm'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Splits on `;`, skipping the ones that are not statement terminators.
 *
 * Three regions are opaque: `$tag$ … $tag$` bodies, `'…'` literals, and `--`
 * comments.
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
  const file = join(__dirname, '..', 'migrations', '0037_bordereau_review_control.sql')
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

  console.log('Migration 0037 appliquée : revue, traçabilité de version, classeur source')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
