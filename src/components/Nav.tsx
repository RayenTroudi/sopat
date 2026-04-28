'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useScrolled } from '@/lib/useScrolled'

const links = [
  { label: 'Accueil', href: '/#accueil' },
  { label: 'À Propos', href: '/propos' },
  { label: 'Services', href: '/#services' },
  { label: 'Projets', href: '/#projets' },
  { label: 'Contact', href: '/#contact' },
]

export default function Nav() {
  const scrolled = useScrolled(60)
  const [open, setOpen] = useState(false)

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          transition: 'background 0.5s ease, padding 0.4s ease, border-color 0.5s ease',
          background: scrolled ? 'var(--green)' : 'transparent',
          borderBottom: scrolled ? '1px solid rgba(201,168,76,0.30)' : '1px solid transparent',
          padding: scrolled ? '12px 0' : '20px 0',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <a href="/#accueil" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Image
              src="/logo-768x519.png"
              alt="SOPAT"
              width={120}
              height={81}
              style={{ objectFit: 'contain' }}
            />
          </a>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '36px' }} className="hidden-mobile">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                style={{
                  color: 'rgba(245,240,232,0.88)',
                  textDecoration: 'none',
                  fontSize: '11px',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  fontWeight: 300,
                  transition: 'color 0.3s ease',
                  fontFamily: 'var(--font-inter), sans-serif',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(245,240,232,0.88)')}
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le menu"
            className="show-mobile"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              padding: '8px',
            }}
          >
            <span style={{ width: '24px', height: '1px', background: 'var(--ivory)', display: 'block' }} />
            <span style={{ width: '16px', height: '1px', background: 'var(--gold)', display: 'block' }} />
            <span style={{ width: '24px', height: '1px', background: 'var(--ivory)', display: 'block' }} />
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background: 'var(--green)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 0.35s ease, transform 0.35s ease',
          opacity: open ? 1 : 0,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          pointerEvents: open ? 'all' : 'none',
        }}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Fermer le menu"
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            background: 'none',
            border: 'none',
            color: 'rgba(245,240,232,0.5)',
            fontSize: '32px',
            cursor: 'pointer',
            lineHeight: 1,
            transition: 'color 0.3s',
            fontFamily: 'var(--font-inter), sans-serif',
            fontWeight: 300,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(245,240,232,0.5)')}
        >
          ×
        </button>

        <nav style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
          {links.map((l, i) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{
                fontFamily: 'var(--font-cormorant), serif',
                fontSize: 'clamp(32px, 8vw, 48px)',
                fontWeight: 300,
                fontStyle: 'italic',
                color: 'rgba(245,240,232,0.8)',
                textDecoration: 'none',
                transition: 'color 0.3s ease',
                transitionDelay: `${i * 0.05}s`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(245,240,232,0.8)')}
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .hidden-mobile { display: flex !important; }
          .show-mobile { display: none !important; }
        }
        @media (max-width: 767px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </>
  )
}
