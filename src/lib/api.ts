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
  createdAt: Date; featuredImage: string | null
  parent: number; menuOrder: number; status: string
}): WPPage {
  return {
    id: row.id,
    slug: row.slug,
    date: row.createdAt.toISOString(),
    modified: row.createdAt.toISOString(),
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
