import Link from 'next/link'
import Image from 'next/image'

export default function WpFooter() {
  const year = new Date().getFullYear()
  return (
    <footer style={{ background: 'var(--green-dark)', borderTop: '1px solid rgba(201,168,76,0.15)', padding: 'clamp(40px,6vw,72px) 0 clamp(24px,4vw,40px)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px', marginBottom: 'clamp(32px,4vw,48px)' }}>
          <div>
            <Image
              src="/logo-768x519.svg"
              alt="SOPAT"
              width={100}
              height={68}
              style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)', marginBottom: '16px' }}
            />
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', lineHeight: 1.8, color: 'rgba(245,240,232,0.45)', fontWeight: 300, maxWidth: '260px' }}>
              Société de Paysage de Tunisie. Architecture paysagère haut de gamme.
            </p>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.7)', marginBottom: '20px', fontWeight: 300 }}>Navigation</p>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Accueil', href: '/' },
                { label: 'Blog', href: '/posts' },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="footer-link">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.7)', marginBottom: '20px', fontWeight: 300 }}>Contact</p>
            <a href="https://sopat.tn" target="_blank" rel="noopener noreferrer" className="footer-link">
              sopat.tn
            </a>
          </div>
        </div>
        <div style={{ height: '1px', background: 'rgba(245,240,232,0.08)', marginBottom: '24px' }} />
        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', color: 'rgba(245,240,232,0.28)', fontWeight: 300, textAlign: 'center', letterSpacing: '0.06em' }}>
          © {year} SOPAT · Société de Paysage de Tunisie
        </p>
      </div>

      <style>{`
        .footer-link {
          font-family: var(--font-inter), sans-serif;
          font-size: 12px;
          color: rgba(245,240,232,0.55);
          text-decoration: none;
          font-weight: 300;
          transition: color 0.3s;
        }
        .footer-link:hover { color: var(--gold); }
      `}</style>
    </footer>
  )
}
