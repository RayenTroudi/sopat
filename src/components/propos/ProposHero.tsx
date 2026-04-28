'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function ProposHero() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  const fade = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(20px)',
    transition: `opacity 0.9s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms, transform 0.9s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms`,
  })

  return (
    <section
      className="texture-overlay"
      style={{
        position: 'relative',
        minHeight: '80svh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflow: 'hidden',
        background: 'linear-gradient(155deg, var(--green) 0%, var(--green-dark) 100%)',
      }}
    >
      {/* Background — team photo */}
      <Image
        src="/propos/the company.jpeg"
        alt="SOPAT — la société"
        fill
        priority
        sizes="100vw"
        style={{ objectFit: 'cover', objectPosition: 'center 30%', opacity: 0.28, mixBlendMode: 'luminosity' }}
      />

      {/* Bottom gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(15,36,25,0.85) 0%, rgba(15,36,25,0.1) 60%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Gold radial */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 50% at 70% 40%, rgba(201,168,76,0.10) 0%, transparent 70%)',
        }}
      />

      {/* Content */}
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: 'clamp(120px, 16vw, 180px) 24px clamp(64px, 8vw, 100px)',
          position: 'relative',
          zIndex: 1,
          width: '100%',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '10px',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            fontWeight: 300,
            color: 'rgba(201,168,76,0.85)',
            marginBottom: '20px',
            ...fade(0),
          }}
        >
          Société de Paysage de Tunisie
        </p>

        <h1
          style={{
            fontFamily: 'var(--font-cormorant), serif',
            fontSize: 'clamp(48px, 7vw, 88px)',
            fontWeight: 300,
            lineHeight: 0.95,
            color: 'var(--ivory)',
            margin: 0,
            ...fade(120),
          }}
        >
          Notre Histoire,
        </h1>
        <h1
          style={{
            fontFamily: 'var(--font-cormorant), serif',
            fontSize: 'clamp(48px, 7vw, 88px)',
            fontWeight: 300,
            lineHeight: 1.05,
            color: 'var(--ivory)',
            margin: 0,
            ...fade(220),
          }}
        >
          Notre <span style={{ color: 'var(--gold)' }}>Vision.</span>
        </h1>

        {/* Gold divider line */}
        <div
          style={{
            marginTop: '32px',
            width: mounted ? '80px' : '0px',
            height: '1px',
            background: 'var(--gold)',
            transition: 'width 1s cubic-bezier(0.25,0.46,0.45,0.94) 400ms',
          }}
        />
      </div>

      {/* Scroll indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: '28px',
          left: '50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateX(-50%)' : 'translateX(-50%) translateY(12px)',
          transition: 'opacity 0.8s ease 800ms, transform 0.8s ease 800ms',
        }}
      >
        <div
          className="scroll-line"
          style={{
            width: '1px',
            height: '44px',
            background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.6), transparent)',
          }}
        />
        <div
          className="scroll-dot"
          style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(201,168,76,0.6)' }}
        />
      </div>
    </section>
  )
}
