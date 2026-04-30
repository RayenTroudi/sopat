'use client'
import Nav from '@/components/Nav'
import { projects } from '@/lib/projects'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'

const categories = ['Tous', 'Villa', 'Résidence', 'Hôtel', 'Entreprise', 'Restauration']

const categoryColors: Record<string, string> = {
  Villa: 'rgba(201,168,76,0.85)',
  Résidence: 'rgba(201,168,76,0.85)',
  Hôtel: 'rgba(201,168,76,0.85)',
  Entreprise: 'rgba(201,168,76,0.85)',
  Restauration: 'rgba(201,168,76,0.85)',
}

function ProjectCard({ p, index }: { p: typeof projects[0]; index: number }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={`/projects/${p.slug}`}
      style={{ textDecoration: 'none' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--green)',
          height: index % 5 === 0 ? '480px' : '320px',
          cursor: 'pointer',
        }}
      >
        <Image
          src={p.images[0]}
          alt={p.name}
          fill
          sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 33vw"
          style={{
            objectFit: 'cover',
            transition: 'transform 0.7s ease',
            transform: hovered ? 'scale(1.05)' : 'scale(1)',
          }}
        />
        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: hovered
              ? 'linear-gradient(to top, rgba(15,36,25,0.88) 0%, rgba(15,36,25,0.2) 55%, transparent 100%)'
              : 'linear-gradient(to top, rgba(15,36,25,0.72) 0%, rgba(15,36,25,0.05) 50%, transparent 100%)',
            transition: 'background 0.5s ease',
          }}
        />
        {/* Category badge */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'rgba(15,36,25,0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            padding: '5px 12px',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '9px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(201,168,76,0.85)',
              fontWeight: 300,
            }}
          >
            {p.category}
          </span>
        </div>
        {/* Title */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '24px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '9px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(245,240,232,0.55)',
              fontWeight: 300,
              marginBottom: '6px',
            }}
          >
            {p.location}
          </p>
          <h3
            style={{
              fontFamily: 'var(--font-cormorant), serif',
              fontSize: 'clamp(20px, 2vw, 26px)',
              fontWeight: 300,
              color: 'var(--ivory)',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {p.name}
          </h3>
          <div
            style={{
              height: '1px',
              background: 'var(--gold)',
              marginTop: '10px',
              width: hovered ? '48px' : '0px',
              transition: 'width 0.5s ease 0.1s',
            }}
          />
        </div>
      </div>
    </Link>
  )
}

export default function ProjectsPage() {
  const [active, setActive] = useState('Tous')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  const visible = active === 'Tous' ? projects : projects.filter((p) => p.category === active)

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
            src={projects[3].images[0]}
            alt="SOPAT Projets"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: 'cover', objectPosition: 'center 40%', opacity: 0.25, mixBlendMode: 'luminosity' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,36,25,0.85) 0%, transparent 60%)', pointerEvents: 'none' }} />

          <div
            style={{
              maxWidth: '1280px',
              margin: '0 auto',
              padding: 'clamp(120px, 16vw, 180px) 24px clamp(48px, 6vw, 72px)',
              position: 'relative',
              zIndex: 1,
              width: '100%',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '10px',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                fontWeight: 300,
                color: 'rgba(201,168,76,0.85)',
                marginBottom: '16px',
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 0.8s ease, transform 0.8s ease',
              }}
            >
              Portfolio
            </p>
            <h1
              style={{
                fontFamily: 'var(--font-cormorant), serif',
                fontSize: 'clamp(44px, 7vw, 80px)',
                fontWeight: 300,
                lineHeight: 1,
                color: 'var(--ivory)',
                margin: 0,
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.8s ease 120ms, transform 0.8s ease 120ms',
              }}
            >
              Nos <span style={{ color: 'var(--gold)' }}>Réalisations</span>
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '14px',
                lineHeight: 1.8,
                color: 'rgba(245,240,232,0.6)',
                fontWeight: 300,
                maxWidth: '480px',
                marginTop: '20px',
                opacity: mounted ? 1 : 0,
                transition: 'opacity 0.8s ease 250ms',
              }}
            >
              {projects.length} projets réalisés à travers la Tunisie et l&apos;international — villas, hôtels, résidences et espaces corporate.
            </p>
          </div>
        </section>

        {/* Filter + Grid */}
        <section style={{ background: 'var(--ivory)', padding: 'clamp(48px, 6vw, 80px) 0 clamp(64px, 10vw, 120px)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
            {/* Filter tabs */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '48px',
                borderBottom: '1px solid rgba(42,42,42,0.1)',
                paddingBottom: '0',
              }}
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActive(cat)}
                  style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '10px',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    fontWeight: 300,
                    padding: '14px 20px',
                    background: 'none',
                    border: 'none',
                    borderBottom: active === cat ? '2px solid var(--gold)' : '2px solid transparent',
                    color: active === cat ? 'var(--green)' : 'rgba(42,42,42,0.45)',
                    cursor: 'pointer',
                    transition: 'color 0.3s ease, border-color 0.3s ease',
                    marginBottom: '-1px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat}
                  {cat !== 'Tous' && (
                    <span style={{ marginLeft: '6px', fontSize: '9px', opacity: 0.6 }}>
                      ({projects.filter((p) => p.category === cat).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Masonry grid */}
            <div className="projects-masonry">
              {visible.map((p, i) => (
                <ProjectCard key={p.slug} p={p} index={i} />
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
        .projects-masonry {
          columns: 1;
          gap: 3px;
        }
        @media (min-width: 600px) {
          .projects-masonry { columns: 2; }
        }
        @media (min-width: 1024px) {
          .projects-masonry { columns: 3; }
        }
        .projects-masonry > * {
          break-inside: avoid;
          margin-bottom: 3px;
        }
      `}</style>
    </>
  )
}
