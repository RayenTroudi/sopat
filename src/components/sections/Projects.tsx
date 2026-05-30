'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { projects } from '@/lib/projects'
import { useScrollReveal } from '@/lib/useScrollReveal'

const ALL_CATEGORIES = ['Tous', 'Villa', 'Résidence', 'Hôtel', 'Entreprise', 'Restauration'] as const

function ProjectCard({ p, index }: { p: typeof projects[0]; index: number }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={`/projects/${p.slug}`}
      className="break-inside-avoid"
      style={{ textDecoration: 'none', display: 'block', marginBottom: '16px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          height: index % 5 === 0 ? '420px' : '280px',
          background: 'var(--green)',
        }}
      >
        <Image
          src={p.images[0]}
          alt={p.name}
          fill
          sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 33vw"
          style={{
            objectFit: 'cover',
            transition: 'transform 0.6s ease',
            transform: hovered ? 'scale(1.06)' : 'scale(1)',
          }}
        />
        {/* Hover overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(28,61,46,0.68)',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.5s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '24px',
            zIndex: 2,
          }}
        >
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 300, marginBottom: '8px', display: 'block' }}>
            {p.category}
          </span>
          <h3 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '22px', fontWeight: 300, color: 'var(--ivory)', margin: 0 }}>
            {p.name}
          </h3>
          <div style={{ height: '1px', background: 'var(--gold)', marginTop: '10px', width: hovered ? '48px' : '0px', transition: 'width 0.5s ease 0.1s' }} />
        </div>

        {/* Category badge */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'rgba(28,61,46,0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            padding: '6px 12px',
            zIndex: 3,
          }}
        >
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.8)', fontWeight: 300 }}>
            {p.category}
          </span>
        </div>

        {/* Location bottom-left (always visible) */}
        <div style={{ position: 'absolute', bottom: '14px', left: '16px', zIndex: 3, opacity: hovered ? 0 : 1, transition: 'opacity 0.3s ease' }}>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.14em', color: 'rgba(245,240,232,0.5)', fontWeight: 300, margin: 0 }}>
            {p.location}
          </p>
        </div>
      </div>
    </Link>
  )
}

export default function Projects() {
  const [active, setActive] = useState<string>('Tous')
  const ref = useScrollReveal()

  const visible = active === 'Tous' ? projects : projects.filter((p) => p.category === active)

  const countFor = (cat: string) => projects.filter((p) => p.category === cat).length

  return (
    <section
      id="projets"
      ref={ref as React.RefObject<HTMLElement>}
      style={{ background: 'var(--ivory)', padding: 'clamp(64px, 10vw, 140px) 0' }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div className="reveal projects-header" style={{ marginBottom: '48px' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 300, marginBottom: '12px' }}>
              Nos Projets
            </p>
            <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 300, color: 'var(--green)', margin: 0 }}>
              Des réalisations qui inspirent
            </h2>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '10px',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  padding: '8px 16px',
                  fontWeight: 300,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  background: active === cat ? 'var(--green)' : 'transparent',
                  color: active === cat ? 'var(--ivory)' : 'rgba(42,42,42,0.5)',
                  border: active === cat ? '1px solid var(--green)' : '1px solid rgba(42,42,42,0.2)',
                }}
              >
                {cat}
                {cat !== 'Tous' && (
                  <span style={{ marginLeft: '5px', fontSize: '9px', opacity: 0.65 }}>({countFor(cat)})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Masonry grid — show first 9, rest visible on /projects */}
        <div className="reveal reveal-delay-1 masonry-grid">
          {visible.slice(0, 9).map((p, i) => (
            <ProjectCard key={p.slug} p={p} index={i} />
          ))}
        </div>

        {/* Count indicator when filtered */}
        {visible.length > 9 && (
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(42,42,42,0.4)', fontWeight: 300, textAlign: 'center', margin: '8px 0 32px' }}>
            Affichage de 9 sur {visible.length} projets
          </p>
        )}

        {/* CTA */}
        <div className="reveal reveal-delay-2" style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
          <Link
            href="/projects"
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              padding: '14px 32px',
              fontWeight: 300,
              cursor: 'pointer',
              background: 'transparent',
              color: 'rgba(28,61,46,0.6)',
              border: '1px solid rgba(28,61,46,0.3)',
              transition: 'all 0.35s ease',
              textDecoration: 'none',
              display: 'inline-block',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--green)'
              e.currentTarget.style.color = 'var(--green)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(28,61,46,0.3)'
              e.currentTarget.style.color = 'rgba(28,61,46,0.6)'
            }}
          >
            Voir tous les projets ({projects.length})
          </Link>
        </div>
      </div>

      <style>{`
        .projects-header {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        @media (min-width: 768px) {
          .projects-header {
            flex-direction: row;
            align-items: flex-end;
            justify-content: space-between;
          }
        }
        .masonry-grid {
          columns: 1;
          gap: 16px;
        }
        @media (min-width: 600px) {
          .masonry-grid { columns: 2; }
        }
        @media (min-width: 1024px) {
          .masonry-grid { columns: 3; }
        }
      `}</style>
    </section>
  )
}
