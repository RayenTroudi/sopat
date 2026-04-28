'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'

const stats = [
  { value: '72', label: 'Experts' },
  { value: '+3500', label: 'Projets' },
  { value: '5', label: 'Pays' },
]

export default function Hero() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  const fadeIn = (delay: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(24px)',
    transition: `opacity 0.8s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms, transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms`,
  })

  return (
    <section
      id="accueil"
      className="texture-overlay"
      style={{
        position: 'relative',
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'linear-gradient(155deg, var(--green) 0%, var(--green-dark) 100%)',
      }}
    >
      {/* Hero background image */}
      <Image
        src="/11-scaled.jpg.jpeg"
        alt=""
        fill
        priority
        sizes="100vw"
        style={{ objectFit: 'cover', objectPosition: 'center', opacity: 0.32, mixBlendMode: 'luminosity' }}
      />

      {/* Subtle radial gold glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse 65% 55% at 28% 55%, rgba(201,168,76,0.13) 0%, transparent 70%)',
        }}
      />

      {/* Fine horizontal lines — decorative */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: '20%',
          width: '1px',
          height: '200px',
          background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.2), transparent)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: '80px',
          top: '30%',
          width: '1px',
          height: '120px',
          background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.1), transparent)',
        }}
      />

      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: 'clamp(100px, 14vw, 140px) 24px clamp(80px, 10vw, 120px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Accent label */}
        <p
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '11px',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            fontWeight: 300,
            color: 'rgba(201,168,76,0.85)',
            ...fadeIn(0),
          }}
        >
          Société de Paysage de Tunisie
        </p>

        {/* Headline */}
        <div style={{ maxWidth: '820px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-cormorant), serif',
              fontSize: 'clamp(52px, 8.5vw, 96px)',
              fontWeight: 300,
              lineHeight: 0.95,
              color: 'var(--ivory)',
              margin: 0,
              ...fadeIn(120),
            }}
          >
            L&apos;Art du Paysage
          </h1>
          <h1
            style={{
              fontFamily: 'var(--font-cormorant), serif',
              fontSize: 'clamp(52px, 8.5vw, 96px)',
              fontWeight: 300,
              lineHeight: 1.05,
              color: 'var(--ivory)',
              margin: 0,
              ...fadeIn(220),
            }}
          >
            À Votre{' '}
            <span style={{ color: 'var(--gold)' }}>Service.</span>
          </h1>
        </div>

        {/* Subtext */}
        <p
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '11px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            fontWeight: 300,
            color: 'rgba(245,240,232,0.65)',
            ...fadeIn(340),
          }}
        >
          Architecture paysagère · Tunisie &amp; International
        </p>

        {/* CTA */}
        <div style={{ ...fadeIn(440), display: 'inline-flex', marginTop: '8px' }}>
          <a
            href="#projets"
            style={{
              display: 'inline-block',
              border: '1px solid rgba(245,240,232,0.55)',
              color: 'rgba(245,240,232,0.92)',
              padding: '14px 32px',
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontWeight: 300,
              textDecoration: 'none',
              fontFamily: 'var(--font-inter), sans-serif',
              transition: 'background 0.4s ease, color 0.4s ease, border-color 0.4s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--ivory)'
              e.currentTarget.style.color = 'var(--green)'
              e.currentTarget.style.borderColor = 'var(--ivory)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'rgba(245,240,232,0.92)'
              e.currentTarget.style.borderColor = 'rgba(245,240,232,0.55)'
            }}
          >
            Découvrir nos projets
          </a>
        </div>

        {/* Stat badges */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '16px',
            ...fadeIn(560),
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(245,240,232,0.15)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                padding: '14px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-cormorant), serif',
                  fontSize: '26px',
                  fontWeight: 300,
                  color: 'var(--gold)',
                  lineHeight: 1,
                }}
              >
                {s.value}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '9px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'rgba(245,240,232,0.6)',
                  fontWeight: 300,
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: '32px',
          left: '50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateX(-50%)' : 'translateX(-50%) translateY(16px)',
          transition: 'opacity 0.8s cubic-bezier(0.25,0.46,0.45,0.94) 700ms, transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94) 700ms',
        }}
      >
        <div
          className="scroll-line"
          style={{
            width: '1px',
            height: '52px',
            background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.6), transparent)',
          }}
        />
        <div
          className="scroll-dot"
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: 'rgba(201,168,76,0.6)',
          }}
        />
      </div>
    </section>
  )
}
