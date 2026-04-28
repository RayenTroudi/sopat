'use client'
import { useScrollReveal } from '@/lib/useScrollReveal'
import Image from 'next/image'

const stats = [
  { value: '20+', label: 'Années d\'expérience' },
  { value: '72',  label: 'Experts' },
  { value: '+3500', label: 'Projets réalisés' },
  { value: '5',   label: 'Pays' },
]

export default function ProposStory() {
  const ref = useScrollReveal()

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{ background: 'var(--ivory)', padding: 'clamp(64px, 10vw, 140px) 0' }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>

        {/* Top: text + image side by side */}
        <div className="story-grid">
          {/* Left — text */}
          <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <p
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '10px',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'var(--gold)',
                fontWeight: 300,
              }}
            >
              Notre Histoire
            </p>

            <h2
              style={{
                fontFamily: 'var(--font-cormorant), serif',
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 'clamp(28px, 3.5vw, 46px)',
                color: 'var(--green)',
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              Fondée sur une passion profonde pour la nature et l&apos;architecture.
            </h2>

            <div style={{ width: '48px', height: '1px', background: 'var(--gold)' }} />

            <p
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '15px',
                lineHeight: 1.85,
                color: 'rgba(42,42,42,0.82)',
                fontWeight: 300,
                margin: 0,
              }}
            >
              Fondée avec l&apos;ambition de redéfinir le paysage tunisien et au-delà, SOPAT réunit une équipe interdisciplinaire d&apos;architectes paysagistes, ingénieurs, botanistes et techniciens — tous unis par une même exigence d&apos;excellence et un profond respect du vivant.
            </p>
            <p
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '15px',
                lineHeight: 1.85,
                color: 'rgba(42,42,42,0.82)',
                fontWeight: 300,
                margin: 0,
              }}
            >
              De la villa privée aux complexes hôteliers internationaux, en passant par les espaces corporate et les résidences de prestige, nos réalisations témoignent d&apos;un savoir-faire reconnu à travers la Tunisie, la France, les Émirats et au-delà. Chaque projet est une conversation entre la nature, l&apos;architecture et l&apos;usage humain.
            </p>
          </div>

          {/* Right — photo */}
          <div
            className="reveal reveal-delay-2 story-img-wrap"
            style={{ position: 'relative', overflow: 'hidden', background: 'var(--green)' }}
          >
            <Image
              src="/propos/theCEO.jpeg"
              alt="SOPAT — le directeur général"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit: 'cover', transition: 'transform 0.7s ease' }}
              className="story-img"
            />
            {/* Gold corner accent */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '64px',
                height: '64px',
                borderTop: '1px solid rgba(201,168,76,0.5)',
                borderLeft: '1px solid rgba(201,168,76,0.5)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div
          className="reveal reveal-delay-2 stats-row"
          style={{ marginTop: 'clamp(48px, 6vw, 80px)' }}
        >
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`reveal reveal-delay-${i + 1}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '28px 0',
                borderTop: '1px solid rgba(42,42,42,0.1)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-cormorant), serif',
                  fontSize: 'clamp(36px, 4vw, 52px)',
                  fontWeight: 300,
                  color: 'var(--green)',
                  lineHeight: 1,
                }}
              >
                {s.value}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '10px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(42,42,42,0.5)',
                  fontWeight: 300,
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .story-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 48px;
          align-items: center;
        }
        .story-img-wrap {
          height: 420px;
        }
        @media (min-width: 768px) {
          .story-grid {
            grid-template-columns: 1fr 1fr;
            gap: 80px;
          }
          .story-img-wrap {
            height: 540px;
          }
        }
        .story-img-wrap:hover .story-img {
          transform: scale(1.04);
        }
        .stats-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0 32px;
        }
        @media (min-width: 640px) {
          .stats-row {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>
    </section>
  )
}
