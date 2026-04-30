'use client'
import { useScrollReveal } from '@/lib/useScrollReveal'
import Image from 'next/image'

const categories = [
  { label: 'Hôtel',      sub: 'Complexes hôteliers & resorts',   img: '/MVS_7371.jpg.jpeg' },
  { label: 'Résidence',  sub: 'Résidences & immeubles de prestige', img: '/4-2.jpg.jpeg' },
  { label: 'Villa',      sub: 'Villas privées & maisons',         img: '/villa-marsa.jpg.jpeg' },
]

const tags = [
  'Irrigation', 'Éclairage Paysager', 'Toitures Vertes',
  'Bio-Piscines', 'Structures', 'Murs Végétaux',
  'Systèmes Technologiques', 'Plans d\'eau',
]

export default function ServicesCategories() {
  const ref = useScrollReveal()

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{ background: 'var(--green)', padding: 'clamp(64px, 10vw, 140px) 0' }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>

        {/* Header */}
        <div className="reveal" style={{ marginBottom: '48px' }}>
          <p
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '10px',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(201,168,76,0.85)',
              fontWeight: 300,
              marginBottom: '14px',
            }}
          >
            Nos Domaines d&apos;Intervention
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-cormorant), serif',
              fontSize: 'clamp(28px, 3.5vw, 46px)',
              fontWeight: 300,
              color: 'var(--ivory)',
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            Chaque espace mérite notre expertise
          </h2>
        </div>

        {/* Category photo cards */}
        <div className="cat-grid">
          {categories.map((cat, i) => (
            <div
              key={cat.label}
              className={`reveal reveal-delay-${i + 1} cat-card`}
              style={{ position: 'relative', overflow: 'hidden', background: 'var(--green-dark)' }}
            >
              <Image
                src={cat.img}
                alt={cat.label}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                style={{ objectFit: 'cover', transition: 'transform 0.7s ease, opacity 0.4s ease', opacity: 0.75 }}
                className="cat-img"
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(15,36,25,0.85) 0%, rgba(15,36,25,0.1) 60%, transparent 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: '28px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '9px',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'rgba(201,168,76,0.8)',
                    fontWeight: 300,
                    marginBottom: '6px',
                    display: 'block',
                  }}
                >
                  {cat.sub}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-cormorant), serif',
                    fontSize: 'clamp(24px, 2.5vw, 32px)',
                    fontWeight: 300,
                    color: 'var(--ivory)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {cat.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Specialties tags */}
        <div className="reveal" style={{ marginTop: '56px' }}>
          <p
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '10px',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(201,168,76,0.6)',
              fontWeight: 300,
              marginBottom: '20px',
            }}
          >
            Spécialités
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
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
                  transition: 'border-color 0.3s, color 0.3s',
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
        .cat-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 3px;
        }
        @media (min-width: 768px) {
          .cat-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .cat-card {
          height: 320px;
        }
        @media (min-width: 768px) {
          .cat-card { height: 400px; }
        }
        .cat-card:hover .cat-img {
          transform: scale(1.05);
          opacity: 0.9 !important;
        }
      `}</style>
    </section>
  )
}
