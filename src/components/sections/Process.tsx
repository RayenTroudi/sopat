'use client'
import { useScrollReveal } from '@/lib/useScrollReveal'

const steps = [
  {
    n: '01',
    title: 'Première Consultation',
    desc: 'Écoute, analyse du site et définition des objectifs du projet avec votre interlocuteur dédié.',
  },
  {
    n: '02',
    title: 'Études & Conception',
    desc: 'Plans, rendus 3D, choix des essences et validation du budget avant tout engagement.',
  },
  {
    n: '03',
    title: 'Réalisation',
    desc: 'Mise en œuvre par nos équipes terrain avec un suivi qualité rigoureux à chaque étape.',
  },
  {
    n: '04',
    title: 'Entretien & Suivi',
    desc: 'Maintenance régulière pour préserver l\'esthétique et la vitalité de votre espace dans la durée.',
  },
]

export default function Process() {
  const ref = useScrollReveal()

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{ background: 'var(--charcoal)', padding: 'clamp(64px, 10vw, 140px) 0' }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <p
          className="reveal"
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '10px',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            fontWeight: 300,
            marginBottom: '16px',
          }}
        >
          Notre Approche
        </p>
        <h2
          className="reveal reveal-delay-1"
          style={{
            fontFamily: 'var(--font-cormorant), serif',
            fontSize: 'clamp(32px, 4vw, 52px)',
            fontWeight: 300,
            color: 'var(--ivory)',
            marginBottom: 'clamp(48px, 8vw, 80px)',
          }}
        >
          Un processus éprouvé
        </h2>

        {/* Desktop: horizontal */}
        <div className="process-desktop reveal reveal-delay-2">
          <div style={{ position: 'relative' }}>
            {/* Connecting line */}
            <div
              style={{
                position: 'absolute',
                top: '31px',
                left: '32px',
                right: '32px',
                height: '1px',
                background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.7), transparent)',
              }}
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '32px',
              }}
            >
              {steps.map((s, i) => (
                <div
                  key={s.n}
                  className={`reveal reveal-delay-${i + 1}`}
                  style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                >
                  <div
                    style={{
                      width: '62px',
                      height: '62px',
                      borderRadius: '50%',
                      border: '1px solid rgba(201,168,76,0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--charcoal)',
                      position: 'relative',
                      zIndex: 1,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-cormorant), serif',
                        fontSize: '20px',
                        fontWeight: 300,
                        color: 'var(--gold)',
                      }}
                    >
                      {s.n}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-cormorant), serif',
                      fontSize: '20px',
                      fontWeight: 300,
                      color: 'var(--ivory)',
                      margin: 0,
                      marginTop: '8px',
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: '13px',
                      lineHeight: 1.7,
                      color: 'rgba(245,240,232,0.62)',
                      fontWeight: 300,
                      margin: 0,
                    }}
                  >
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile: vertical */}
        <div className="process-mobile" style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: '30px',
              top: 0,
              bottom: 0,
              width: '1px',
              background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.4), transparent)',
            }}
          />
          {steps.map((s, i) => (
            <div
              key={s.n}
              className={`reveal reveal-delay-${i + 1}`}
              style={{
                display: 'flex',
                gap: '24px',
                paddingBottom: i < steps.length - 1 ? '40px' : 0,
              }}
            >
              <div
                style={{
                  width: '62px',
                  height: '62px',
                  borderRadius: '50%',
                  border: '1px solid rgba(201,168,76,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--charcoal)',
                  position: 'relative',
                  zIndex: 1,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-cormorant), serif',
                    fontSize: '20px',
                    fontWeight: 300,
                    color: 'var(--gold)',
                  }}
                >
                  {s.n}
                </span>
              </div>
              <div style={{ paddingTop: '14px' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-cormorant), serif',
                    fontSize: '20px',
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
                    fontSize: '13px',
                    lineHeight: 1.7,
                    color: 'rgba(245,240,232,0.62)',
                    fontWeight: 300,
                    marginTop: '8px',
                  }}
                >
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .process-desktop { display: none; }
        .process-mobile  { display: block; }
        @media (min-width: 768px) {
          .process-desktop { display: block; }
          .process-mobile  { display: none; }
        }
      `}</style>
    </section>
  )
}
