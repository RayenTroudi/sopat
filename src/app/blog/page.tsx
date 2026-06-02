import Nav from '@/components/Nav'
import { getAllBlogPosts, type BlogPost } from '@/lib/api'
import Image from 'next/image'
import Link from 'next/link'

const categoryColors: Record<string, { bg: string; text: string }> = {
  Distinction:  { bg: 'rgba(201,168,76,0.12)', text: 'rgba(160,128,40,1)' },
  Médias:       { bg: 'rgba(15,36,25,0.08)',   text: 'var(--green)' },
  Vision:       { bg: 'rgba(15,36,25,0.08)',   text: 'var(--green)' },
  International:{ bg: 'rgba(201,168,76,0.12)', text: 'rgba(160,128,40,1)' },
  RSE:          { bg: 'rgba(15,36,25,0.08)',   text: 'var(--green)' },
  Partenariats: { bg: 'rgba(201,168,76,0.12)', text: 'rgba(160,128,40,1)' },
  Actualités:   { bg: 'rgba(15,36,25,0.08)',   text: 'var(--green)' },
}

const FALLBACK_IMAGE = '/blog/ville-durable.jpeg'

function FeaturedCard({ post }: { post: BlogPost }) {
  const imgSrc = post.image ?? FALLBACK_IMAGE
  return (
    <Link
      href={`/blog/${post.slug}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, background: 'var(--green)', minHeight: '480px' }}
        className="featured-card"
      >
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: '340px' }}>
          <Image
            src={imgSrc}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{ objectFit: 'cover' }}
            priority
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, rgba(15,36,25,0.4) 100%)' }} />
        </div>
        <div style={{ padding: 'clamp(32px, 5vw, 56px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', background: 'rgba(201,168,76,0.2)', color: 'rgba(201,168,76,0.9)', padding: '4px 10px', fontWeight: 300 }}>{post.category}</span>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', color: 'rgba(245,240,232,0.35)', fontWeight: 300 }}>{post.date}</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 300, color: 'var(--ivory)', lineHeight: 1.15, margin: '0 0 20px' }}>{post.title}</h2>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', lineHeight: 1.8, color: 'rgba(245,240,232,0.58)', fontWeight: 300, margin: '0 0 28px' }}>{post.excerpt}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '20px', height: '1px', background: 'var(--gold)' }} />
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.75)', fontWeight: 300 }}>Lire l&apos;article</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function PostCard({ post }: { post: BlogPost }) {
  const imgSrc = post.image ?? FALLBACK_IMAGE
  return (
    <Link
      href={`/blog/${post.slug}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div style={{ background: '#fff', height: '100%' }}>
        <div style={{ position: 'relative', height: '220px', overflow: 'hidden', background: 'var(--green)' }}>
          <Image
            src={imgSrc}
            alt={post.title}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 33vw"
            style={{ objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', top: '14px', left: '14px', background: 'rgba(15,36,25,0.72)', backdropFilter: 'blur(6px)', padding: '4px 10px' }}>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.85)', fontWeight: 300 }}>{post.category}</span>
          </div>
        </div>
        <div style={{ padding: '24px 24px 28px' }}>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', color: 'rgba(42,42,42,0.38)', fontWeight: 300, marginBottom: '10px' }}>{post.date}</p>
          <h3 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(18px, 2vw, 22px)', fontWeight: 300, color: 'var(--green)', lineHeight: 1.2, margin: '0 0 12px' }}>{post.title}</h3>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', lineHeight: 1.75, color: 'rgba(42,42,42,0.58)', fontWeight: 300, margin: '0 0 20px' }}>{post.excerpt}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '1px', background: 'var(--gold)' }} />
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(42,42,42,0.4)', fontWeight: 300 }}>Lire l&apos;article</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export const revalidate = 3600

export default async function BlogPage() {
  const posts = await getAllBlogPosts().catch(() => [] as BlogPost[])
  const featured = posts[0]
  const rest = posts.slice(1)

  return (
    <>
      <Nav />
      <main>
        {/* Hero */}
        <section
          className="texture-overlay"
          style={{
            position: 'relative',
            minHeight: '52svh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            overflow: 'hidden',
            background: 'linear-gradient(155deg, var(--green) 0%, var(--green-dark) 100%)',
          }}
        >
          <Image
            src="/blog/ville-durable.jpeg"
            alt="SOPAT Blog"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: 'cover', objectPosition: 'center 35%', opacity: 0.22, mixBlendMode: 'luminosity' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,36,25,0.88) 0%, transparent 60%)', pointerEvents: 'none' }} />

          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(120px, 16vw, 180px) 24px clamp(48px, 6vw, 72px)', position: 'relative', zIndex: 1, width: '100%' }}>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 300, color: 'rgba(201,168,76,0.85)', marginBottom: '16px' }}>
              Actualités &amp; Insights
            </p>
            <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(44px, 7vw, 80px)', fontWeight: 300, lineHeight: 1, color: 'var(--ivory)', margin: 0 }}>
              Le <span style={{ color: 'var(--gold)' }}>Blog</span> SOPAT
            </h1>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', lineHeight: 1.8, color: 'rgba(245,240,232,0.6)', fontWeight: 300, maxWidth: '480px', marginTop: '20px' }}>
              {posts.length} article{posts.length !== 1 ? 's' : ''} — distinctions, engagements internationaux et vision durable.
            </p>
          </div>
        </section>

        {/* Featured post */}
        {featured && (
          <section style={{ background: 'var(--ivory)', paddingTop: 'clamp(48px, 6vw, 72px)' }}>
            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(42,42,42,0.35)', fontWeight: 300, marginBottom: '20px' }}>À la une</p>
              <FeaturedCard post={featured} />
            </div>
          </section>
        )}

        {/* Grid */}
        {rest.length > 0 && (
          <section style={{ background: 'var(--ivory)', padding: 'clamp(48px, 6vw, 80px) 0 clamp(64px, 10vw, 120px)' }}>
            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
              <div style={{ height: '1px', background: 'rgba(42,42,42,0.08)', marginBottom: 'clamp(40px, 5vw, 56px)' }} />
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(42,42,42,0.35)', fontWeight: 300, marginBottom: '28px' }}>Tous les articles</p>
              <div className="blog-grid">
                {rest.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Footer bar */}
        <div style={{ borderTop: '1px solid rgba(42,42,42,0.1)', background: 'var(--mist)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', fontWeight: 300, letterSpacing: '0.08em', color: 'rgba(42,42,42,0.45)' }}>
              © {new Date().getFullYear()} SOPAT · Société de Paysage de Tunisie
            </span>
            <a
              href="/"
              style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(42,42,42,0.4)', textDecoration: 'none', fontWeight: 300 }}
            >
              ← Retour à l&apos;accueil
            </a>
          </div>
        </div>
      </main>

      <style>{`
        .featured-card {
          grid-template-columns: 1fr 1fr;
        }
        @media (max-width: 767px) {
          .featured-card {
            grid-template-columns: 1fr !important;
          }
        }
        .blog-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 3px;
        }
        @media (min-width: 600px) {
          .blog-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (min-width: 1024px) {
          .blog-grid { grid-template-columns: 1fr 1fr 1fr; }
        }
      `}</style>
    </>
  )
}
