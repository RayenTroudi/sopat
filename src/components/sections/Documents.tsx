'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useScrollReveal } from '@/lib/useScrollReveal'

const documents = [
  {
    href: '/docs/sopat-portfolio.pdf',
    title: 'Portfolio SOPAT',
    kind: 'Portfolio',
    description:
      'Notre book de références : villas, résidences, hôtels et sièges d\'entreprises, en Tunisie et à l\'international.',
    size: '6,1 Mo',
    featured: true,
    image: '/projects/hotel-one-resort/3.jpg',
  },
  {
    href: '/docs/convention-partenariat-sopat-diar-yasmine.pdf',
    title: 'Convention de partenariat SOPAT × Diar Yasmine',
    kind: 'Partenariat RSE',
    description:
      'Notre engagement RSE formalisé avec la résidence Diar Yasmine Plage à Tazarka : littoral préservé, actions solidaires.',
    size: '0,2 Mo',
    featured: false,
    image: '/projects/residence-diar-yasmine/2.jpg',
  },
  {
    href: '/docs/note-concept-sopat-diar-yasmine.pdf',
    title: 'Note de concept SOPAT × Diar Yasmine',
    kind: 'Partenariat RSE',
    description:
      'La vision paysagère et environnementale du partenariat : solutions fondées sur la nature en bord de mer.',
    size: '0,4 Mo',
    featured: false,
    image: '/projects/residence-diar-yasmine/5.jpg',
  },
]

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M4 19h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DocumentCard({ doc }: { doc: (typeof documents)[number] }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
      href={doc.href}
      download
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        background: '#ffffff',
        border: '1px solid rgba(28,61,46,0.12)',
        overflow: 'hidden',
        transition: 'box-shadow 0.4s ease, transform 0.4s ease',
        boxShadow: hovered ? '0 18px 44px rgba(28,61,46,0.14)' : '0 2px 10px rgba(28,61,46,0.05)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        gridColumn: doc.featured ? 'span 1' : undefined,
      }}
      className={doc.featured ? 'doc-card doc-card-featured' : 'doc-card'}
    >
      <div style={{ position: 'relative', height: doc.featured ? '260px' : '180px', overflow: 'hidden' }}>
        <Image
          src={doc.image}
          alt={doc.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          style={{
            objectFit: 'cover',
            transition: 'transform 0.7s ease',
            transform: hovered ? 'scale(1.05)' : 'scale(1)',
          }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(28,61,46,0.55), transparent 55%)' }} />
        <span
          style={{
            position: 'absolute',
            top: '14px',
            left: '14px',
            background: 'rgba(28,61,46,0.72)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            padding: '6px 12px',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '9px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'rgba(201,168,76,0.9)',
            fontWeight: 300,
          }}
        >
          {doc.kind}
        </span>
      </div>

      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        <h3 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: doc.featured ? '26px' : '21px', fontWeight: 400, color: 'var(--green)', margin: 0, lineHeight: 1.15 }}>
          {doc.title}
        </h3>
        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', lineHeight: 1.7, color: 'rgba(42,42,42,0.62)', fontWeight: 300, margin: 0, flex: 1 }}>
          {doc.description}
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '6px',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '10px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight: 300,
            color: hovered ? 'var(--gold)' : 'rgba(28,61,46,0.65)',
            transition: 'color 0.35s ease',
          }}
        >
          <DownloadIcon />
          Télécharger le PDF
          <span style={{ color: 'rgba(42,42,42,0.35)', letterSpacing: '0.08em', textTransform: 'none' }}>· {doc.size}</span>
        </div>
      </div>
    </a>
  )
}

export default function Documents() {
  const ref = useScrollReveal()
  return (
    <section
      id="documents"
      ref={ref as React.RefObject<HTMLElement>}
      style={{ background: 'var(--ivory)', padding: 'clamp(64px, 9vw, 120px) 0', borderTop: '1px solid rgba(28,61,46,0.08)' }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <div className="reveal" style={{ marginBottom: '48px', maxWidth: '640px' }}>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 300, marginBottom: '12px' }}>
            Portfolio &amp; Documents
          </p>
          <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 300, color: 'var(--green)', margin: 0 }}>
            Notre savoir-faire, noir sur blanc
          </h2>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', lineHeight: 1.8, color: 'rgba(42,42,42,0.6)', fontWeight: 300, marginTop: '16px' }}>
            Téléchargez notre portfolio de références et découvrez nos engagements de
            partenariat — des documents pensés pour vos appels d&apos;offres et vos projets.
          </p>
        </div>

        <div className="reveal reveal-delay-1 documents-grid">
          {documents.map((doc) => (
            <DocumentCard key={doc.href} doc={doc} />
          ))}
        </div>
      </div>

      <style>{`
        .documents-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 700px) {
          .documents-grid { grid-template-columns: repeat(2, 1fr); }
          .doc-card-featured { grid-column: span 2; }
        }
        @media (min-width: 1024px) {
          .documents-grid { grid-template-columns: repeat(3, 1fr); }
          .doc-card-featured { grid-column: span 1; }
        }
      `}</style>
    </section>
  )
}
