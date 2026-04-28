'use client'
import { useScrollReveal } from '@/lib/useScrollReveal'
import { useState } from 'react'
import Image from 'next/image'

const services = [
  {
    num: '01',
    title: 'Études',
    sub: 'Study & Planning',
    desc: "Analyse de site, études de faisabilité, conception paysagère, plans d'exécution et modélisation 3D pour une vision complète avant la première pierre.",
  },
  {
    num: '02',
    title: 'Réalisation',
    sub: 'Construction & Installation',
    desc: "Mise en œuvre de tous les corps d'état du paysage : plantations, structures, irrigation, éclairage, piscines biologiques et équipements technologiques.",
  },
  {
    num: '03',
    title: 'Entretien',
    sub: 'Maintenance',
    desc: 'Contrats de maintenance sur mesure, taille, fertilisation, gestion de l\'eau et interventions saisonnières pour préserver la beauté dans le temps.',
  },
]

const tags = [
  'Irrigation', 'Éclairage', 'Toitures Vertes', 'Bio-Piscines',
  'Structures', 'Systèmes Technologiques',
]

function ServiceCard({ s, delay }: { s: typeof services[0]; delay: number }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className={`reveal reveal-delay-${delay}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: hovered ? 'var(--green-dark)' : 'var(--green)',
        padding: 'clamp(32px, 4vw, 48px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        cursor: 'default',
        transition: 'background 0.5s ease',
        overflow: 'hidden',
        borderLeft: hovered ? '2px solid var(--gold)' : '2px solid transparent',
      }}
    >
      {/* Faded number */}
      <span
        style={{
          fontFamily: 'var(--font-cormorant), serif',
          fontSize: 'clamp(64px, 7vw, 80px)',
          fontWeight: 300,
          lineHeight: 1,
          color: hovered ? 'rgba(201,168,76,0.22)' : 'rgba(201,168,76,0.12)',
          transition: 'color 0.5s ease',
          userSelect: 'none',
          display: 'block',
        }}
      >
        {s.num}
      </span>
      <div>
        <h3
          style={{
            fontFamily: 'var(--font-cormorant), serif',
            fontSize: 'clamp(26px, 2.5vw, 32px)',
            fontWeight: 300,
            color: 'var(--ivory)',
            margin: 0,
          }}
        >
          {s.title}
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '9px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'rgba(201,168,76,0.7)',
            fontWeight: 300,
            marginTop: '6px',
          }}
        >
          {s.sub}
        </p>
      </div>
      <p
        style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '14px',
          lineHeight: 1.75,
          color: 'rgba(245,240,232,0.72)',
          fontWeight: 300,
        }}
      >
        {s.desc}
      </p>
    </div>
  )
}

export default function Services() {
  const ref = useScrollReveal()

  return (
    <section
      id="services"
      ref={ref as React.RefObject<HTMLElement>}
      style={{ background: 'var(--green)', padding: 'clamp(64px, 10vw, 140px) 0' }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        {/* Section label */}
        <p
          className="reveal"
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '10px',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            fontWeight: 300,
            marginBottom: '48px',
          }}
        >
          Nos Services
        </p>

        {/* Cards grid */}
        <div className="services-grid">
          {services.map((s, i) => (
            <ServiceCard key={s.num} s={s} delay={i + 1} />
          ))}
        </div>

        {/* Category cards: Hôtel / Résidence / Villa */}
        <div className="reveal category-cards" style={{ marginTop: '56px' }}>
          {[
            { label: 'Hôtel',     img: '/MVS_7371.jpg.jpeg' },
            { label: 'Résidence', img: '/4-2.jpg.jpeg' },
            { label: 'Villa',     img: '/villa-marsa.jpg.jpeg' },
          ].map((cat) => (
            <div
              key={cat.label}
              style={{
                position: 'relative',
                height: '240px',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
              className="cat-card"
            >
              <Image
                src={cat.img}
                alt={cat.label}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                style={{ objectFit: 'cover', transition: 'transform 0.6s ease' }}
                className="cat-img"
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(28,61,46,0.72) 0%, rgba(28,61,46,0.12) 60%, transparent 100%)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '24px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-cormorant), serif',
                    fontSize: '28px',
                    fontWeight: 300,
                    color: 'var(--ivory)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {cat.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Pill tags */}
        <div
          className="reveal"
          style={{
            marginTop: '56px',
            overflowX: 'auto',
            paddingBottom: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '10px',
              width: 'max-content',
            }}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  border: '1px solid rgba(201,168,76,0.28)',
                  color: 'rgba(201,168,76,0.65)',
                  fontSize: '10px',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  padding: '8px 18px',
                  fontWeight: 300,
                  fontFamily: 'var(--font-inter), sans-serif',
                  whiteSpace: 'nowrap',
                  transition: 'border-color 0.3s, color 0.3s',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--gold)'
                  e.currentTarget.style.color = 'var(--gold)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.28)'
                  e.currentTarget.style.color = 'rgba(201,168,76,0.65)'
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .services-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1px;
          background: rgba(245,240,232,0.08);
        }
        @media (min-width: 768px) {
          .services-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .category-cards {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2px;
        }
        @media (min-width: 768px) {
          .category-cards {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .cat-card:hover .cat-img {
          transform: scale(1.06);
        }
      `}</style>
    </section>
  )
}
