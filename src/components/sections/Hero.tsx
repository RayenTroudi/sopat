'use client'
import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'

const slides = [
  { src: '/BTE-.jpg.jpeg', label: 'Projet BTE' },
  { src: '/81-M.jpg.jpeg', label: 'Aménagement paysager' },
  { src: '/MVS_7371.jpg.jpeg', label: 'Jardin résidentiel' },
  { src: '/villa-marsa.jpg.jpeg', label: 'Villa Marsa' },
  { src: '/MVS_4733.jpg.jpeg', label: 'Réalisation paysagère' },
  { src: '/9-scaled.jpg.jpeg', label: 'Espace vert' },
  { src: '/11-scaled.jpg.jpeg', label: 'Architecture paysagère' },
]

const stats = [
  { value: '72', label: 'Experts' },
  { value: '+3500', label: 'Projets' },
  { value: '5', label: 'Pays' },
]

export default function Hero() {
  const [mounted, setMounted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [prev, setPrev] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  const goTo = useCallback((index: number) => {
    setPrev((c) => c)
    setCurrent(index)
    const t = setTimeout(() => setPrev(null), 900)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((c) => {
        const next = (c + 1) % slides.length
        setPrev(c)
        setTimeout(() => setPrev(null), 900)
        return next
      })
    }, 5000)
    return () => clearInterval(interval)
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
        background: '#0a0a0a',
      }}
    >
      {/* Slider image layer — isolated at z=0 so all UI stays above */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {slides.map((slide, i) => {
          const isActive = i === current
          const isPrev = i === prev
          return (
            <Image
              key={slide.src}
              src={slide.src}
              alt={slide.label}
              fill
              priority={i === 0}
              sizes="100vw"
              style={{
                objectFit: 'cover',
                objectPosition: 'center',
                opacity: isActive ? 0.72 : isPrev ? 0.72 : 0,
                zIndex: isActive ? 2 : isPrev ? 1 : 0,
                transition: 'opacity 0.9s cubic-bezier(0.4,0,0.2,1)',
              }}
            />
          )
        })}
      </div>

      {/* Dark overlay for text legibility */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background: 'linear-gradient(to right, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.1) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Subtle gold glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse 65% 55% at 28% 55%, rgba(201,168,76,0.10) 0%, transparent 70%)',
        }}
      />

      {/* Fine vertical lines — decorative */}
      <div style={{ position: 'absolute', zIndex: 2, right: 0, top: '20%', width: '1px', height: '200px', background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.2), transparent)' }} />
      <div style={{ position: 'absolute', zIndex: 2, right: '80px', top: '30%', width: '1px', height: '120px', background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.1), transparent)' }} />

      {/* Content */}
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: 'clamp(100px, 14vw, 140px) 24px clamp(80px, 10vw, 120px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 300, color: 'rgb(201,168,76)', ...fadeIn(0) }}>
          Société de Paysage de Tunisie
        </p>

        <div style={{ maxWidth: '820px' }}>
          <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(52px, 8.5vw, 96px)', fontWeight: 300, lineHeight: 0.95, color: '#ffffff', margin: 0, ...fadeIn(120) }}>
            L&apos;Art du Paysage
          </h1>
          <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(52px, 8.5vw, 96px)', fontWeight: 300, lineHeight: 1.05, color: '#ffffff', margin: 0, ...fadeIn(220) }}>
            À Votre{' '}
            <span style={{ color: 'var(--gold)' }}>Service.</span>
          </h1>
        </div>

        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 300, color: '#f5f0e8', ...fadeIn(340) }}>
          Architecture paysagère · Tunisie &amp; International
        </p>

        <div style={{ ...fadeIn(440), display: 'inline-flex', marginTop: '8px' }}>
          <a
            href="#projets"
            style={{ display: 'inline-block', border: '1px solid #f5f0e8', color: '#f5f0e8', padding: '14px 32px', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 300, textDecoration: 'none', fontFamily: 'var(--font-inter), sans-serif', transition: 'background 0.4s ease, color 0.4s ease, border-color 0.4s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ivory)'; e.currentTarget.style.color = 'var(--green)'; e.currentTarget.style.borderColor = 'var(--ivory)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#f5f0e8'; e.currentTarget.style.borderColor = '#f5f0e8' }}
          >
            Découvrir nos projets
          </a>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px', ...fadeIn(560) }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(245,240,232,0.15)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '26px', fontWeight: 300, color: 'var(--gold)', lineHeight: 1 }}>{s.value}</span>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#f5f0e8', fontWeight: 300 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Slide dots */}
      <div
        style={{
          position: 'absolute',
          bottom: '80px',
          right: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 3,
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.8s ease 800ms',
        }}
      >
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            style={{
              width: i === current ? '2px' : '1px',
              height: i === current ? '28px' : '16px',
              background: i === current ? 'rgba(201,168,76,0.9)' : 'rgba(245,240,232,0.35)',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.4s ease',
              display: 'block',
            }}
          />
        ))}
      </div>

      {/* Slide label */}
      <div
        style={{
          position: 'absolute',
          bottom: '80px',
          left: '24px',
          zIndex: 3,
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.8s ease 800ms',
        }}
      >
        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.45)', fontWeight: 300, margin: 0 }}>
          {String(current + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')} — {slides[current].label}
        </p>
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
        <div style={{ width: '1px', height: '52px', background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.6), transparent)' }} />
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(201,168,76,0.6)' }} />
      </div>
    </section>
  )
}
