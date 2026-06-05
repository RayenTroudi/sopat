'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function AdminLoginPage() {
  const router = useRouter()
  const [callbackUrl, setCallbackUrl] = useState('/admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Read callbackUrl from search params safely after mount — avoids SSR/Suspense issues
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cb = params.get('callbackUrl')
    if (cb) setCallbackUrl(cb)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (result?.error) {
        setError('Email ou mot de passe incorrect')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError('Erreur réseau, veuillez réessayer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100svh', display: 'flex', background: '#F5F0E8' }}>

      {/* Left panel — green brand strip */}
      <div style={{
        display: 'none',
        width: '50%',
        flexShrink: 0,
        background: '#1C3D2E',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px',
      }} className="lg-panel">
        <Image
          src="/logo-768x519.svg"
          alt="SOPAT"
          width={140}
          height={95}
          priority
          style={{ filter: 'brightness(0) invert(1)' }}
        />
        <div>
          <p style={{ fontFamily: 'var(--font-cormorant, serif)', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 300, lineHeight: 1.15, color: '#F5F0E8', margin: 0 }}>
            Gestion financière<br />des projets paysagers
          </p>
          <div style={{ marginTop: '24px', width: '40px', height: '1px', background: '#C9A84C' }} />
        </div>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', fontFamily: 'var(--font-inter, sans-serif)' }}>
          SOPAT Admin v2.0
        </p>
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
        <div style={{ width: '100%', maxWidth: '320px' }}>

          {/* Mobile logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }} className="mobile-logo">
            <Image src="/logo-768x519.svg" alt="SOPAT" width={120} height={81} priority />
          </div>

          <p style={{ fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(42,42,42,0.4)', fontFamily: 'var(--font-inter, sans-serif)', fontWeight: 300, marginBottom: '32px' }}>
            Espace administration
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(42,42,42,0.5)', fontFamily: 'var(--font-inter, sans-serif)', fontWeight: 300, marginBottom: '8px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="admin@sopat.tn"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                  border: '1px solid #E8E4DC',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: '#2A2A2A',
                  fontFamily: 'var(--font-inter, sans-serif)',
                  outline: 'none',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(28,61,46,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(28,61,46,0.08)' }}
                onBlur={(e) => { e.target.style.borderColor = '#E8E4DC'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(42,42,42,0.5)', fontFamily: 'var(--font-inter, sans-serif)', fontWeight: 300, marginBottom: '8px' }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                  border: '1px solid #E8E4DC',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: '#2A2A2A',
                  fontFamily: 'var(--font-inter, sans-serif)',
                  outline: 'none',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(28,61,46,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(28,61,46,0.08)' }}
                onBlur={(e) => { e.target.style.borderColor = '#E8E4DC'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            {error && (
              <p role="alert" style={{ fontSize: '13px', color: '#D94F4F', fontFamily: 'var(--font-inter, sans-serif)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? '#4a7a60' : '#1C3D2E',
                color: '#F5F0E8',
                border: 'none',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '13px',
                fontWeight: 500,
                letterSpacing: '0.08em',
                fontFamily: 'var(--font-inter, sans-serif)',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <div style={{ marginTop: '40px', height: '1px', background: '#E8E4DC' }} />
          <p style={{ marginTop: '24px', fontSize: '11px', color: 'rgba(42,42,42,0.3)', fontFamily: 'var(--font-inter, sans-serif)', textAlign: 'center', fontWeight: 300 }}>
            © {new Date().getFullYear()} SOPAT — Usage interne uniquement
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .lg-panel { display: flex !important; }
          .mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  )
}
