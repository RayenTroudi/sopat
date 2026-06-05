/**
 * Imports all published posts and pages from sopat.tn WordPress REST API
 * into the Neon Post / Page / Category / Tag tables.
 * Safe to re-run — uses ON CONFLICT DO NOTHING.
 */

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

const WP_BASE = 'https://www.sopat.tn/wp-json/wp/v2'

async function fetchAll(endpoint) {
  const items = []
  let page = 1
  while (true) {
    const url = `${WP_BASE}/${endpoint}?per_page=100&page=${page}`
    const res = await fetch(url)
    if (!res.ok) {
      if (res.status === 400) break // no more pages
      throw new Error(`${url} → ${res.status}`)
    }
    const batch = await res.json()
    if (!batch.length) break
    items.push(...batch)
    const total = Number(res.headers.get('X-WP-TotalPages') ?? 1)
    if (page >= total) break
    page++
  }
  return items
}

function stripHtml(html) {
  return (html ?? '').replace(/<[^>]*>/g, '').trim()
}

function extractFirstImage(html) {
  const m = (html ?? '').match(/<img[^>]+src=["']([^"']+)["']/)
  return m?.[1] ?? null
}

// ── Categories & Tags ─────────────────────────────────────────────────────────

console.log('Fetching categories...')
const categories = await fetchAll('categories')
for (const c of categories) {
  await sql.query(
    `INSERT INTO "Category" (id, slug, name, count)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET name=$3, count=$4`,
    [c.id, c.slug, c.name, c.count]
  )
}
console.log(`  ✓ ${categories.length} categories`)

console.log('Fetching tags...')
const tags = await fetchAll('tags')
for (const t of tags) {
  await sql.query(
    `INSERT INTO "Tag" (id, slug, name, count)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET name=$3, count=$4`,
    [t.id, t.slug, t.name, t.count]
  )
}
console.log(`  ✓ ${tags.length} tags`)

// ── Posts ─────────────────────────────────────────────────────────────────────

console.log('Fetching posts...')
const posts = await fetchAll('posts')
let postOk = 0, postSkip = 0

for (const p of posts) {
  const content  = p.content?.rendered ?? ''
  const excerpt  = stripHtml(p.excerpt?.rendered ?? '')
  const title    = stripHtml(p.title?.rendered ?? '')
  // Try yoast OG image first, fall back to first img in content
  const featImg  = p.yoast_head_json?.og_image?.[0]?.url
                ?? extractFirstImage(content)

  try {
    await sql.query(
      `INSERT INTO "Post"
         (id, slug, title, content, excerpt, date, modified, author,
          "featuredImage", categories, tags, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         title=$3, content=$4, excerpt=$5, modified=$7,
         "featuredImage"=$9, categories=$10, tags=$11`,
      [
        p.id, p.slug, title, content, excerpt,
        new Date(p.date), p.modified ? new Date(p.modified) : null,
        p.author, featImg ?? null,
        p.categories ?? [], p.tags ?? [],
        p.status,
      ]
    )
    postOk++
  } catch (e) {
    console.warn(`  ⚠ post ${p.id} (${p.slug}): ${e.message}`)
    postSkip++
  }
}
console.log(`  ✓ ${postOk} posts imported, ${postSkip} skipped`)

// ── Pages ─────────────────────────────────────────────────────────────────────

console.log('Fetching pages...')
const pages = await fetchAll('pages')
let pageOk = 0

for (const pg of pages) {
  const content  = pg.content?.rendered ?? ''
  const title    = stripHtml(pg.title?.rendered ?? '')
  const featImg  = pg.yoast_head_json?.og_image?.[0]?.url
                ?? extractFirstImage(content)

  try {
    await sql.query(
      `INSERT INTO "Page"
         (id, slug, title, content, parent, "menuOrder", "featuredImage", status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         title=$3, content=$4, "featuredImage"=$7`,
      [
        pg.id, pg.slug, title, content,
        pg.parent ?? 0, pg.menu_order ?? 0,
        featImg ?? null, pg.status,
      ]
    )
    pageOk++
  } catch (e) {
    console.warn(`  ⚠ page ${pg.id} (${pg.slug}): ${e.message}`)
  }
}
console.log(`  ✓ ${pageOk} pages imported`)

// ── Summary ───────────────────────────────────────────────────────────────────

const [{ count }] = await sql.query(`SELECT COUNT(*) FROM "Post" WHERE status = 'publish'`)
console.log(`\nDone. ${count} published posts now in database.`)
