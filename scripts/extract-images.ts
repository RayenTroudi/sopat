/**
 * Collects every wp-content/uploads image URL using 5 strategies
 * (avoids /media endpoint which returns HTTP 500).
 *
 * Run with: npx tsx scripts/extract-images.ts
 */

import fs from 'fs'
import path from 'path'

const BASE_URL = 'https://www.sopat.tn/wp-json/wp/v2'
const UPLOAD_PATTERN = /https?:\/\/(?:www\.)?sopat\.tn\/wp-content\/uploads\//

function isUploadUrl(url: string): boolean {
  return UPLOAD_PATTERN.test(url)
}

type Post = {
  id: number
  content: { rendered: string }
  excerpt: { rendered: string }
}

type Page = {
  id: number
  content: { rendered: string }
}

async function fetchAllPages<T>(path: string, perPage = 100): Promise<T[]> {
  const sep = path.includes('?') ? '&' : '?'
  const firstRes = await fetch(`${BASE_URL}${path}${sep}per_page=${perPage}&page=1`)
  if (!firstRes.ok) throw new Error(`HTTP ${firstRes.status}: ${path}`)
  const totalPages = Number(firstRes.headers.get('X-WP-TotalPages') ?? 1)
  const firstData = (await firstRes.json()) as T[]
  if (totalPages <= 1) return firstData

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      fetch(`${BASE_URL}${path}${sep}per_page=${perPage}&page=${i + 2}`).then((r) =>
        r.ok ? (r.json() as Promise<T[]>) : Promise.resolve([] as T[])
      )
    )
  )
  return [firstData, ...rest].flat()
}

// ── STRATEGY 1: src attributes ────────────────────────────────────────────────
function extractSrcUrls(html: string): string[] {
  const urls: string[] = []
  const re = /src=["'](https?:\/\/[^"'\s>]+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    if (isUploadUrl(m[1])) urls.push(m[1])
  }
  return urls
}

// ── STRATEGY 2: srcset attributes ────────────────────────────────────────────
function extractSrcsetUrls(html: string): string[] {
  const urls: string[] = []
  const srcsetRe = /srcset=["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = srcsetRe.exec(html)) !== null) {
    for (const entry of m[1].split(',')) {
      const url = entry.trim().split(/\s+/)[0]
      if (url && isUploadUrl(url)) urls.push(url)
    }
  }
  return urls
}

// ── STRATEGY 3: reconstruct size variants from known filenames ────────────────
function reconstructSizeVariants(urls: string[]): string[] {
  const generated: string[] = []
  // Match filenames that are NOT already a resized variant (no -WxH suffix)
  const originalRe = /^(https?:\/\/.+\/)([^/]+?)(\.[a-z]{2,4})$/i
  const sizedRe = /-\d+x\d+\.[a-z]{2,4}$/i

  for (const url of urls) {
    if (sizedRe.test(url)) continue // already a size variant, skip
    const m = originalRe.exec(url)
    if (!m) continue
    const [, base, name, ext] = m
    // Common WordPress auto-generated sizes
    for (const suffix of ['-150x150', '-300x169', '-300x200', '-300x220', '-768x432', '-1024x576', '-1024x683']) {
      generated.push(`${base}${name}${suffix}${ext}`)
    }
  }
  return generated
}

// ── STRATEGY 4: inline styles, data-src, data-background ─────────────────────
function extractInlineStyles(html: string): string[] {
  const urls: string[] = []
  const patterns = [
    /background-image:\s*url\(["']?(https?:\/\/[^"')>\s]+)["']?\)/gi,
    /data-src=["'](https?:\/\/[^"'\s>]+)["']/gi,
    /data-background=["'](https?:\/\/[^"'\s>]+)["']/gi,
    /data-bg=["'](https?:\/\/[^"'\s>]+)["']/gi,
    /data-lazy-src=["'](https?:\/\/[^"'\s>]+)["']/gi,
  ]
  for (const re of patterns) {
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) {
      if (isUploadUrl(m[1])) urls.push(m[1])
    }
  }
  return urls
}

// ── STRATEGY 5: /media?parent={id} per post/page ─────────────────────────────
async function fetchAttachmentsForParent(parentId: number): Promise<string[]> {
  const urls: string[] = []
  try {
    const res = await fetch(`${BASE_URL}/media?parent=${parentId}&per_page=100`)
    if (!res.ok) return urls
    const items = (await res.json()) as Array<{
      source_url?: string
      media_details?: { sizes?: Record<string, { source_url?: string }> }
    }>
    for (const item of items) {
      if (item.source_url && isUploadUrl(item.source_url)) urls.push(item.source_url)
      if (item.media_details?.sizes) {
        for (const size of Object.values(item.media_details.sizes)) {
          if (size.source_url && isUploadUrl(size.source_url)) urls.push(size.source_url)
        }
      }
    }
  } catch {
    // silently skip — parent may have no attachments
  }
  return urls
}

async function main() {
  console.log('Fetching all posts...')
  const posts = await fetchAllPages<Post>('/posts?_fields=id,content,excerpt')
  console.log(`  ${posts.length} posts`)

  console.log('Fetching all pages...')
  const pages = await fetchAllPages<Page>('/pages?status=publish&_fields=id,content')
  console.log(`  ${pages.length} pages`)

  const allHtml = [
    ...posts.map((p) => (p.content?.rendered ?? '') + (p.excerpt?.rendered ?? '')),
    ...pages.map((p) => p.content?.rendered ?? ''),
  ].join('\n')

  // Strategy 1
  const s1 = new Set(extractSrcUrls(allHtml))
  console.log(`\nStrategy 1 (src attrs):        ${s1.size} URLs`)

  // Strategy 2
  const s2 = new Set(extractSrcsetUrls(allHtml))
  console.log(`Strategy 2 (srcset attrs):     ${s2.size} URLs`)

  // Strategy 3 — reconstruct from originals found so far
  const knownOriginals = [...s1, ...s2]
  const s3 = new Set(reconstructSizeVariants(knownOriginals))
  console.log(`Strategy 3 (size variants):    ${s3.size} URLs (generated, not verified)`)

  // Strategy 4
  const s4 = new Set(extractInlineStyles(allHtml))
  console.log(`Strategy 4 (inline/data-src):  ${s4.size} URLs`)

  // Strategy 5 — per-post/page attachments
  console.log(`Strategy 5 (per-post /media?parent=...):`)
  const s5 = new Set<string>()
  const parentIds = [...posts.map((p) => p.id), ...pages.map((p) => p.id)]
  const attachmentResults = await Promise.all(parentIds.map(fetchAttachmentsForParent))
  for (const urls of attachmentResults) {
    for (const url of urls) s5.add(url)
  }
  console.log(`  ${s5.size} URLs from ${parentIds.length} parents`)

  // Merge strategies 1, 2, 4, 5 only — no generated variants
  const candidates = Array.from(new Set<string>([...s1, ...s2, ...s4, ...s5])).sort()

  console.log(`\nCollection summary:`)
  console.log(`  Strategy 1 - src attrs:           ${s1.size}`)
  console.log(`  Strategy 2 - srcset attrs:         ${s2.size}`)
  console.log(`  Strategy 3 - size variants:        ${s3.size} (excluded — generated)`)
  console.log(`  Strategy 4 - inline/data-src:      ${s4.size}`)
  console.log(`  Strategy 5 - per-post attachments: ${s5.size}`)
  console.log(`  ──────────────────────────────────`)
  console.log(`  Candidates to verify:              ${candidates.length}`)

  // HEAD-verify every URL
  console.log(`\nVerifying ${candidates.length} URLs with HEAD requests...`)
  const verified: string[] = []
  let checked = 0
  let removed = 0

  // Process in batches of 20 concurrent requests to avoid overwhelming the server
  const BATCH = 20
  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH)
    const results = await Promise.all(
      batch.map(async (url) => {
        try {
          const res = await fetch(url, { method: 'HEAD' })
          return res.ok
        } catch {
          return false
        }
      })
    )
    for (let j = 0; j < batch.length; j++) {
      checked++
      if (results[j]) {
        verified.push(batch[j])
      } else {
        removed++
      }
      if (checked % 100 === 0) {
        console.log(`  [${checked}/${candidates.length}] verified so far: ${verified.length} OK, ${removed} removed`)
      }
    }
  }

  const outPath = path.join(import.meta.dirname, 'image-urls.json')
  fs.writeFileSync(outPath, JSON.stringify(verified, null, 2), 'utf-8')

  console.log(`\nVerification results:`)
  console.log(`  Total checked:  ${checked}`)
  console.log(`  Verified (200): ${verified.length}`)
  console.log(`  Removed (404):  ${removed}`)
  console.log(`\nSaved to scripts/image-urls.json`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
