'use client'
import { useScrollReveal } from '@/lib/useScrollReveal'

export default function Testimonial() {
  const ref = useScrollReveal()

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{
        background: 'var(--green)',
        padding: 'clamp(80px, 12vw, 160px) 0',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative radial */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(201,168,76,0.10) 0%, transparent 70%)',
        }}
      />

      <div
        style={{
          maxWidth: '860px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Decorative oversized quote mark */}
        <span
          className="reveal"
          style={{
            fontFamily: 'var(--font-cormorant), serif',
            fontSize: 'clamp(80px, 14vw, 140px)',
            fontWeight: 300,
            color: 'rgba(201,168,76,0.35)',
            lineHeight: 0.8,
            userSelect: 'none',
            marginBottom: '-16px',
          }}
        >
          &ldquo;
        </span>

        <blockquote
          className="reveal reveal-delay-1"
          style={{
            fontFamily: 'var(--font-cormorant), serif',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: 'clamp(20px, 2.8vw, 34px)',
            color: 'rgba(245,240,232,0.9)',
            lineHeight: 1.45,
            margin: 0,
          }}
        >
          Leur équipe a transformé notre terrasse en un espace qui dépasse tout ce que nous avions imaginé. Une maîtrise rare, un sens du détail exceptionnel.
        </blockquote>

        <div
          className="reveal reveal-delay-2"
          style={{ width: '48px', height: '1px', background: 'rgba(201,168,76,0.7)' }}
        />

        <p
          className="reveal reveal-delay-3"
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '10px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'rgba(245,240,232,0.58)',
            fontWeight: 300,
          }}
        >
          Directeur Général · Hôtel Mövenpick, Tunis
        </p>
      </div>
    </section>
  )
}
