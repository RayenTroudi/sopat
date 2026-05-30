import DOMPurify from 'isomorphic-dompurify'

const BASE_URL = 'https://sopat.tn/wp-json/wp/v2'

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

async function wpFetch<T>(path: string, revalidate = 3600): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    next: { revalidate },
  })
  if (!res.ok) throw new Error(`WordPress API error: ${res.status} ${path}`)
  return res.json() as Promise<T>
}

export async function getPosts(params: {
  perPage?: number
  page?: number
  sticky?: boolean
} = {}): Promise<WPPost[]> {
  const { perPage = 10, page = 1 } = params
  const query = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
    _fields: 'id,slug,date,title,excerpt,content,featured_media,categories,tags,yoast_head_json',
  })
  if (params.sticky !== undefined) query.set('sticky', String(params.sticky))
  return wpFetch<WPPost[]>(`/posts?${query}`)
}

export async function getAllPostSlugs(): Promise<string[]> {
  const posts = await wpFetch<Pick<WPPost, 'slug'>[]>(
    '/posts?per_page=100&_fields=slug',
    86400,
  )
  return posts.map((p) => p.slug)
}

export async function getPostBySlug(slug: string): Promise<WPPost | null> {
  const results = await wpFetch<WPPost[]>(
    `/posts?slug=${encodeURIComponent(slug)}&_fields=id,slug,date,modified,title,content,excerpt,featured_media,categories,yoast_head_json`,
  )
  return results[0] ?? null
}

export async function getPages(perPage = 20): Promise<WPPage[]> {
  return wpFetch<WPPage[]>(
    `/pages?per_page=${perPage}&status=publish&_fields=id,slug,title,excerpt,content,featured_media,parent,menu_order,yoast_head_json`,
  )
}

export async function getAllPageSlugs(): Promise<string[]> {
  const pages = await wpFetch<Pick<WPPage, 'slug'>[]>(
    '/pages?per_page=100&status=publish&_fields=slug',
    86400,
  )
  return pages.map((p) => p.slug)
}

export async function getPageBySlug(slug: string): Promise<WPPage | null> {
  const results = await wpFetch<WPPage[]>(
    `/pages?slug=${encodeURIComponent(slug)}&status=publish&_fields=id,slug,title,content,excerpt,featured_media,parent,yoast_head_json`,
  )
  return results[0] ?? null
}

export async function getMediaById(id: number): Promise<WPMedia | null> {
  if (!id) return null
  try {
    return await wpFetch<WPMedia>(`/media/${id}?_fields=id,source_url,alt_text,title,media_details`)
  } catch {
    return null
  }
}

export async function getCategories(): Promise<WPCategory[]> {
  return wpFetch<WPCategory[]>('/categories?per_page=50&_fields=id,name,slug,count', 86400)
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

function extractFirstContentImage(html: string): string | null {
  const match = html.match(/src="(https:\/\/www\.sopat\.tn\/wp-content\/uploads\/[^"]+\.(?:jpg|jpeg|png|webp))"/)
  return match?.[1] ?? null
}

async function resolvePostImage(post: WPPost): Promise<string | null> {
  if (post.featured_media) {
    const media = await getMediaById(post.featured_media)
    if (media?.source_url) return media.source_url
  }
  const firstImg = extractFirstContentImage(post.content?.rendered ?? '')
  return firstImg
}

export async function getBlogPostBySlug(slug: string): Promise<(BlogPost & { content: string }) | null> {
  const results = await wpFetch<WPPost[]>(
    `/posts?slug=${encodeURIComponent(slug)}&_fields=id,slug,date,title,excerpt,content,featured_media,link`,
  )
  const post = results[0]
  if (!post) return null
  const title = stripHtml(post.title.rendered)
  const excerpt = stripHtml(post.excerpt.rendered)
  const image = await resolvePostImage(post)
  return {
    id: post.id,
    slug: post.slug,
    date: formatDate(post.date),
    title,
    excerpt,
    image,
    externalUrl: post.link,
    category: inferBlogCategory(title, excerpt),
    content: post.content.rendered,
  }
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const firstPage = await fetch(`${BASE_URL}/posts?per_page=10&page=1&_fields=id,slug,date,title,excerpt,content,featured_media,link`, {
    next: { revalidate: 3600 },
  })
  if (!firstPage.ok) throw new Error(`WordPress API error: ${firstPage.status}`)

  const totalPages = Number(firstPage.headers.get('X-WP-TotalPages') ?? 1)
  const firstData = await firstPage.json() as WPPost[]

  const remaining: WPPost[] = []
  for (let page = 2; page <= totalPages; page++) {
    const res = await fetch(`${BASE_URL}/posts?per_page=10&page=${page}&_fields=id,slug,date,title,excerpt,content,featured_media,link`, {
      next: { revalidate: 3600 },
    })
    if (res.ok) {
      const data = await res.json() as WPPost[]
      remaining.push(...data)
    }
  }

  const allWPPosts = [...firstData, ...remaining]

  const blogPosts = await Promise.all(
    allWPPosts.map(async (post): Promise<BlogPost> => {
      const title = stripHtml(post.title.rendered)
      const excerpt = stripHtml(post.excerpt.rendered)
      const image = await resolvePostImage(post)
      return {
        id: post.id,
        slug: post.slug,
        date: formatDate(post.date),
        title,
        excerpt,
        image,
        externalUrl: post.link,
        category: inferBlogCategory(title, excerpt),
      }
    })
  )

  return blogPosts
}

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

const WP_UPLOAD_ORIGIN = 'https://www.sopat.tn'

function proxyUrl(src: string): string {
  if (!src.startsWith(WP_UPLOAD_ORIGIN)) return src
  return `/api/image?url=${encodeURIComponent(src)}`
}

export function proxyContentImages(html: string): string {
  // Rewrite src="..." for wp-content images
  let out = html.replace(
    /(<img[^>]+\s)src=["'](https:\/\/www\.sopat\.tn\/wp-content\/[^"']+)["']/g,
    (_, prefix, src) => `${prefix}src="${proxyUrl(src)}"`,
  )
  // Rewrite srcset="..." — each entry is "url width" separated by commas
  out = out.replace(
    /(<img[^>]+\s)srcset=["']([^"']+)["']/g,
    (_, prefix, srcset) => {
      const rewritten = srcset
        .split(',')
        .map((entry: string) => {
          const [url, descriptor] = entry.trim().split(/\s+/)
          const proxied = proxyUrl(url)
          return descriptor ? `${proxied} ${descriptor}` : proxied
        })
        .join(', ')
      return `${prefix}srcset="${rewritten}"`
    },
  )
  return out
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
