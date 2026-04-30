'use client'
import { useScrollReveal } from '@/lib/useScrollReveal'
import Image from 'next/image'

export default function ServicesCta() {
  const ref = useScrollReveal()

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{ background: 'var(--ivory)', padding: 'clamp(64px, 10vw, 140px) 0 0' }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px clamp(64px, 8vw, 100px)' }}>
        <div className="reveal cta-inner">
          <div>
            <p
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
              Commençons votre projet
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-cormorant), serif',
                fontSize: 'clamp(28px, 3.5vw, 50px)',
                fontWeight: 300,
                color: 'var(--green)',
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              Prêt à transformer votre espace ?
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '14px',
                lineHeight: 1.8,
                color: 'rgba(42,42,42,0.6)',
                fontWeight: 300,
                marginTop: '16px',
                maxWidth: '480px',
              }}
            >
              Contactez-nous pour une consultation initiale. Nos experts analysent votre site et vous proposent une vision paysagère sur mesure.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <a
              href="/#contact"
              style={{
                display: 'inline-block',
                background: 'var(--green)',
                color: 'var(--ivory)',
                padding: '14px 32px',
                fontSize: '11px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 300,
                textDecoration: 'none',
                fontFamily: 'var(--font-inter), sans-serif',
                transition: 'background 0.35s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--green-dark)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--green)')}
            >
              Nous contacter
            </a>
            <a
              href="/#projets"
              style={{
                display: 'inline-block',
                border: '1px solid rgba(28,61,46,0.35)',
                color: 'rgba(28,61,46,0.7)',
                padding: '14px 32px',
                fontSize: '11px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 300,
                textDecoration: 'none',
                fontFamily: 'var(--font-inter), sans-serif',
                transition: 'border-color 0.35s ease, color 0.35s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--green)'
                e.currentTarget.style.color = 'var(--green)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(28,61,46,0.35)'
                e.currentTarget.style.color = 'rgba(28,61,46,0.7)'
              }}
            >
              Voir nos projets
            </a>
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div style={{ borderTop: '1px solid rgba(42,42,42,0.1)', background: 'var(--mist)' }}>
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Image src="/sopaNoBg.png" alt="SOPAT" width={26} height={26} style={{ objectFit: 'contain', opacity: 0.7 }} />
            <span
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '11px',
                fontWeight: 300,
                letterSpacing: '0.08em',
                color: 'rgba(42,42,42,0.45)',
              }}
            >
              © {new Date().getFullYear()} SOPAT · Société de Paysage de Tunisie
            </span>
          </div>
          <a
            href="/"
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '10px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgba(42,42,42,0.4)',
              textDecoration: 'none',
              fontWeight: 300,
              transition: 'color 0.3s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--green)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(42,42,42,0.4)')}
          >
            ← Retour à l&apos;accueil
          </a>
        </div>
      </div>

      <style>{`
        .cta-inner {
          display: flex;
          flex-direction: column;
          gap: 36px;
          align-items: flex-start;
        }
        @media (min-width: 768px) {
          .cta-inner {
            flex-direction: row;
            align-items: flex-end;
            justify-content: space-between;
          }
        }
      `}</style>
    </section>
  )
}
