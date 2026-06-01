import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getPageBySlug, getAllPageSlugs, getMediaById, formatDate, sanitizeHtml, stripHtml, proxyContentImages } from '@/lib/api'
import WpNavbar from '@/components/WpNavbar'
import WpFooter from '@/components/WpFooter'

export const revalidate = 3600

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = true

export async function generateStaticParams() {
  try {
    const slugs = await getAllPageSlugs()
    return slugs.map((slug) => ({ slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await getPageBySlug(slug)
  if (!page) return { title: 'Page introuvable — SOPAT' }

  const title = page.yoast_head_json?.title ?? stripHtml(page.title.rendered) + ' — SOPAT'
  const description = page.yoast_head_json?.description ?? stripHtml(page.excerpt.rendered).slice(0, 160)

  return { title, description }
}

export default async function WpPage({ params }: Props) {
  const { slug } = await params
  const page = await getPageBySlug(slug)
  if (!page) notFound()

  const media = page.featured_media ? await getMediaById(page.featured_media) : null
  const rawImgSrc = media?.source_url ?? null
  const imgSrc = rawImgSrc ? `/api/image?url=${encodeURIComponent(rawImgSrc)}` : null
  const imgAlt = media?.alt_text || stripHtml(page.title.rendered)

  return (
    <>
      <WpNavbar />
      <main>
        {/* Hero */}
        <section
          style={{
            position: 'relative',
            minHeight: imgSrc ? '50svh' : '35svh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            overflow: 'hidden',
            background: 'var(--green)',
          }}
        >
          {imgSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgSrc}
              alt={imgAlt}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', opacity: 0.3, mixBlendMode: 'luminosity' as const }}
            />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,36,25,0.92) 0%, transparent 60%)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: '860px', margin: '0 auto', padding: 'clamp(100px,14vw,160px) 24px clamp(40px,5vw,60px)', position: 'relative', zIndex: 1, width: '100%' }}>
            <h1
              style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(32px,5vw,58px)', fontWeight: 300, lineHeight: 1.1, color: 'var(--ivory)', margin: 0 }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.title.rendered) }}
            />
          </div>
        </section>

        {/* Content */}
        <article style={{ background: 'var(--ivory)', padding: 'clamp(48px,7vw,88px) 24px' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <div
              className="wp-content"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(proxyContentImages(page.content.rendered)) }}
            />
            <div style={{ marginTop: 'clamp(40px,6vw,64px)', paddingTop: '24px', borderTop: '1px solid rgba(42,42,42,0.1)' }}>
              <Link
                href="/"
                style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--green)', textDecoration: 'none', fontWeight: 300, display: 'inline-flex', alignItems: 'center', gap: '10px' }}
              >
                <span style={{ display: 'inline-block', width: '20px', height: '1px', background: 'var(--gold)' }} />
                Retour à l&apos;accueil
              </Link>
            </div>
          </div>
        </article>
      </main>
      <WpFooter />

      <style>{`
        .wp-content { font-family: var(--font-inter), sans-serif; font-weight: 300; color: var(--charcoal); }
        .wp-content p { font-size: 16px; line-height: 1.85; margin: 0 0 1.4em; }
        .wp-content h1, .wp-content h2, .wp-content h3, .wp-content h4 {
          font-family: var(--font-cormorant), serif;
          font-weight: 300;
          color: var(--green);
          line-height: 1.15;
          margin: 1.8em 0 0.6em;
        }
        .wp-content h2 { font-size: clamp(24px, 3vw, 34px); }
        .wp-content h3 { font-size: clamp(20px, 2.5vw, 26px); }
        .wp-content a { color: var(--green); transition: color 0.3s; }
        .wp-content a:hover { color: var(--gold); }
        .wp-content ul, .wp-content ol { padding-left: 1.5em; margin: 0 0 1.4em; }
        .wp-content li { font-size: 15px; line-height: 1.8; margin-bottom: 0.4em; }
        .wp-content blockquote {
          margin: 2em 0;
          padding: 20px 24px;
          border-left: 3px solid var(--gold);
          background: var(--mist);
          font-family: var(--font-cormorant), serif;
          font-size: clamp(18px, 2.5vw, 22px);
          font-style: italic;
          color: var(--green);
        }
        .wp-content figure { margin: 2em 0; }
        .wp-content figure img { width: 100%; height: auto; display: block; }
        .wp-content figcaption { font-size: 12px; color: rgba(42,42,42,0.45); text-align: center; margin-top: 8px; }
        .wp-content img { max-width: 100%; height: auto; }
        .wp-content strong { font-weight: 500; }
        .wp-content pre { background: var(--mist); padding: 16px; overflow-x: auto; font-size: 13px; }
      `}</style>
    </>
  )
}
