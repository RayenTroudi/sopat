import Nav from '@/components/Nav'
import { getBlogPostBySlug, getAllBlogPosts, sanitizeHtml, proxyContentImages } from '@/lib/api'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 3600

export async function generateStaticParams() {
  const posts = await getAllBlogPosts()
  return posts.map((p) => ({ slug: p.slug }))
}

const FALLBACK_IMAGE = '/blog/ville-durable.jpeg'

const categoryColors: Record<string, string> = {
  Distinction:   'rgba(201,168,76,0.85)',
  Médias:        'var(--gold)',
  Vision:        'var(--gold)',
  International: 'rgba(201,168,76,0.85)',
  RSE:           'var(--gold)',
  Partenariats:  'rgba(201,168,76,0.85)',
  Actualités:    'var(--gold)',
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)
  if (!post) notFound()

  const imgSrc = post.image ?? FALLBACK_IMAGE
  const safeContent = sanitizeHtml(proxyContentImages(post.content))
  const catColor = categoryColors[post.category] ?? 'var(--gold)'

  return (
    <>
      <Nav />
      <main>
        {/* Hero */}
        <section
          className="texture-overlay"
          style={{
            position: 'relative',
            minHeight: '58svh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            overflow: 'hidden',
            background: 'linear-gradient(155deg, var(--green) 0%, var(--green-dark) 100%)',
          }}
        >
          <Image
            src={imgSrc}
            alt={post.title}
            fill
            priority
            sizes="100vw"
            style={{ objectFit: 'cover', objectPosition: 'center 40%', opacity: 0.32, mixBlendMode: 'luminosity' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,36,25,0.92) 0%, rgba(15,36,25,0.2) 55%, transparent 100%)', pointerEvents: 'none' }} />

          <div style={{ maxWidth: '860px', margin: '0 auto', padding: 'clamp(120px, 16vw, 180px) 24px clamp(48px, 6vw, 72px)', position: 'relative', zIndex: 1, width: '100%' }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <Link href="/blog" style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.45)', textDecoration: 'none', fontWeight: 300 }}>Blog</Link>
              <span style={{ color: 'rgba(245,240,232,0.25)', fontSize: '10px' }}>›</span>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: catColor, fontWeight: 300 }}>{post.category}</span>
            </div>

            <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 300, lineHeight: 1.1, color: 'var(--ivory)', margin: '0 0 20px' }}>
              {post.title}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(245,240,232,0.45)', fontWeight: 300 }}>{post.date}</span>
              <div style={{ width: '1px', height: '12px', background: 'rgba(245,240,232,0.2)' }} />
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', background: 'rgba(201,168,76,0.2)', color: catColor, padding: '4px 10px', fontWeight: 300 }}>{post.category}</span>
            </div>
          </div>
        </section>

        {/* Article body */}
        <section style={{ background: 'var(--ivory)', padding: 'clamp(48px, 7vw, 96px) 0 clamp(64px, 10vw, 120px)' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 24px' }}>

            {/* Excerpt lead */}
            <p style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(18px, 2.2vw, 24px)', fontWeight: 300, fontStyle: 'italic', lineHeight: 1.6, color: 'var(--green)', borderLeft: '2px solid var(--gold)', paddingLeft: '24px', marginBottom: 'clamp(40px, 5vw, 64px)' }}>
              {post.excerpt}
            </p>

            {/* Rendered WP content */}
            <div
              className="wp-content"
              dangerouslySetInnerHTML={{ __html: safeContent }}
            />

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(42,42,42,0.1)', margin: 'clamp(48px, 6vw, 80px) 0 clamp(32px, 4vw, 48px)' }} />

            {/* Back link */}
            <Link
              href="/blog"
              style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--green)', textDecoration: 'none', fontWeight: 300, display: 'inline-flex', alignItems: 'center', gap: '10px' }}
            >
              <span style={{ fontSize: '14px' }}>←</span> Tous les articles
            </Link>
          </div>
        </section>

        {/* Footer bar */}
        <div style={{ borderTop: '1px solid rgba(42,42,42,0.1)', background: 'var(--mist)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', fontWeight: 300, letterSpacing: '0.08em', color: 'rgba(42,42,42,0.45)' }}>
              © {new Date().getFullYear()} SOPAT · Société de Paysage de Tunisie
            </span>
            <Link href="/blog" style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(42,42,42,0.4)', textDecoration: 'none', fontWeight: 300 }}>
              ← Retour au blog
            </Link>
          </div>
        </div>
      </main>

      <style>{`
        .wp-content {
          font-family: var(--font-inter), sans-serif;
          font-weight: 300;
          color: rgba(42,42,42,0.78);
          line-height: 1.85;
        }
        .wp-content p {
          font-size: 15px;
          margin: 0 0 1.4em;
        }
        .wp-content p:empty { display: none; }
        .wp-content h2 {
          font-family: var(--font-cormorant), serif;
          font-size: clamp(22px, 2.8vw, 32px);
          font-weight: 300;
          color: var(--green);
          line-height: 1.2;
          margin: 2.2em 0 0.8em;
        }
        .wp-content h3 {
          font-family: var(--font-cormorant), serif;
          font-size: clamp(18px, 2.2vw, 26px);
          font-weight: 300;
          color: var(--green);
          line-height: 1.2;
          margin: 1.8em 0 0.6em;
        }
        .wp-content h4, .wp-content h5, .wp-content h6 {
          font-family: var(--font-inter), sans-serif;
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(42,42,42,0.55);
          margin: 1.6em 0 0.5em;
        }
        .wp-content strong, .wp-content b {
          font-weight: 500;
          color: rgba(42,42,42,0.9);
        }
        .wp-content em, .wp-content i { font-style: italic; }
        .wp-content a {
          color: var(--green);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .wp-content ul, .wp-content ol {
          padding-left: 1.6em;
          margin: 0 0 1.4em;
        }
        .wp-content li { margin-bottom: 0.4em; font-size: 15px; }
        .wp-content blockquote {
          border-left: 2px solid var(--gold);
          padding-left: 20px;
          margin: 2em 0;
          font-family: var(--font-cormorant), serif;
          font-size: clamp(18px, 2vw, 22px);
          font-style: italic;
          color: var(--green);
        }
        .wp-content figure {
          margin: 2em 0;
        }
        .wp-content figure img {
          width: 100%;
          height: auto;
          display: block;
        }
        .wp-content figcaption {
          font-size: 11px;
          color: rgba(42,42,42,0.4);
          text-align: center;
          margin-top: 8px;
          letter-spacing: 0.06em;
        }
        .wp-content img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1.5em auto;
        }
        /* Hide empty Elementor wrappers for legacy posts */
        .wp-content .elementor-widget-container > div:empty,
        .wp-content .elementor-spacer { display: none; }
        .wp-content .elementor-widget-container {
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
          color: inherit;
        }
      `}</style>
    </>
  )
}
