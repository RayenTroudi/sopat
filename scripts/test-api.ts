/**
 * Audits all WordPress REST API endpoints.
 * Run with: npx tsx scripts/test-api.ts
 */

const BASE_URL = 'https://www.sopat.tn/wp-json/wp/v2'

type FetchResult<T> = {
  data: T[]
  total: number
  totalPages: number
}

async function fetchAllPages<T>(endpoint: string, perPage = 100): Promise<FetchResult<T>> {
  const firstRes = await fetch(`${BASE_URL}${endpoint}&per_page=${perPage}&page=1`)
  if (!firstRes.ok) throw new Error(`HTTP ${firstRes.status}`)
  const total = Number(firstRes.headers.get('X-WP-Total') ?? 0)
  const totalPages = Number(firstRes.headers.get('X-WP-TotalPages') ?? 1)
  const firstData = (await firstRes.json()) as T[]

  if (totalPages <= 1) return { data: firstData, total, totalPages }

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      fetch(`${BASE_URL}${endpoint}&per_page=${perPage}&page=${i + 2}`).then((r) =>
        r.ok ? (r.json() as Promise<T[]>) : Promise.resolve([] as T[])
      )
    )
  )
  return { data: [firstData, ...rest].flat(), total, totalPages }
}

function extractImageUrls(html: string): string[] {
  const urls: string[] = []
  const re = /src=["'](https?:\/\/(?:www\.)?sopat\.tn\/wp-content\/uploads\/[^"'\s>]+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) urls.push(m[1])
  return urls
}

function warn(msg: string) {
  console.warn(`  ⚠️  ${msg}`)
}

function ok(msg: string) {
  console.log(`  ✅ ${msg}`)
}

async function main() {
  let hasWarning = false

  // ── POSTS ──────────────────────────────────────────────────────────────────
  console.log('\n── POSTS ──')
  try {
    const result = await fetchAllPages<{
      id: number; slug: string; date: string
      title: { rendered: string }; content: { rendered: string }; excerpt: { rendered: string }
      featured_media: number; categories: number[]; tags: number[]
    }>('/posts?_fields=id,slug,date,title,content,excerpt,featured_media,categories,tags')

    if (result.data.length === 0) { warn('No posts returned'); hasWarning = true }
    else ok(`${result.data.length} posts fetched (X-WP-Total: ${result.total}, pages: ${result.totalPages})`)

    if (result.data.length !== result.total) {
      warn(`Count mismatch: fetched ${result.data.length}, header says ${result.total}`)
      hasWarning = true
    }

    // Detect content types
    const elementorPosts = result.data.filter((p) =>
      p.content.rendered.includes('data-elementor-type=') ||
      p.content.rendered.includes('elementor-widget-container')
    )
    const blockPosts = result.data.filter((p) => !elementorPosts.includes(p))
    ok(`Content types: ${blockPosts.length} block posts, ${elementorPosts.length} Elementor posts`)

    // Sample: newest block post
    const newestBlock = blockPosts.sort((a, b) => b.date.localeCompare(a.date))[0]
    if (newestBlock) {
      ok(`Sample block post: "${newestBlock.title.rendered}" (${newestBlock.slug})`)
      const contentLen = newestBlock.content.rendered.length
      ok(`  content.rendered length: ${contentLen} chars`)
      if (contentLen < 100) { warn('Block post content seems truncated'); hasWarning = true }
    }

    // Sample: oldest elementor post
    const oldestElementor = elementorPosts.sort((a, b) => a.date.localeCompare(b.date))[0]
    if (oldestElementor) {
      ok(`Sample Elementor post: "${oldestElementor.title.rendered}" (${oldestElementor.slug})`)
    }

    // Posts with no featured image
    const noFeatured = result.data.filter((p) => !p.featured_media)
    ok(`Posts with no featured_media: ${noFeatured.length}`)
  } catch (e) {
    warn(`POSTS endpoint failed: ${e}`); hasWarning = true
  }

  // ── PAGES ──────────────────────────────────────────────────────────────────
  console.log('\n── PAGES ──')
  try {
    const result = await fetchAllPages<{ id: number; slug: string; title: { rendered: string }; content: { rendered: string } }>(
      '/pages?status=publish&_fields=id,slug,title,content'
    )
    if (result.data.length === 0) { warn('No pages returned'); hasWarning = true }
    else ok(`${result.data.length} pages (X-WP-Total: ${result.total})`)
    const slugs = result.data.map((p) => p.slug).join(', ')
    ok(`Page slugs: ${slugs}`)
  } catch (e) {
    warn(`PAGES endpoint failed: ${e}`); hasWarning = true
  }

  // ── MEDIA ──────────────────────────────────────────────────────────────────
  console.log('\n── MEDIA ──')
  try {
    const result = await fetchAllPages<{ id: number; source_url: string; alt_text: string }>(
      '/media?_fields=id,source_url,alt_text'
    )
    if (result.data.length === 0) { warn('No media returned'); hasWarning = true }
    else ok(`${result.data.length} media items (X-WP-Total: ${result.total}, pages: ${result.totalPages})`)
    const noAlt = result.data.filter((m) => !m.alt_text)
    if (noAlt.length) ok(`Media items missing alt_text: ${noAlt.length}`)
  } catch (e) {
    warn(`MEDIA endpoint returned error (${e}) — WordPress may restrict this endpoint`)
    hasWarning = true
  }

  // ── CATEGORIES ─────────────────────────────────────────────────────────────
  console.log('\n── CATEGORIES ──')
  try {
    const result = await fetchAllPages<{ id: number; name: string; slug: string; count: number }>(
      '/categories?_fields=id,name,slug,count'
    )
    if (result.data.length === 0) { warn('No categories returned'); hasWarning = true }
    else ok(`${result.data.length} categories`)
    for (const cat of result.data) console.log(`    id=${cat.id} slug=${cat.slug} count=${cat.count}`)
  } catch (e) {
    warn(`CATEGORIES endpoint failed: ${e}`); hasWarning = true
  }

  // ── TAGS ───────────────────────────────────────────────────────────────────
  console.log('\n── TAGS ──')
  try {
    const result = await fetchAllPages<{ id: number; name: string; slug: string; count: number }>(
      '/tags?_fields=id,name,slug,count'
    )
    if (result.data.length === 0) { warn('No tags returned'); hasWarning = true }
    else ok(`${result.data.length} tags`)
    for (const tag of result.data) console.log(`    id=${tag.id} slug=${tag.slug} count=${tag.count}`)
  } catch (e) {
    warn(`TAGS endpoint failed: ${e}`); hasWarning = true
  }

  // ── USERS ──────────────────────────────────────────────────────────────────
  console.log('\n── USERS ──')
  try {
    const result = await fetchAllPages<{ id: number; name: string; slug: string }>(
      '/users?_fields=id,name,slug'
    )
    if (result.data.length === 0) { warn('No users returned'); hasWarning = true }
    else ok(`${result.data.length} users`)
    for (const u of result.data) console.log(`    id=${u.id} name=${u.name} slug=${u.slug}`)
  } catch (e) {
    warn(`USERS endpoint failed: ${e}`); hasWarning = true
  }

  // ── IMAGE URL EXTRACTION ────────────────────────────────────────────────────
  console.log('\n── IMAGE URLs ──')
  try {
    const [postsResult, pagesResult] = await Promise.all([
      fetchAllPages<{ content: { rendered: string }; excerpt: { rendered: string } }>(
        '/posts?_fields=content,excerpt'
      ),
      fetchAllPages<{ content: { rendered: string } }>('/pages?status=publish&_fields=content'),
    ])

    const urlSet = new Set<string>()
    for (const post of postsResult.data) {
      for (const url of extractImageUrls(post.content?.rendered ?? '')) urlSet.add(url)
      for (const url of extractImageUrls(post.excerpt?.rendered ?? '')) urlSet.add(url)
    }
    for (const page of pagesResult.data) {
      for (const url of extractImageUrls(page.content?.rendered ?? '')) urlSet.add(url)
    }

    // Try media endpoint but don't fail if it errors
    try {
      const mediaResult = await fetchAllPages<{ source_url: string; media_details?: { sizes?: Record<string, { source_url: string }> } }>(
        '/media?_fields=source_url,media_details'
      )
      for (const item of mediaResult.data) {
        if (item.source_url) urlSet.add(item.source_url)
        if (item.media_details?.sizes) {
          for (const size of Object.values(item.media_details.sizes)) {
            if (size.source_url) urlSet.add(size.source_url)
          }
        }
      }
    } catch {
      ok('Media library skipped (endpoint unavailable), URLs from post/page content only')
    }

    ok(`${urlSet.size} unique wp-content/uploads image URLs found`)
    if (urlSet.size === 0) { warn('No image URLs found — check content parsing'); hasWarning = true }
  } catch (e) {
    warn(`Image URL extraction failed: ${e}`); hasWarning = true
  }

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  console.log('\n────────────────────────────────────────')
  if (hasWarning) {
    console.log('Audit complete with warnings. Review ⚠️  items above.')
  } else {
    console.log('✅ All endpoints OK. No warnings.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
