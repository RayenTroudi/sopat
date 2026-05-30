'use client'
import { useState, useEffect } from 'react'

export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <button
      onClick={scrollToTop}
      aria-label="Retour en haut"
      style={{
        position: 'fixed',
        bottom: '32px',
        right: '24px',
        zIndex: 99,
        width: '44px',
        height: '44px',
        background: 'var(--green)',
        border: '1px solid rgba(201,168,76,0.4)',
        borderRadius: '50%',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(14px)',
        pointerEvents: visible ? 'all' : 'none',
        transition: 'opacity 0.35s ease, transform 0.35s ease, background 0.3s ease, border-color 0.3s ease',
        boxShadow: '0 4px 20px rgba(15,36,25,0.18)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--gold)'
        e.currentTarget.style.borderColor = 'var(--gold)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--green)'
        e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="var(--ivory)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="1,8 6,3 11,8" />
      </svg>
    </button>
  )
}
