'use client'
import Image from 'next/image'
import { useScrollReveal } from '@/lib/useScrollReveal'
import { useState } from 'react'

export default function Contact() {
  const ref = useScrollReveal()
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert('Message envoyé. Nous vous répondrons sous 24h.')
    setForm({ name: '', email: '', message: '' })
  }

  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(42,42,42,0.2)',
    padding: '12px 0',
    fontFamily: 'var(--font-inter), sans-serif',
    fontSize: '14px',
    fontWeight: 300,
    color: 'var(--charcoal)',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.3s ease',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-inter), sans-serif',
    fontSize: '9px',
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: 'rgba(42,42,42,0.6)',
    fontWeight: 300,
  }

  return (
    <section
      id="contact"
      ref={ref as React.RefObject<HTMLElement>}
      style={{ background: 'var(--ivory)' }}
    >
      {/* Main contact area */}
      <div
        style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(64px, 10vw, 140px) 24px' }}
      >
        <div className="contact-grid">
          {/* Left — info */}
          <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
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
                Contact
              </p>
              <h2
                style={{
                  fontFamily: 'var(--font-cormorant), serif',
                  fontSize: 'clamp(30px, 3.8vw, 50px)',
                  fontWeight: 300,
                  color: 'var(--green)',
                  margin: 0,
                }}
              >
                Commençons votre projet
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { label: 'Téléphone', value: '+216 72 236 668', href: 'tel:+21672236668' },
                { label: 'Email', value: 'contact.sopat@gnet.tn', href: 'mailto:contact.sopat@gnet.tn' },
                { label: 'Adresse', value: 'Tunisie', href: undefined },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div
                    style={{
                      width: '1px',
                      height: '16px',
                      background: 'var(--gold)',
                      flexShrink: 0,
                      marginTop: '18px',
                    }}
                  />
                  <div>
                    <p
                      style={{
                        fontFamily: 'var(--font-inter), sans-serif',
                        fontSize: '9px',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        color: 'rgba(42,42,42,0.55)',
                        fontWeight: 300,
                        marginBottom: '4px',
                      }}
                    >
                      {item.label}
                    </p>
                    {item.href ? (
                      <a
                        href={item.href}
                        style={{
                          fontFamily: 'var(--font-inter), sans-serif',
                          fontSize: '14px',
                          fontWeight: 300,
                          color: 'rgba(42,42,42,0.85)',
                          textDecoration: 'none',
                          transition: 'color 0.3s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--green)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(42,42,42,0.7)')}
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p
                        style={{
                          fontFamily: 'var(--font-inter), sans-serif',
                          fontSize: '14px',
                          fontWeight: 300,
                          color: 'rgba(42,42,42,0.85)',
                          margin: 0,
                        }}
                      >
                        {item.value}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — form */}
          <form
            onSubmit={handleSubmit}
            className="reveal reveal-delay-2"
            style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Nom</label>
              <input
                type="text"
                required
                placeholder="Votre nom"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderBottomColor = 'var(--green)')}
                onBlur={(e) => (e.currentTarget.style.borderBottomColor = 'rgba(42,42,42,0.2)')}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                required
                placeholder="votre@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderBottomColor = 'var(--green)')}
                onBlur={(e) => (e.currentTarget.style.borderBottomColor = 'rgba(42,42,42,0.2)')}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Message</label>
              <textarea
                required
                rows={4}
                placeholder="Décrivez votre projet..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                style={{ ...inputStyle, resize: 'none' }}
                onFocus={(e) => (e.currentTarget.style.borderBottomColor = 'var(--green)')}
                onBlur={(e) => (e.currentTarget.style.borderBottomColor = 'rgba(42,42,42,0.2)')}
              />
            </div>
            <div>
              <button
                type="submit"
                style={{
                  background: 'var(--gold)',
                  color: 'var(--ivory)',
                  border: 'none',
                  padding: '14px 32px',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '11px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  fontWeight: 300,
                  cursor: 'pointer',
                  transition: 'opacity 0.3s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Envoyer
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer bar */}
      <div
        style={{
          borderTop: '1px solid rgba(42,42,42,0.1)',
          background: 'var(--mist)',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
          className="footer-inner"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Image
              src="/sopaNoBg.png"
              alt="SOPAT"
              width={26}
              height={26}
              style={{ objectFit: 'contain', opacity: 0.7 }}
            />
            <span
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '11px',
                fontWeight: 300,
                letterSpacing: '0.08em',
                color: 'rgba(42,42,42,0.6)',
              }}
            >
              © {new Date().getFullYear()} SOPAT · Société de Paysage de Tunisie
            </span>
          </div>

          {/* Facebook SVG icon */}
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            style={{
              color: 'rgba(42,42,42,0.45)',
              transition: 'color 0.3s ease',
              lineHeight: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--green)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(42,42,42,0.28)')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>
        </div>
      </div>

      <style>{`
        .contact-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 64px;
        }
        @media (min-width: 768px) {
          .contact-grid {
            grid-template-columns: 1fr 1fr;
            gap: 96px;
          }
        }
        .footer-inner {
          flex-direction: column;
        }
        @media (min-width: 640px) {
          .footer-inner {
            flex-direction: row !important;
          }
        }
      `}</style>
    </section>
  )
}
