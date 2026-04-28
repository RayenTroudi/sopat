'use client'
import { useScrollReveal } from '@/lib/useScrollReveal'

const values = [
  {
    n: '01',
    title: 'Excellence',
    desc: 'Chaque projet est traité avec la même rigueur, qu\'il s\'agisse d\'un jardin privé ou d\'un complexe hôtelier international. Le détail est notre signature.',
  },
  {
    n: '02',
    title: 'Nature',
    desc: 'Nous travaillons avec le vivant, pas contre lui. Nos créations respectent les écosystèmes locaux et s\'inscrivent dans une démarche durable et responsable.',
  },
  {
    n: '03',
    title: 'Innovation',
    desc: 'De la bio-piscine aux toitures vertes, nous intégrons les technologies les plus avancées pour créer des espaces paysagers qui durent dans le temps.',
  },
  {
    n: '04',
    title: 'Humain',
    desc: 'Chaque espace que nous créons est conçu pour être vécu. L\'usage humain, le confort et l\'émotion sont au centre de chacune de nos décisions créatives.',
  },
]

export default function ProposValues() {
  const ref = useScrollReveal()

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{ background: 'var(--green)', padding: 'clamp(64px, 10vw, 140px) 0' }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <div className="reveal" style={{ marginBottom: '56px' }}>
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
            Nos Valeurs
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
            Ce qui nous définit
          </h2>
        </div>

        <div className="values-grid">
          {values.map((v, i) => (
            <div
              key={v.n}
              className={`reveal reveal-delay-${i + 1} value-card`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                padding: 'clamp(28px, 3vw, 40px)',
                borderTop: '1px solid rgba(245,240,232,0.08)',
                position: 'relative',
                transition: 'background 0.4s ease',
              }}
            >
              {/* Faded number */}
              <span
                style={{
                  fontFamily: 'var(--font-cormorant), serif',
                  fontSize: '72px',
                  fontWeight: 300,
                  color: 'rgba(201,168,76,0.10)',
                  lineHeight: 1,
                  userSelect: 'none',
                  position: 'absolute',
                  top: '16px',
                  right: '24px',
                  transition: 'color 0.4s ease',
                }}
                className="value-num"
              >
                {v.n}
              </span>

              <h3
                style={{
                  fontFamily: 'var(--font-cormorant), serif',
                  fontSize: 'clamp(24px, 2.2vw, 30px)',
                  fontWeight: 300,
                  color: 'var(--ivory)',
                  margin: 0,
                  marginTop: '8px',
                }}
              >
                {v.title}
              </h3>

              <div style={{ width: '32px', height: '1px', background: 'rgba(201,168,76,0.5)' }} className="value-line" />

              <p
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '14px',
                  lineHeight: 1.8,
                  color: 'rgba(245,240,232,0.62)',
                  fontWeight: 300,
                  margin: 0,
                }}
              >
                {v.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .values-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1px;
          background: rgba(245,240,232,0.06);
        }
        @media (min-width: 640px) {
          .values-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .values-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .value-card:hover {
          background: rgba(255,255,255,0.03);
        }
        .value-card:hover .value-num {
          color: rgba(201,168,76,0.22) !important;
        }
        .value-card:hover .value-line {
          background: rgba(201,168,76,0.75) !important;
        }
      `}</style>
    </section>
  )
}
