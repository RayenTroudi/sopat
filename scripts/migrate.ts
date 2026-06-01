import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { v2 as cloudinary } from 'cloudinary'
import { prisma } from '../src/lib/db'

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

function extractElementorWidgetContents(html: string): string[] {
  const results: string[] = []
  const marker = 'elementor-widget-container'
  let pos = 0
  while (pos < html.length) {
    const markerIdx = html.indexOf(marker, pos)
    if (markerIdx === -1) break
    // Find the '>' that closes the opening div tag
    const openTagEnd = html.indexOf('>', markerIdx)
    if (openTagEnd === -1) break
    const contentStart = openTagEnd + 1
    // Walk forward tracking div nesting depth to find matching </div>
    let depth = 1
    let i = contentStart
    while (i < html.length && depth > 0) {
      const nextOpen = html.indexOf('<div', i)
      const nextClose = html.indexOf('</div>', i)
      if (nextClose === -1) break
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++
        i = nextOpen + 4
      } else {
        depth--
        if (depth === 0) {
          results.push(html.slice(contentStart, nextClose).trim())
          pos = nextClose + 6
        } else {
          i = nextClose + 6
        }
      }
    }
    if (depth !== 0) break
  }
  return results
}

function cleanElementorContent(html: string, map: Map<string, string>): string {
  const isElementor = html.includes('data-elementor-type=') || html.includes('elementor-widget-container')
  let result = html

  if (isElementor) {
    const containers = extractElementorWidgetContents(html)
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
