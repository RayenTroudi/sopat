import Link from 'next/link'
import { getPosts, getMediaById } from '@/lib/api'
import type { WPMedia } from '@/lib/api'
import PostCard from '@/components/PostCard'

export default async function LatestPosts() {
  let posts: Awaited<ReturnType<typeof getPosts>> = []
  const mediaMap: Record<number, WPMedia> = {}

  try {
    posts = await getPosts({ perPage: 3 })
    await Promise.all(
      posts
        .filter((p) => p.featured_media)
        .map(async (p) => {
          const media = await getMediaById(p.featured_media)
          if (media) mediaMap[p.featured_media] = media
        }),
    )
  } catch {
    return null
  }

  if (!posts.length) return null

  return (
    <section style={{ background: 'var(--ivory)', padding: 'clamp(64px,8vw,100px) 0' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 'clamp(32px,4vw,48px)', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.85)', fontWeight: 300, marginBottom: '12px' }}>
              Actualités
            </p>
            <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(32px,4vw,48px)', fontWeight: 300, color: 'var(--green)', margin: 0, lineHeight: 1.1 }}>
              Derniers articles
            </h2>
          </div>
          <Link
            href="/posts"
            style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--green)', textDecoration: 'none', fontWeight: 300, display: 'flex', alignItems: 'center', gap: '8px', transition: 'color 0.3s' }}
          >
            Voir tous les articles
            <span style={{ display: 'inline-block', width: '20px', height: '1px', background: 'var(--gold)' }} />
          </Link>
        </div>

        <div className="latest-posts-grid">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} media={mediaMap[post.featured_media] ?? null} />
          ))}
        </div>
      </div>

      <style>{`
        .latest-posts-grid { display: grid; grid-template-columns: 1fr; gap: 3px; }
        @media (min-width: 600px) { .latest-posts-grid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1024px) { .latest-posts-grid { grid-template-columns: 1fr 1fr 1fr; } }
      `}</style>
    </section>
  )
}
