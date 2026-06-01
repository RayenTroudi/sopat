# WordPress → Next.js Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate sopat.tn WordPress content to Neon PostgreSQL + Cloudinary and rewrite `src/lib/api.ts` to read from the DB instead of the live WordPress API.

**Architecture:** A one-time idempotent migration script (`scripts/migrate.ts`) uploads 1,645 images to Cloudinary, then fetches and stores all WP content (posts, pages, tags, categories) in Neon PostgreSQL via Prisma with Cloudinary URLs substituted for all WordPress image URLs. `src/lib/api.ts` is then rewritten with the same exported function signatures but backed by Prisma — zero changes needed in any page or component.

**Tech Stack:** Next.js 16 (App Router), Prisma 6, Neon PostgreSQL, Cloudinary Node SDK, TypeScript, tsx (for running scripts)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `prisma/schema.prisma` | DB models: Post, Page, Tag, Category, MediaMapping |
| Create | `src/lib/db.ts` | Singleton PrismaClient for Next.js |
| Create | `scripts/migrate.ts` | Full 5-phase migration script |
| Create | `scripts/migration-progress.json` | Phase progress tracker |
| Modify | `src/lib/api.ts` | Rewrite: Prisma instead of WP API fetch |
| Modify | `package.json` | Add deps + `migrate` script |

---

## Task 1: Install Dependencies and Create Prisma Schema

**Files:**
- Modify: `package.json`
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Install dependencies**

```bash
npm install @prisma/client prisma cloudinary dotenv
```

Expected output: packages installed with no peer dep errors.

- [ ] **Step 2: Initialize Prisma (generates `prisma/` directory)**

```bash
npx prisma init --datasource-provider postgresql
```

Expected: creates `prisma/schema.prisma` and adds `DATABASE_URL` hint. The `.env` already has `DATABASE_URL` set — do NOT overwrite it.

- [ ] **Step 3: Replace `prisma/schema.prisma` with the full schema**

Write this exact content to `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Post {
  id            Int       @id
  slug          String    @unique
  title         String
  content       String    @db.Text
  excerpt       String    @db.Text
  date          DateTime
  modified      DateTime?
  author        Int
  featuredImage String?
  categories    Int[]
  tags          Int[]
  status        String
  createdAt     DateTime  @default(now())
}

model Page {
  id            Int      @id
  slug          String   @unique
  title         String
  content       String   @db.Text
  parent        Int
  menuOrder     Int
  featuredImage String?
  status        String
  createdAt     DateTime @default(now())
}

model Tag {
  id    Int    @id
  slug  String @unique
  name  String
  count Int
}

model Category {
  id    Int    @id
  slug  String @unique
  name  String
  count Int
}

model MediaMapping {
  id            Int      @id @default(autoincrement())
  originalUrl   String   @unique
  cloudinaryUrl String
  publicId      String
  createdAt     DateTime @default(now())
}
```

- [ ] **Step 4: Push schema to Neon (creates tables)**

```bash
npx prisma db push
```

Expected output ends with: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 5: Generate Prisma client**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client`.

- [ ] **Step 6: Add `migrate` script to `package.json`**

In `package.json`, add to the `"scripts"` block:

```json
"migrate": "npx tsx scripts/migrate.ts"
```

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma package.json package-lock.json
git commit -m "feat: add Prisma schema and migration dependencies"
```

---

## Task 2: Create Prisma Singleton (`src/lib/db.ts`)

**Files:**
- Create: `src/lib/db.ts`

- [ ] **Step 1: Create `src/lib/db.ts`**

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: add Prisma singleton client"
```

---

## Task 3: Create Migration Progress File

**Files:**
- Create: `scripts/migration-progress.json`

- [ ] **Step 1: Create `scripts/migration-progress.json`**

```json
{
  "phase1_images": { "total": 1645, "uploaded": 0, "failed": 0, "skipped": 0 },
  "phase2_content": { "status": "pending" },
  "phase3_database": { "posts": 0, "pages": 0, "tags": 0, "categories": 0 },
  "phase4_verification": { "status": "pending" },
  "lastRun": ""
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/migration-progress.json
git commit -m "feat: add migration progress tracker"
```

---

## Task 4: Create Migration Script (`scripts/migrate.ts`)

**Files:**
- Create: `scripts/migrate.ts`

This is the full script. Write the entire file at once.

- [ ] **Step 1: Create `scripts/migrate.ts` with the full content below**

```ts
import fs from 'fs'
import path from 'path'
import { v2 as cloudinary } from 'cloudinary'
import { prisma } from '../src/lib/db'

// ── Config ────────────────────────────────────────────────────────────────────

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const BASE_URL = 'https://www.sopat.tn/wp-json/wp/v2'
const PROGRESS_FILE = path.join(import.meta.dirname, 'migration-progress.json')
const IMAGE_URLS_FILE = path.join(import.meta.dirname, 'image-urls.json')

// ── Progress file ─────────────────────────────────────────────────────────────

type Progress = {
  phase1_images: { total: number; uploaded: number; failed: number; skipped: number }
  phase2_content: { status: string }
  phase3_database: { posts: number; pages: number; tags: number; categories: number }
  phase4_verification: { status: string }
  lastRun: string
}

function loadProgress(): Progress {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8')) as Progress
  } catch {
    return {
      phase1_images: { total: 1645, uploaded: 0, failed: 0, skipped: 0 },
      phase2_content: { status: 'pending' },
      phase3_database: { posts: 0, pages: 0, tags: 0, categories: 0 },
      phase4_verification: { status: 'pending' },
      lastRun: '',
    }
  }
}

function saveProgress(p: Progress) {
  p.lastRun = new Date().toISOString()
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2), 'utf-8')
}

// ── WP helpers ────────────────────────────────────────────────────────────────

async function wpFetchAll<T>(endpoint: string, perPage = 100): Promise<T[]> {
  const sep = endpoint.includes('?') ? '&' : '?'
  const firstRes = await fetch(`${BASE_URL}${endpoint}${sep}per_page=${perPage}&page=1`)
  if (!firstRes.ok) throw new Error(`WP API error ${firstRes.status}: ${endpoint}`)
  const totalPages = Number(firstRes.headers.get('X-WP-TotalPages') ?? 1)
  const firstData = (await firstRes.json()) as T[]
  if (totalPages <= 1) return firstData
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      fetch(`${BASE_URL}${endpoint}${sep}per_page=${perPage}&page=${i + 2}`).then((r) =>
        r.ok ? (r.json() as Promise<T[]>) : Promise.resolve([] as T[])
      )
    )
  )
  return [firstData, ...rest].flat()
}

// ── Phase 1: Cloudinary upload ────────────────────────────────────────────────

async function phase1(progress: Progress) {
  console.log('\n─── PHASE 1: Cloudinary Image Upload ───')
  const urls: string[] = JSON.parse(fs.readFileSync(IMAGE_URLS_FILE, 'utf-8'))
  progress.phase1_images.total = urls.length

  let uploaded = 0
  let skipped = 0
  let failed = 0

  const BATCH_SIZE = 5
  const DELAY_MS = 100

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (url) => {
        try {
          // Check if already uploaded
          const existing = await prisma.mediaMapping.findUnique({ where: { originalUrl: url } })
          if (existing) {
            skipped++
            return
          }

          const result = await cloudinary.uploader.upload(url, {
            folder: 'sopat',
            use_filename: true,
            unique_filename: false,
            overwrite: false,
            resource_type: 'auto',
          })

          await prisma.mediaMapping.create({
            data: {
              originalUrl: url,
              cloudinaryUrl: result.secure_url,
              publicId: result.public_id,
            },
          })
          uploaded++

          const total = uploaded + skipped + failed
          if (total % 50 === 0) {
            console.log(`  [${total}/${urls.length}] uploaded: ${uploaded}, skipped: ${skipped}, failed: ${failed}`)
          }
        } catch (err) {
          failed++
          console.error(`  FAILED: ${url}`, err instanceof Error ? err.message : err)
        }
      })
    )

    if (i + BATCH_SIZE < urls.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS))
    }
  }

  progress.phase1_images = { total: urls.length, uploaded, failed, skipped }
  saveProgress(progress)

  console.log(`\nPhase 1 complete: ${uploaded} uploaded, ${skipped} skipped, ${failed} failed`)
}

// ── Phase 2: Build URL replacement map ───────────────────────────────────────

async function buildUrlMap(): Promise<Map<string, string>> {
  const mappings = await prisma.mediaMapping.findMany()
  const map = new Map<string, string>()
  for (const m of mappings) {
    map.set(m.originalUrl, m.cloudinaryUrl)
  }
  console.log(`\n─── PHASE 2: Content Transform — loaded ${map.size} URL mappings ───`)
  return map
}

function replaceImageUrls(html: string, map: Map<string, string>): string {
  return html.replace(
    /https?:\/\/(?:www\.)?sopat\.tn\/wp-content\/uploads\/[^\s"'<>)]+/g,
    (match) => {
      const mapped = map.get(match)
      if (!mapped) {
        console.warn(`  WARN: no Cloudinary mapping for ${match}`)
        return match
      }
      return mapped
    }
  )
}

function cleanElementorContent(html: string, map: Map<string, string>): string {
  const isElementor = html.includes('data-elementor-type=') || html.includes('elementor-widget-container')
  let result = html

  if (isElementor) {
    const containers: string[] = []
    const re = /<div[^>]*class="[^"]*elementor-widget-container[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) {
      containers.push(m[1].trim())
    }
    result = containers.length > 0 ? containers.join('\n') : html
  }

  return replaceImageUrls(result, map)
}

// ── Phase 3: Save to DB ───────────────────────────────────────────────────────

type WPCategory = { id: number; slug: string; name: string; count: number }
type WPTag = { id: number; slug: string; name: string; count: number }
type WPPost = {
  id: number; slug: string; title: { rendered: string }
  content: { rendered: string }; excerpt: { rendered: string }
  date: string; modified: string; author: number
  featured_media: number; categories: number[]; tags: number[]; status: string
}
type WPPage = {
  id: number; slug: string; title: { rendered: string }
  content: { rendered: string }
  date: string; modified: string; author: number
  featured_media: number; parent: number; menu_order: number; status: string
}
type WPMedia = { source_url: string }

async function resolveFeaturedImage(featuredMediaId: number, map: Map<string, string>): Promise<string | null> {
  if (!featuredMediaId) return null
  try {
    const res = await fetch(`${BASE_URL}/media/${featuredMediaId}?_fields=source_url`)
    if (!res.ok) return null
    const media = (await res.json()) as WPMedia
    const original = media.source_url
    return map.get(original) ?? original ?? null
  } catch {
    return null
  }
}

async function phase3(progress: Progress, map: Map<string, string>) {
  console.log('\n─── PHASE 3: Save to Database ───')

  // Categories
  const categories = await wpFetchAll<WPCategory>('/categories?_fields=id,slug,name,count')
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: { slug: cat.slug, name: cat.name, count: cat.count },
      create: { id: cat.id, slug: cat.slug, name: cat.name, count: cat.count },
    })
  }
  progress.phase3_database.categories = categories.length
  saveProgress(progress)
  console.log(`  Categories: ${categories.length} saved`)

  // Tags
  const tags = await wpFetchAll<WPTag>('/tags?_fields=id,slug,name,count')
  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { id: tag.id },
      update: { slug: tag.slug, name: tag.name, count: tag.count },
      create: { id: tag.id, slug: tag.slug, name: tag.name, count: tag.count },
    })
  }
  progress.phase3_database.tags = tags.length
  saveProgress(progress)
  console.log(`  Tags: ${tags.length} saved`)

  // Posts
  const posts = await wpFetchAll<WPPost>('/posts?_fields=id,slug,title,content,excerpt,date,modified,author,featured_media,categories,tags,status')
  for (const post of posts) {
    try {
      const content = cleanElementorContent(post.content.rendered, map)
      const excerpt = replaceImageUrls(post.excerpt.rendered, map)
      const featuredImage = await resolveFeaturedImage(post.featured_media, map)

      await prisma.post.upsert({
        where: { id: post.id },
        update: {
          slug: post.slug,
          title: post.title.rendered,
          content,
          excerpt,
          date: new Date(post.date),
          modified: post.modified ? new Date(post.modified) : null,
          author: post.author,
          featuredImage,
          categories: post.categories,
          tags: post.tags,
          status: post.status,
        },
        create: {
          id: post.id,
          slug: post.slug,
          title: post.title.rendered,
          content,
          excerpt,
          date: new Date(post.date),
          modified: post.modified ? new Date(post.modified) : null,
          author: post.author,
          featuredImage,
          categories: post.categories,
          tags: post.tags,
          status: post.status,
        },
      })
    } catch (err) {
      console.error(`  FAILED post id=${post.id} slug=${post.slug}:`, err instanceof Error ? err.message : err)
    }
  }
  progress.phase3_database.posts = posts.length
  saveProgress(progress)
  console.log(`  Posts: ${posts.length} saved`)

  // Pages
  const pages = await wpFetchAll<WPPage>('/pages?status=publish&_fields=id,slug,title,content,date,modified,author,featured_media,parent,menu_order,status')
  for (const page of pages) {
    try {
      const content = cleanElementorContent(page.content.rendered, map)
      const featuredImage = await resolveFeaturedImage(page.featured_media, map)

      await prisma.page.upsert({
        where: { id: page.id },
        update: {
          slug: page.slug,
          title: page.title.rendered,
          content,
          parent: page.parent,
          menuOrder: page.menu_order,
          featuredImage,
          status: page.status,
        },
        create: {
          id: page.id,
          slug: page.slug,
          title: page.title.rendered,
          content,
          parent: page.parent,
          menuOrder: page.menu_order,
          featuredImage,
          status: page.status,
        },
      })
    } catch (err) {
      console.error(`  FAILED page id=${page.id} slug=${page.slug}:`, err instanceof Error ? err.message : err)
    }
  }
  progress.phase3_database.pages = pages.length
  saveProgress(progress)
  console.log(`  Pages: ${pages.length} saved`)
}

// ── Phase 4: Verification ─────────────────────────────────────────────────────

async function phase4(progress: Progress) {
  console.log('\n─── PHASE 4: Verification ───')
  const OLD_URL_PATTERN = /sopat\.tn\/wp-content\/uploads\//

  const [postCount, pageCount, tagCount, catCount, mediaCount] = await Promise.all([
    prisma.post.count(),
    prisma.page.count(),
    prisma.tag.count(),
    prisma.category.count(),
    prisma.mediaMapping.count(),
  ])

  console.log(`  Posts in DB:       ${postCount}  (expected: 14)  ${postCount === 14 ? '✓' : '✗ MISMATCH'}`)
  console.log(`  Pages in DB:       ${pageCount}  (expected: 7)   ${pageCount === 7 ? '✓' : '✗ MISMATCH'}`)
  console.log(`  Tags in DB:        ${tagCount}  (expected: 22)  ${tagCount === 22 ? '✓' : '✗ MISMATCH'}`)
  console.log(`  Categories in DB:  ${catCount}  (expected: 1)   ${catCount === 1 ? '✓' : '✗ MISMATCH'}`)
  console.log(`  MediaMappings:     ${mediaCount}  (expected ~1645)`)

  // Scan all posts and pages for remaining WP URLs
  const allPosts = await prisma.post.findMany({ select: { id: true, slug: true, content: true, excerpt: true } })
  const allPages = await prisma.page.findMany({ select: { id: true, slug: true, content: true } })

  const dirty: string[] = []
  for (const p of allPosts) {
    if (OLD_URL_PATTERN.test(p.content) || OLD_URL_PATTERN.test(p.excerpt)) {
      dirty.push(`post:${p.slug}`)
    }
  }
  for (const p of allPages) {
    if (OLD_URL_PATTERN.test(p.content)) {
      dirty.push(`page:${p.slug}`)
    }
  }

  // Sample 3 random posts
  const sample = allPosts.sort(() => 0.5 - Math.random()).slice(0, 3)
  console.log('\n  Sample post check:')
  for (const p of sample) {
    const hasOld = OLD_URL_PATTERN.test(p.content)
    console.log(`    ${p.slug}: ${hasOld ? '✗ HAS old URLs' : '✓ clean'}`)
  }

  if (dirty.length > 0) {
    console.log(`\n  ✗ ${dirty.length} items still contain old WordPress image URLs:`)
    for (const d of dirty) console.log(`    ${d}`)
  } else {
    console.log('\n  ✓ No old WordPress image URLs remaining')
  }

  progress.phase4_verification = { status: dirty.length === 0 ? 'passed' : 'failed' }
  saveProgress(progress)

  return { postCount, pageCount, tagCount, catCount, oldUrlsRemaining: dirty.length }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Load .env manually (tsx doesn't auto-load it)
  const { config } = await import('dotenv')
  config({ path: path.join(process.cwd(), '.env') })

  // Re-configure cloudinary after env is loaded
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  const progress = loadProgress()

  try {
    await phase1(progress)
  } catch (err) {
    console.error('Phase 1 error:', err)
  }

  let urlMap: Map<string, string>
  try {
    urlMap = await buildUrlMap()
    progress.phase2_content = { status: 'complete' }
    saveProgress(progress)
  } catch (err) {
    console.error('Phase 2 error:', err)
    urlMap = new Map()
  }

  try {
    await phase3(progress, urlMap)
  } catch (err) {
    console.error('Phase 3 error:', err)
  }

  let verifyResult = { postCount: 0, pageCount: 0, tagCount: 0, catCount: 0, oldUrlsRemaining: -1 }
  try {
    verifyResult = await phase4(progress)
  } catch (err) {
    console.error('Phase 4 error:', err)
  }

  // Summary
  const p = progress.phase1_images
  console.log('\n╔══════════════════════════════╗')
  console.log('║     MIGRATION SUMMARY        ║')
  console.log('╠══════════════════════════════╣')
  console.log(`║ Images uploaded:   ${String(p.uploaded).padEnd(10)}║`)
  console.log(`║ Images skipped:    ${String(p.skipped).padEnd(10)}║`)
  console.log(`║ Images failed:     ${String(p.failed).padEnd(10)}║`)
  console.log(`║ Posts saved:       ${String(verifyResult.postCount).padEnd(10)}║`)
  console.log(`║ Pages saved:       ${String(verifyResult.pageCount).padEnd(10)}║`)
  console.log(`║ Tags saved:        ${String(verifyResult.tagCount).padEnd(10)}║`)
  console.log(`║ Categories saved:  ${String(verifyResult.catCount).padEnd(10)}║`)
  console.log(`║ Old URLs remaining:${String(verifyResult.oldUrlsRemaining).padEnd(10)}║`)
  console.log('╚══════════════════════════════╝')

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Verify TypeScript compiles (no runtime execution yet)**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see `Cannot find module '../src/lib/db'` — run `npx prisma generate` first.

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate.ts
git commit -m "feat: add migration script (phases 1-5)"
```

---

## Task 5: Rewrite `src/lib/api.ts`

**Files:**
- Modify: `src/lib/api.ts` (full rewrite)

This replaces the live WP API fetch implementation with Prisma queries. All exported function signatures and types remain identical so callers change zero lines.

- [ ] **Step 1: Replace the entire contents of `src/lib/api.ts`**

```ts
import DOMPurify from 'isomorphic-dompurify'
import { prisma } from './db'

// ── Types (shapes preserved for zero caller changes) ──────────────────────────

export type WPRendered = { rendered: string }

export type WPPost = {
  id: number
  slug: string
  date: string
  modified: string
  status: string
  type: string
  link: string
  title: WPRendered
  content: WPRendered
  excerpt: WPRendered
  author: number
  featured_media: number
  categories: number[]
  tags: number[]
  yoast_head_json?: {
    title?: string
    description?: string
    og_image?: { url: string }[]
  }
}

export type WPPage = {
  id: number
  slug: string
  date: string
  modified: string
  status: string
  type: string
  link: string
  title: WPRendered
  content: WPRendered
  excerpt: WPRendered
  author: number
  featured_media: number
  parent: number
  menu_order: number
  yoast_head_json?: {
    title?: string
    description?: string
  }
}

export type WPMedia = {
  id: number
  slug: string
  link: string
  title: WPRendered
  source_url: string
  alt_text: string
  media_details: {
    width: number
    height: number
    sizes: Record<string, { source_url: string; width: number; height: number }>
  }
}

export type WPCategory = {
  id: number
  name: string
  slug: string
  count: number
}

export type WPTag = {
  id: number
  name: string
  slug: string
  count: number
}

export type WPUser = {
  id: number
  name: string
  slug: string
  description: string
  avatar_urls: Record<string, string>
}

export type BlogPost = {
  id: number
  slug: string
  date: string
  title: string
  excerpt: string
  image: string | null
  externalUrl: string
  category: string
}

// ── DB → WP shape helpers ─────────────────────────────────────────────────────

function toWPPost(row: {
  id: number; slug: string; title: string; content: string; excerpt: string
  date: Date; modified: Date | null; author: number; featuredImage: string | null
  categories: number[]; tags: number[]; status: string
}): WPPost {
  return {
    id: row.id,
    slug: row.slug,
    date: row.date.toISOString(),
    modified: (row.modified ?? row.date).toISOString(),
    status: row.status,
    type: 'post',
    link: `https://www.sopat.tn/${row.slug}/`,
    title: { rendered: row.title },
    content: { rendered: row.content },
    excerpt: { rendered: row.excerpt },
    author: row.author,
    featured_media: 0,
    categories: row.categories,
    tags: row.tags,
  }
}

function toWPPage(row: {
  id: number; slug: string; title: string; content: string
  date: Date; modified: Date | null; featuredImage: string | null
  parent: number; menuOrder: number; status: string
}): WPPage {
  return {
    id: row.id,
    slug: row.slug,
    date: row.date.toISOString(),
    modified: (row.modified ?? row.date).toISOString(),
    status: row.status,
    type: 'page',
    link: `https://www.sopat.tn/${row.slug}/`,
    title: { rendered: row.title },
    content: { rendered: row.content },
    excerpt: { rendered: '' },
    author: 1,
    featured_media: 0,
    parent: row.parent,
    menu_order: row.menuOrder,
  }
}

// ── Data functions ────────────────────────────────────────────────────────────

export async function getPosts(params: {
  perPage?: number
  page?: number
  sticky?: boolean
} = {}): Promise<WPPost[]> {
  const { perPage = 10, page = 1 } = params
  const rows = await prisma.post.findMany({
    where: { status: 'publish' },
    orderBy: { date: 'desc' },
    take: perPage,
    skip: (page - 1) * perPage,
  })
  return rows.map(toWPPost)
}

export async function getAllPostSlugs(): Promise<string[]> {
  const rows = await prisma.post.findMany({ select: { slug: true }, where: { status: 'publish' } })
  return rows.map((r) => r.slug)
}

export async function getPostBySlug(slug: string): Promise<WPPost | null> {
  const row = await prisma.post.findUnique({ where: { slug } })
  if (!row) return null
  return toWPPost(row)
}

export async function getPages(perPage = 20): Promise<WPPage[]> {
  const rows = await prisma.page.findMany({
    where: { status: 'publish' },
    orderBy: { menuOrder: 'asc' },
    take: perPage,
  })
  return rows.map(toWPPage)
}

export async function getAllPageSlugs(): Promise<string[]> {
  const rows = await prisma.page.findMany({ select: { slug: true }, where: { status: 'publish' } })
  return rows.map((r) => r.slug)
}

export async function getPageBySlug(slug: string): Promise<WPPage | null> {
  const row = await prisma.page.findUnique({ where: { slug } })
  if (!row) return null
  return toWPPage(row)
}

export async function getMediaById(id: number): Promise<WPMedia | null> {
  if (!id) return null
  const mapping = await prisma.mediaMapping.findFirst({
    where: { publicId: { contains: String(id) } },
  })
  if (!mapping) return null
  return {
    id,
    slug: mapping.publicId,
    link: mapping.cloudinaryUrl,
    title: { rendered: '' },
    source_url: mapping.cloudinaryUrl,
    alt_text: '',
    media_details: { width: 0, height: 0, sizes: {} },
  }
}

export async function getCategories(): Promise<WPCategory[]> {
  return prisma.category.findMany()
}

export async function getTags(): Promise<WPTag[]> {
  return prisma.tag.findMany()
}

export async function getUsers(): Promise<WPUser[]> {
  return []
}

export async function getAllMedia(): Promise<WPMedia[]> {
  return []
}

// ── Blog helpers ──────────────────────────────────────────────────────────────

export function inferBlogCategory(title: string, excerpt: string): string {
  const text = (title + ' ' + excerpt).toLowerCase()
  if (text.includes('brand') || text.includes('distinction') || text.includes('award') || text.includes('prix') || text.includes('sacr')) return 'Distinction'
  if (text.includes('france 24') || text.includes('média') || text.includes('reportage') || text.includes('presse') || text.includes('interview')) return 'Médias'
  if (text.includes('abidjan') || text.includes('international') || text.includes('afrique') || text.includes('mascate') || text.includes('oman')) return 'International'
  if (text.includes('rse') || text.includes('développement durable') || text.includes('sos village') || text.includes('falaise') || text.includes('madrassa') || text.includes('école') || text.includes('plantation') || text.includes('arbre') || text.includes('femmes rurales') || text.includes('rénovation') || text.includes('citoyen')) return 'RSE'
  if (text.includes('novotel') || text.includes('convention') || text.includes('collaboration') || text.includes('audit') || text.includes('iso')) return 'Partenariats'
  if (text.includes('ville durable') || text.includes('urbain') || text.includes('ingénierie') || text.includes('paysager') || text.includes('nature') || text.includes('vert')) return 'Vision'
  return 'Actualités'
}

export async function getBlogPostBySlug(slug: string): Promise<(BlogPost & { content: string }) | null> {
  const row = await prisma.post.findUnique({ where: { slug } })
  if (!row) return null
  const title = stripHtml(row.title)
  const excerpt = stripHtml(row.excerpt)
  return {
    id: row.id,
    slug: row.slug,
    date: formatDate(row.date.toISOString()),
    title,
    excerpt,
    image: row.featuredImage ?? extractFirstImage(row.content),
    externalUrl: `https://www.sopat.tn/${row.slug}/`,
    category: inferBlogCategory(title, excerpt),
    content: row.content,
  }
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const rows = await prisma.post.findMany({
    where: { status: 'publish' },
    orderBy: { date: 'desc' },
  })
  return rows.map((row) => {
    const title = stripHtml(row.title)
    const excerpt = stripHtml(row.excerpt)
    return {
      id: row.id,
      slug: row.slug,
      date: formatDate(row.date.toISOString()),
      title,
      excerpt,
      image: row.featuredImage ?? extractFirstImage(row.content),
      externalUrl: `https://www.sopat.tn/${row.slug}/`,
      category: inferBlogCategory(title, excerpt),
    }
  })
}

// ── HTML utilities ────────────────────────────────────────────────────────────

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p','br','strong','em','b','i','u','s','a','ul','ol','li',
      'h1','h2','h3','h4','h5','h6','blockquote','code','pre',
      'figure','figcaption','img','table','thead','tbody','tr','th','td',
      'div','span',
    ],
    ALLOWED_ATTR: ['href','src','alt','class','target','rel','srcset','sizes','width','height'],
    FORCE_BODY: true,
  })
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

export function extractFirstImage(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/)
  return match?.[1] ?? null
}

export function proxyContentImages(html: string): string {
  return html
}

export function cleanWordPressContent(html: string): string {
  const isElementor = html.includes('data-elementor-type=') || html.includes('elementor-widget-container')
  if (!isElementor) return html
  return html
    .replace(/<div[^>]*class="[^"]*elementor[^"]*"[^>]*>/gi, '')
    .replace(/<\/div>/gi, '')
    .replace(/<p[^>]*>\s*<\/p>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function extractImageUrlsFromHtml(html: string): string[] {
  const urls: string[] = []
  const srcRegex = /src=["'](https?:\/\/(?:www\.)?sopat\.tn\/wp-content\/uploads\/[^"'\s]+)["']/gi
  let match: RegExpExecArray | null
  while ((match = srcRegex.exec(html)) !== null) {
    urls.push(match[1])
  }
  return urls
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api.ts src/lib/db.ts
git commit -m "feat: rewrite api.ts to use Prisma DB instead of WordPress API"
```

---

## Task 6: Run the Migration

- [ ] **Step 1: Confirm environment variables are set in `.env`**

`.env` must contain all four:
```
DATABASE_URL=postgresql://...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

- [ ] **Step 2: Run the migration**

```bash
npm run migrate
```

This will take several minutes (1,645 Cloudinary uploads). Watch for:
- `[50/1645] uploaded...` progress logs
- Phase 2/3/4 status lines
- Final summary box

- [ ] **Step 3: Verify the summary shows expected counts**

```
╔══════════════════════════════╗
║     MIGRATION SUMMARY        ║
╠══════════════════════════════╣
║ Images uploaded:   XXXX      ║
║ Images skipped:    0         ║  (0 on first run)
║ Images failed:     0         ║  (ideally 0)
║ Posts saved:       14        ║
║ Pages saved:       7         ║
║ Tags saved:        22        ║
║ Categories saved:  1         ║
║ Old URLs remaining: 0        ║
╚══════════════════════════════╝
```

If `Old URLs remaining > 0`, inspect `scripts/migration-progress.json` to see which phase recorded issues. Re-run `npm run migrate` (it is safe — all operations are idempotent).

- [ ] **Step 4: Commit the updated progress file**

```bash
git add scripts/migration-progress.json
git commit -m "chore: record migration run results"
```

---

## Task 7: Smoke-Test the App Against the DB

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open the blog list page**

Navigate to `http://localhost:3000/blog` — should show posts loaded from DB (not WordPress API).

- [ ] **Step 3: Open a blog post**

Navigate to any post slug from `http://localhost:3000/blog/[slug]` — content should render, images should be Cloudinary URLs (look for `res.cloudinary.com` in browser DevTools → Network → Img).

- [ ] **Step 4: Open a page**

Navigate to `http://localhost:3000/pages/[slug]` — should render from DB.

- [ ] **Step 5: Confirm no requests to `sopat.tn` in Network tab**

Open DevTools → Network, reload a page. There should be zero outbound requests to `www.sopat.tn`. All images come from `res.cloudinary.com`.

- [ ] **Step 6: Build to confirm no TypeScript/build errors**

```bash
npm run build
```

Expected: build completes successfully with no type errors.

- [ ] **Step 7: Commit any fixes found during smoke test**

```bash
git add -A
git commit -m "fix: smoke test corrections after DB migration"
```
