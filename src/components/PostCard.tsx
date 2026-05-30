import Image from 'next/image'
import Link from 'next/link'
import type { WPPost, WPMedia } from '@/lib/api'
import { formatDate, stripHtml, sanitizeHtml, extractFirstImage } from '@/lib/api'

type Props = {
  post: WPPost
  media?: WPMedia | null
  featured?: boolean
}

export default function PostCard({ post, media, featured = false }: Props) {
  const title = post.title.rendered
  const excerpt = stripHtml(post.excerpt.rendered).slice(0, 160)
  const date = formatDate(post.date)
  const href = `/posts/${post.slug}`
  const rawImgSrc = media?.source_url ?? extractFirstImage(post.content.rendered)
  // Use proxy for WP-hosted images; keep local public paths as-is for next/image
  const isWpImage = rawImgSrc?.startsWith('https://www.sopat.tn') ?? false
  const proxySrc = rawImgSrc ? (isWpImage ? `/api/image?url=${encodeURIComponent(rawImgSrc)}` : rawImgSrc) : null
  const imgAlt = media?.alt_text || stripHtml(title)

  const imgElement = (fill: boolean) =>
    proxySrc ? (
      isWpImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proxySrc}
          alt={imgAlt}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: fill ? 'transform 0.8s ease' : 'transform 0.7s ease',
          }}
        />
      ) : (
        <Image
          src={proxySrc}
          alt={imgAlt}
          fill
          sizes={fill ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 33vw'}
          style={{ objectFit: 'cover', transition: fill ? 'transform 0.8s ease' : 'transform 0.7s ease' }}
          priority={fill}
        />
      )
    ) : null

  if (featured) {
    return (
      <Link href={href} className="block group" style={{ textDecoration: 'none' }}>
        <article
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--green)', minHeight: '460px' }}
          className="featured-post-card"
        >
          <div style={{ position: 'relative', overflow: 'hidden', minHeight: '320px' }}>
            {proxySrc ? imgElement(true) : <div style={{ position: 'absolute', inset: 0, background: 'var(--green-dark)' }} />}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, rgba(15,36,25,0.4) 100%)' }} />
          </div>
          <div style={{ padding: 'clamp(32px,5vw,56px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', color: 'rgba(245,240,232,0.4)', fontWeight: 300, marginBottom: '16px' }}>{date}</p>
            <h2
              style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(24px,3vw,36px)', fontWeight: 300, color: 'var(--ivory)', lineHeight: 1.15, margin: '0 0 18px' }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(title) }}
            />
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', lineHeight: 1.8, color: 'rgba(245,240,232,0.58)', fontWeight: 300, margin: '0 0 28px' }}>
              {excerpt}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '20px', height: '1px', background: 'var(--gold)', transition: 'width 0.4s ease' }} />
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.75)', fontWeight: 300 }}>
                Lire l&apos;article
              </span>
            </div>
          </div>
        </article>
      </Link>
    )
  }

  return (
    <Link href={href} className="block group" style={{ textDecoration: 'none' }}>
      <article style={{ background: '#fff', height: '100%' }}>
        <div style={{ position: 'relative', height: '220px', overflow: 'hidden', background: 'var(--green)' }}>
          {proxySrc ? imgElement(false) : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(140deg, var(--green) 0%, var(--green-dark) 100%)' }} />}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,36,25,0)', transition: 'background 0.4s ease' }} />
        </div>
        <div style={{ padding: '24px 24px 28px' }}>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', color: 'rgba(42,42,42,0.38)', fontWeight: 300, marginBottom: '10px' }}>{date}</p>
          <h3
            style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(18px,2vw,22px)', fontWeight: 300, color: 'var(--green)', lineHeight: 1.2, margin: '0 0 12px' }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(title) }}
          />
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', lineHeight: 1.75, color: 'rgba(42,42,42,0.58)', fontWeight: 300, margin: '0 0 20px' }}>
            {excerpt}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '1px', background: 'var(--gold)', transition: 'width 0.4s ease' }} />
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(42,42,42,0.4)', fontWeight: 300 }}>
              Lire l&apos;article
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
