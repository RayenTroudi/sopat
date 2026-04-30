'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function ServicesHero() {
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
        minHeight: '72svh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflow: 'hidden',
        background: 'linear-gradient(155deg, var(--green) 0%, var(--green-dark) 100%)',
      }}
    >
      <Image
        src="/service/Réalisation.jpeg"
        alt="SOPAT — réalisation paysagère"
        fill
        priority
        sizes="100vw"
        style={{ objectFit: 'cover', objectPosition: 'center 40%', opacity: 0.28, mixBlendMode: 'luminosity' }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(15,36,25,0.88) 0%, rgba(15,36,25,0.1) 60%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 50% at 30% 40%, rgba(201,168,76,0.09) 0%, transparent 70%)',
        }}
      />

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
          Des solutions
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
          paysagères <span style={{ color: 'var(--gold)' }}>complètes.</span>
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '15px',
            lineHeight: 1.8,
            color: 'rgba(245,240,232,0.65)',
            fontWeight: 300,
            maxWidth: '560px',
            marginTop: '28px',
            ...fade(340),
          }}
        >
          De la première consultation à l&apos;entretien sur le long terme, SOPAT vous accompagne à chaque étape pour créer des espaces qui éveillent des émotions et résistent à l&apos;épreuve du temps.
        </p>

        <div
          style={{
            marginTop: '36px',
            width: mounted ? '80px' : '0px',
            height: '1px',
            background: 'var(--gold)',
            transition: 'width 1s cubic-bezier(0.25,0.46,0.45,0.94) 500ms',
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
        <div className="scroll-line" style={{ width: '1px', height: '44px', background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.6), transparent)' }} />
        <div className="scroll-dot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(201,168,76,0.6)' }} />
      </div>
    </section>
  )
}
