'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useScrollReveal } from '@/lib/useScrollReveal'

const projects = [
  { name: 'Villa Notre-Dame',          category: 'Villa',     img: '/villa-marsa.jpg.jpeg',       tall: true  },
  { name: 'Villa Marsa',               category: 'Villa',     img: '/24.jpg.jpeg',                tall: false },
  { name: 'Villa Manar',               category: 'Villa',     img: '/9-scaled.jpg.jpeg',          tall: false },
  { name: 'Villa Jardins de Carthage', category: 'Villa',     img: '/BTE-.jpg.jpeg',              tall: true  },
  { name: 'Novotel Tunis Lac',         category: 'Hôtel',     img: '/MVS_4733.jpg.jpeg',          tall: false },
  { name: 'Hotel Laico Tunis',         category: 'Hôtel',     img: '/MVS_7371.jpg.jpeg',          tall: true  },
  { name: 'Hotel Mövenpick',           category: 'Hôtel',     img: '/MVS_6910.jpg.jpeg',          tall: false },
  { name: 'The Residence',             category: 'Résidence', img: '/4-2.jpg.jpeg',               tall: false },
  { name: 'Complexe Hôtelier',         category: 'Hôtel',     img: '/MVS_6258.jpg.jpeg',          tall: false },
]

const filters = ['Tous', 'Villa', 'Hôtel', 'Résidence', 'Entreprise']

function ProjectCard({ p }: { p: typeof projects[0] }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="break-inside-avoid"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        height: p.tall ? '420px' : '280px',
        marginBottom: '16px',
        background: 'var(--green)',
      }}
    >
      <Image
        src={p.img}
        alt={p.name}
        fill
        sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 33vw"
        style={{ objectFit: 'cover', transition: 'transform 0.6s ease' }}
        className={hovered ? 'img-zoom' : ''}
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
        <span
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '9px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            fontWeight: 300,
            marginBottom: '8px',
            display: 'block',
          }}
        >
          {p.category}
        </span>
        <h3
          style={{
            fontFamily: 'var(--font-cormorant), serif',
            fontSize: '22px',
            fontWeight: 300,
            color: 'var(--ivory)',
            margin: 0,
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
        <span
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '9px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(201,168,76,0.8)',
            fontWeight: 300,
          }}
        >
          {p.category}
        </span>
      </div>
    </div>
  )
}

export default function Projects() {
  const [active, setActive] = useState('Tous')
  const ref = useScrollReveal()

  const visible = active === 'Tous' ? projects : projects.filter((p) => p.category === active)

  return (
    <section
      id="projets"
      ref={ref as React.RefObject<HTMLElement>}
      style={{ background: 'var(--ivory)', padding: 'clamp(64px, 10vw, 140px) 0' }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div
          className="reveal projects-header"
          style={{ marginBottom: '56px' }}
        >
          <div>
            <p
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '10px',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'var(--gold)',
                fontWeight: 300,
                marginBottom: '12px',
              }}
            >
              Nos Projets
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-cormorant), serif',
                fontSize: 'clamp(32px, 4vw, 52px)',
                fontWeight: 300,
                color: 'var(--green)',
                margin: 0,
              }}
            >
              Des réalisations qui inspirent
            </h2>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActive(f)}
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '10px',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  padding: '8px 16px',
                  fontWeight: 300,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  background: active === f ? 'var(--green)' : 'transparent',
                  color: active === f ? 'var(--ivory)' : 'rgba(42,42,42,0.5)',
                  border: active === f ? '1px solid var(--green)' : '1px solid rgba(42,42,42,0.2)',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Masonry grid */}
        <div
          className="reveal reveal-delay-1 masonry-grid"
        >
          {visible.map((p) => (
            <ProjectCard key={p.name} p={p} />
          ))}
        </div>

        {/* Ghost button */}
        <div
          className="reveal reveal-delay-2"
          style={{ display: 'flex', justifyContent: 'center', marginTop: '56px' }}
        >
          <button
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
            Voir tous les projets
          </button>
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
        .img-zoom {
          transform: scale(1.06) !important;
        }
      `}</style>
    </section>
  )
}
