'use client'
import { useScrollReveal } from '@/lib/useScrollReveal'
import Image from 'next/image'

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
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '48px',
            alignItems: 'start',
          }}
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
            <div
              style={{
                marginTop: '24px',
                width: '48px',
                height: '1px',
                background: 'var(--gold)',
              }}
            />
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
            <p
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '15px',
                lineHeight: 1.8,
                color: 'rgba(42,42,42,0.82)',
                fontWeight: 300,
                margin: 0,
              }}
            >
              Fondée avec l&apos;ambition de redéfinir le paysage tunisien et au-delà, SOPAT réunit une équipe interdisciplinaire de 72 experts — architectes paysagistes, ingénieurs, botanistes et techniciens — unis par une même exigence d&apos;excellence.
            </p>
            <p
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '15px',
                lineHeight: 1.8,
                color: 'rgba(42,42,42,0.82)',
                fontWeight: 300,
                margin: 0,
              }}
            >
              De la villa privée aux complexes hôteliers internationaux, en passant par les espaces corporate et les résidences de prestige, nos réalisations témoignent d&apos;un savoir-faire reconnu à travers la Tunisie, la France, les Émirats et au-delà. Chaque projet est une conversation entre la nature, l&apos;architecture et l&apos;usage humain.
            </p>
          </div>
        </div>
        {/* Gold divider — visible only on desktop, sits between columns */}
        <div className="about-col-divider" />
      </div>

      {/* Photo strip below text */}
      <div
        className="reveal about-photos"
        style={{ marginTop: 'clamp(48px, 6vw, 80px)', display: 'grid', gap: '2px' }}
      >
        {[
          { src: '/BTE-.jpg.jpeg',  alt: 'BTE Bank — aménagement paysager' },
          { src: '/81-M.jpg.jpeg',  alt: 'Restaurant — végétalisation intérieure' },
          { src: '/9-scaled.jpg.jpeg', alt: 'Showroom BMW — espace vert' },
        ].map((photo) => (
          <div
            key={photo.src}
            style={{ position: 'relative', height: '320px', overflow: 'hidden' }}
            className="about-photo-card"
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              style={{ objectFit: 'cover', transition: 'transform 0.6s ease' }}
              className="about-photo-img"
            />
          </div>
        ))}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .about-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 0 !important;
            position: relative;
          }
          .about-grid > *:first-child {
            padding-right: 64px;
          }
          .about-grid > *:last-child {
            padding-left: 64px;
            border-left: 1px solid;
            border-image: linear-gradient(to bottom, transparent, var(--gold), transparent) 1;
          }
          .about-photos {
            grid-template-columns: repeat(3, 1fr) !important;
          }
          .about-col-divider {
            display: none;
          }
        }
        .about-col-divider {
          display: none;
        }
        .about-photo-card:hover .about-photo-img {
          transform: scale(1.06);
        }
      `}</style>
    </section>
  )
}
