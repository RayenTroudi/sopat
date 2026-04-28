'use client'
import { useScrollReveal } from '@/lib/useScrollReveal'

export default function About() {
  const ref = useScrollReveal()

  return (
    <section
      id="apropos"
      ref={ref as React.RefObject<HTMLElement>}
      style={{ background: 'var(--ivory)', padding: 'clamp(64px, 10vw, 140px) 0' }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '48px', alignItems: 'start' }}
          className="about-grid"
        >
          {/* Pull quote */}
          <div className="reveal" style={{ position: 'relative' }}>
            <blockquote
              style={{
                fontFamily: 'var(--font-cormorant), serif',
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 'clamp(26px, 3.2vw, 42px)',
                color: 'var(--green)',
                lineHeight: 1.25,
                margin: 0,
              }}
            >
              &ldquo;Nous créons des jardins qui racontent une histoire.&rdquo;
            </blockquote>
            <div style={{ marginTop: '24px', width: '48px', height: '1px', background: 'var(--gold)' }} />
          </div>

          {/* Description */}
          <div className="reveal reveal-delay-2" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <p
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '10px',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--gold)',
                fontWeight: 300,
                marginBottom: '8px',
              }}
            >
              À Propos
            </p>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px', lineHeight: 1.8, color: 'rgba(42,42,42,0.82)', fontWeight: 300, margin: 0 }}>
              Fondée avec l&apos;ambition de redéfinir le paysage tunisien et au-delà, SOPAT réunit une équipe interdisciplinaire de 72 experts — architectes paysagistes, ingénieurs, botanistes et techniciens — unis par une même exigence d&apos;excellence.
            </p>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px', lineHeight: 1.8, color: 'rgba(42,42,42,0.82)', fontWeight: 300, margin: 0 }}>
              De la villa privée aux complexes hôteliers internationaux, en passant par les espaces corporate et les résidences de prestige, nos réalisations témoignent d&apos;un savoir-faire reconnu à travers la Tunisie, la France, les Émirats et au-delà.
            </p>
            <div style={{ marginTop: '8px' }}>
              <a
                href="/propos"
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '10px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  fontWeight: 300,
                  color: 'rgba(42,42,42,0.5)',
                  textDecoration: 'none',
                  borderBottom: '1px solid rgba(42,42,42,0.2)',
                  paddingBottom: '2px',
                  transition: 'color 0.3s, border-color 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--green)'
                  e.currentTarget.style.borderColor = 'var(--green)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(42,42,42,0.5)'
                  e.currentTarget.style.borderColor = 'rgba(42,42,42,0.2)'
                }}
              >
                En savoir plus →
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .about-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 0 !important;
            position: relative;
          }
          .about-grid > *:first-child { padding-right: 64px; }
          .about-grid > *:last-child {
            padding-left: 64px;
            border-left: 1px solid;
            border-image: linear-gradient(to bottom, transparent, var(--gold), transparent) 1;
          }
        }
      `}</style>
    </section>
  )
}
