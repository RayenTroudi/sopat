import type { Metadata } from 'next'
import { getPosts, getMediaById } from '@/lib/api'
import type { WPMedia } from '@/lib/api'
import WpNavbar from '@/components/WpNavbar'
import WpFooter from '@/components/WpFooter'
import PostCard from '@/components/PostCard'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Blog — SOPAT',
  description: 'Actualités, insights et distinctions de SOPAT, leader de l\'ingénierie paysagère en Tunisie.',
}

export default async function PostsPage() {
  const posts = await getPosts({ perPage: 12 }).catch(() => [])

  const mediaMap: Record<number, WPMedia> = {}
  await Promise.all(
    posts
      .filter((p) => p.featured_media)
      .map(async (p) => {
        const media = await getMediaById(p.featured_media)
        if (media) mediaMap[p.featured_media] = media
      }),
  )

  const [featured, ...rest] = posts

  return (
    <>
      <WpNavbar />
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
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,36,25,0.88) 0%, transparent 60%)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(120px,16vw,180px) 24px clamp(48px,6vw,72px)', position: 'relative', zIndex: 1, width: '100%' }}>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 300, color: 'rgba(201,168,76,0.85)', marginBottom: '16px' }}>
              Actualités &amp; Insights
            </p>
            <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(44px,7vw,80px)', fontWeight: 300, lineHeight: 1, color: 'var(--ivory)', margin: 0 }}>
              Le <span style={{ color: 'var(--gold)' }}>Blog</span> SOPAT
            </h1>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', lineHeight: 1.8, color: 'rgba(245,240,232,0.6)', fontWeight: 300, maxWidth: '480px', marginTop: '20px' }}>
              Distinctions, engagements internationaux et vision durable — suivez l&apos;actualité de SOPAT.
            </p>
          </div>
        </section>

        {/* Featured post */}
        {featured && (
          <section style={{ background: 'var(--ivory)', paddingTop: 'clamp(48px,6vw,72px)' }}>
            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(42,42,42,0.35)', fontWeight: 300, marginBottom: '20px' }}>
                À la une
              </p>
              <PostCard post={featured} media={mediaMap[featured.featured_media] ?? null} featured />
            </div>
          </section>
        )}

        {/* Post grid */}
        {rest.length > 0 && (
          <section style={{ background: 'var(--ivory)', padding: 'clamp(48px,6vw,80px) 0 clamp(64px,10vw,120px)' }}>
            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
              <div style={{ height: '1px', background: 'rgba(42,42,42,0.08)', marginBottom: 'clamp(40px,5vw,56px)' }} />
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(42,42,42,0.35)', fontWeight: 300, marginBottom: '28px' }}>
                Tous les articles
              </p>
              <div className="blog-grid">
                {rest.map((post) => (
                  <PostCard key={post.id} post={post} media={mediaMap[post.featured_media] ?? null} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <WpFooter />

      <style>{`
        .featured-post-card { grid-template-columns: 1fr 1fr; }
        @media (max-width: 767px) { .featured-post-card { grid-template-columns: 1fr !important; } }
        .blog-grid { display: grid; grid-template-columns: 1fr; gap: 3px; }
        @media (min-width: 600px) { .blog-grid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1024px) { .blog-grid { grid-template-columns: 1fr 1fr 1fr; } }
      `}</style>
    </>
  )
}
