'use client'
import Nav from '@/components/Nav'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'

type Post = {
  slug: string
  title: string
  date: string
  category: string
  excerpt: string
  image: string
  externalUrl: string
}

const posts: Post[] = [
  {
    slug: 'brand-of-the-year-2025',
    title: 'SOPAT Sacrée « Brand of the Year » 2025',
    date: '14 février 2026',
    category: 'Distinction',
    excerpt:
      'SOPAT est nommée « Brand of the Year 2025-2026 » lors du Festival National des Marques. Une consécration qui célèbre vingt ans d\'engagement pour la transformation des paysages urbains en Tunisie et en Afrique.',
    image: '/blog/brand-of-the-year.jpeg',
    externalUrl: 'https://www.sopat.tn/sopat-sacree-brand-of-the-year-2025-la-consecration-dun-standard-dexcellence/',
  },
  {
    slug: 'brand-of-the-year-ceremonie',
    title: 'La Consécration d\'un Standard d\'Excellence',
    date: '14 février 2026',
    category: 'Distinction',
    excerpt:
      'Une reconnaissance nationale qui reflète l\'ambition de SOPAT : hisser l\'ingénierie paysagère tunisienne au rang d\'excellence internationale, avec 72 experts engagés et plus de 3 500 projets réalisés.',
    image: '/blog/brand-of-the-year-2.jpeg',
    externalUrl: 'https://www.sopat.tn/sopat-sacree-brand-of-the-year-2025-la-consecration-dun-standard-dexcellence/',
  },
  {
    slug: 'france-24-espace-vert',
    title: 'France 24 & SOPAT : L\'Espace Vert, une Infrastructure Critique',
    date: '27 décembre 2025',
    category: 'Médias',
    excerpt:
      'Le média international France 24 met en lumière la vision de SOPAT : comment les espaces verts sont passés d\'un simple agrément à une infrastructure urbaine critique, indispensable à la résilience des villes tunisiennes.',
    image: '/blog/ville-durable.jpeg',
    externalUrl: 'https://www.sopat.tn/france-24-sopat-pourquoi-lespace-vert-est-devenu-une-infrastructure-critique-en-tunisie/',
  },
  {
    slug: 'ville-durable-tunisie-international',
    title: 'SOPAT : L\'Ingénierie de la Ville Durable',
    date: '13 novembre 2025',
    category: 'Vision',
    excerpt:
      'Deux décennies d\'expertise en ingénierie paysagère durable, de la Tunisie à l\'international. SOPAT trace la voie d\'une conception verte qui réconcilie urbanité et nature, de Tunis à Abidjan en passant par Mascate.',
    image: '/blog/ville-durable-2.jpg',
    externalUrl: 'https://www.sopat.tn/sopat-lingenierie-de-la-ville-durable-de-la-tunisie-a-linternational/',
  },
  {
    slug: 'plan-vert-abidjan',
    title: 'Le Plan Vert & le Parkway V23 pour Abidjan',
    date: '30 octobre 2025',
    category: 'International',
    excerpt:
      'SOPAT livre les designs audacieux du Plan Vert pour les 13 communes d\'Abidjan et la conception détaillée du Parkway V23 à Yopougon — une vision ambitieuse pour une capitale africaine tournée vers l\'avenir.',
    image: '/blog/plan-vert-abidjan.jpeg',
    externalUrl: 'https://www.sopat.tn/le-plan-de-vie-sopat-livre-les-designs-audacieux-du-plan-vert-et-du-parkway-v23-pour-abidjan/',
  },
  {
    slug: 'plan-vert-abidjan-design',
    title: 'Parkway V23 : Yopougon Repensée par SOPAT',
    date: '30 octobre 2025',
    category: 'International',
    excerpt:
      'Le Parkway V23 de Yopougon incarne la philosophie SOPAT : transformer l\'espace public urbain en un corridor vert vivant, accessible, et porteur d\'une nouvelle qualité de vie pour les habitants d\'Abidjan.',
    image: '/blog/plan-vert-abidjan-2.jpeg',
    externalUrl: 'https://www.sopat.tn/le-plan-de-vie-sopat-livre-les-designs-audacieux-du-plan-vert-et-du-parkway-v23-pour-abidjan/',
  },
  {
    slug: 'rse-engagement-social',
    title: 'SOPAT & l\'Engagement RSE : Au-delà du Paysage',
    date: '16 janvier 2022',
    category: 'RSE',
    excerpt:
      'À travers ses actions de responsabilité sociale — SOS Village, La Falaise, et d\'autres initiatives communautaires — SOPAT affirme que l\'entreprise paysagère est aussi un acteur du tissu social et humain.',
    image: '/blog/rse-project.jpg',
    externalUrl: 'https://www.sopat.tn/blog/',
  },
]

const categoryColors: Record<string, { bg: string; text: string }> = {
  Distinction: { bg: 'rgba(201,168,76,0.12)', text: 'rgba(160,128,40,1)' },
  Médias:      { bg: 'rgba(15,36,25,0.08)',   text: 'var(--green)' },
  Vision:      { bg: 'rgba(15,36,25,0.08)',   text: 'var(--green)' },
  International: { bg: 'rgba(201,168,76,0.12)', text: 'rgba(160,128,40,1)' },
  RSE:         { bg: 'rgba(15,36,25,0.08)',   text: 'var(--green)' },
}

function PostCard({ post, featured }: { post: Post; featured?: boolean }) {
  const [hovered, setHovered] = useState(false)
  const colors = categoryColors[post.category] ?? { bg: 'rgba(15,36,25,0.08)', text: 'var(--green)' }

  if (featured) {
    return (
      <a
        href={post.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none', display: 'block' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, background: 'var(--green)', minHeight: '480px' }} className="featured-card">
          {/* Image */}
          <div style={{ position: 'relative', overflow: 'hidden', minHeight: '340px' }}>
            <Image
              src={post.image}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit: 'cover', transition: 'transform 0.8s ease', transform: hovered ? 'scale(1.04)' : 'scale(1)' }}
              priority
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, rgba(15,36,25,0.4) 100%)' }} />
          </div>
          {/* Content */}
          <div style={{ padding: 'clamp(32px, 5vw, 56px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', background: 'rgba(201,168,76,0.2)', color: 'rgba(201,168,76,0.9)', padding: '4px 10px', fontWeight: 300 }}>{post.category}</span>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', color: 'rgba(245,240,232,0.35)', fontWeight: 300 }}>{post.date}</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 300, color: 'var(--ivory)', lineHeight: 1.15, margin: '0 0 20px' }}>{post.title}</h2>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', lineHeight: 1.8, color: 'rgba(245,240,232,0.58)', fontWeight: 300, margin: '0 0 28px' }}>{post.excerpt}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: hovered ? '32px' : '20px', height: '1px', background: 'var(--gold)', transition: 'width 0.4s ease' }} />
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.75)', fontWeight: 300 }}>Lire l&apos;article</span>
            </div>
          </div>
        </div>
      </a>
    )
  }

  return (
    <a
      href={post.externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', display: 'block' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ background: '#fff', height: '100%' }}>
        {/* Image */}
        <div style={{ position: 'relative', height: '220px', overflow: 'hidden', background: 'var(--green)' }}>
          <Image
            src={post.image}
            alt={post.title}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 33vw"
            style={{ objectFit: 'cover', transition: 'transform 0.7s ease', transform: hovered ? 'scale(1.05)' : 'scale(1)' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: hovered ? 'rgba(15,36,25,0.18)' : 'transparent', transition: 'background 0.4s ease' }} />
          {/* Category badge */}
          <div style={{ position: 'absolute', top: '14px', left: '14px', background: 'rgba(15,36,25,0.72)', backdropFilter: 'blur(6px)', padding: '4px 10px' }}>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.85)', fontWeight: 300 }}>{post.category}</span>
          </div>
        </div>
        {/* Content */}
        <div style={{ padding: '24px 24px 28px' }}>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', color: 'rgba(42,42,42,0.38)', fontWeight: 300, marginBottom: '10px' }}>{post.date}</p>
          <h3 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(18px, 2vw, 22px)', fontWeight: 300, color: 'var(--green)', lineHeight: 1.2, margin: '0 0 12px' }}>{post.title}</h3>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', lineHeight: 1.75, color: 'rgba(42,42,42,0.58)', fontWeight: 300, margin: '0 0 20px' }}>{post.excerpt}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: hovered ? '28px' : '16px', height: '1px', background: 'var(--gold)', transition: 'width 0.4s ease' }} />
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(42,42,42,0.4)', fontWeight: 300 }}>Lire l&apos;article</span>
          </div>
        </div>
      </div>
    </a>
  )
}

export default function BlogPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

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
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 300, color: 'rgba(201,168,76,0.85)', marginBottom: '16px', opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.8s ease, transform 0.8s ease' }}>
              Actualités &amp; Insights
            </p>
            <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(44px, 7vw, 80px)', fontWeight: 300, lineHeight: 1, color: 'var(--ivory)', margin: 0, opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity 0.8s ease 120ms, transform 0.8s ease 120ms' }}>
              Le <span style={{ color: 'var(--gold)' }}>Blog</span> SOPAT
            </h1>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', lineHeight: 1.8, color: 'rgba(245,240,232,0.6)', fontWeight: 300, maxWidth: '480px', marginTop: '20px', opacity: mounted ? 1 : 0, transition: 'opacity 0.8s ease 250ms' }}>
              Distinctions, engagements internationaux et vision durable — suivez l&apos;actualité de SOPAT, leader de l&apos;ingénierie paysagère en Tunisie et en Afrique.
            </p>
          </div>
        </section>

        {/* Featured post */}
        <section style={{ background: 'var(--ivory)', paddingTop: 'clamp(48px, 6vw, 72px)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(42,42,42,0.35)', fontWeight: 300, marginBottom: '20px' }}>À la une</p>
            <PostCard post={featured} featured />
          </div>
        </section>

        {/* Grid */}
        <section style={{ background: 'var(--ivory)', padding: 'clamp(48px, 6vw, 80px) 0 clamp(64px, 10vw, 120px)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
            <div style={{ height: '1px', background: 'rgba(42,42,42,0.08)', marginBottom: 'clamp(40px, 5vw, 56px)' }} />
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(42,42,42,0.35)', fontWeight: 300, marginBottom: '28px' }}>Tous les articles</p>
            <div className="blog-grid">
              {rest.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          </div>
        </section>

        {/* Footer bar */}
        <div style={{ borderTop: '1px solid rgba(42,42,42,0.1)', background: 'var(--mist)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', fontWeight: 300, letterSpacing: '0.08em', color: 'rgba(42,42,42,0.45)' }}>
              © {new Date().getFullYear()} SOPAT · Société de Paysage de Tunisie
            </span>
            <a
              href="/"
              style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(42,42,42,0.4)', textDecoration: 'none', fontWeight: 300, transition: 'color 0.3s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--green)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(42,42,42,0.4)')}
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
