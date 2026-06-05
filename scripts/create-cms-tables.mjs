/**
 * Creates the Prisma CMS tables (Post, Page, Category, Tag, MediaMapping)
 * in the existing Neon database without touching any Drizzle tables.
 * Safe to re-run — uses IF NOT EXISTS throughout.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env
const envContent = readFileSync(resolve(__dirname, '../.env'), 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  const key = trimmed.slice(0, eq).trim()
  const val = trimmed.slice(eq + 1).trim()
  if (!process.env[key]) process.env[key] = val
}

const { neon } = await import('@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)

// Execute a raw DDL string via the tagged-template interface
async function exec(ddl) {
  return sql.query(ddl)
}

const statements = [
  `CREATE TABLE IF NOT EXISTS "Post" (
    "id"            INTEGER       NOT NULL,
    "slug"          TEXT          NOT NULL,
    "title"         TEXT          NOT NULL,
    "content"       TEXT          NOT NULL,
    "excerpt"       TEXT          NOT NULL,
    "date"          TIMESTAMPTZ   NOT NULL,
    "modified"      TIMESTAMPTZ,
    "author"        INTEGER       NOT NULL,
    "featuredImage" TEXT,
    "categories"    INTEGER[]     NOT NULL DEFAULT '{}',
    "tags"          INTEGER[]     NOT NULL DEFAULT '{}',
    "status"        TEXT          NOT NULL,
    "createdAt"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "Post_slug_key" ON "Post"("slug")`,

  `CREATE TABLE IF NOT EXISTS "Page" (
    "id"            INTEGER       NOT NULL,
    "slug"          TEXT          NOT NULL,
    "title"         TEXT          NOT NULL,
    "content"       TEXT          NOT NULL,
    "parent"        INTEGER       NOT NULL,
    "menuOrder"     INTEGER       NOT NULL,
    "featuredImage" TEXT,
    "status"        TEXT          NOT NULL,
    "createdAt"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "Page_slug_key" ON "Page"("slug")`,

  `CREATE TABLE IF NOT EXISTS "Tag" (
    "id"    INTEGER NOT NULL,
    "slug"  TEXT    NOT NULL,
    "name"  TEXT    NOT NULL,
    "count" INTEGER NOT NULL,
    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "Tag_slug_key" ON "Tag"("slug")`,

  `CREATE TABLE IF NOT EXISTS "Category" (
    "id"    INTEGER NOT NULL,
    "slug"  TEXT    NOT NULL,
    "name"  TEXT    NOT NULL,
    "count" INTEGER NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug")`,

  `CREATE TABLE IF NOT EXISTS "MediaMapping" (
    "id"            SERIAL        NOT NULL,
    "originalUrl"   TEXT          NOT NULL,
    "cloudinaryUrl" TEXT          NOT NULL,
    "publicId"      TEXT          NOT NULL,
    "createdAt"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT "MediaMapping_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "MediaMapping_originalUrl_key" ON "MediaMapping"("originalUrl")`,
]

console.log('Creating CMS tables...')
for (const stmt of statements) {
  const name = stmt.match(/"(\w+)"/)?.[1] ?? stmt.slice(0, 40)
  try {
    await exec(stmt)
    console.log(`  ✓ ${name}`)
  } catch (e) {
    console.error(`  ✗ ${name}:`, e.message)
    process.exit(1)
  }
}
console.log('Done.')
