'use client'
import { useScrollReveal } from '@/lib/useScrollReveal'
import Image from 'next/image'
import { useState } from 'react'

const images = [
  {
    src: '/propos/the company.jpeg',
    alt: 'SOPAT — la société',
    span: 'tall',
  },
  {
    src: '/propos/the team.jpeg',
    alt: 'SOPAT — notre équipe',
    span: 'normal',
  },
  {
    src: '/propos/theCEO.jpeg',
    alt: 'SOPAT — le directeur général',
    span: 'normal',
  },
]

export default function ProposGallery() {
  const ref = useScrollReveal()
  const [lightbox, setLightbox] = useState<string | null>(null)

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{ background: 'var(--ivory)', padding: 'clamp(64px, 10vw, 120px) 0' }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <div className="reveal" style={{ marginBottom: '48px' }}>
          <p
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '10px',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              fontWeight: 300,
              marginBottom: '12px',
            }}
          >
            Galerie
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-cormorant), serif',
              fontSize: 'clamp(28px, 3.5vw, 46px)',
              fontWeight: 300,
              color: 'var(--green)',
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            L&apos;art du paysage en images
          </h2>
        </div>

        {/* Asymmetric grid */}
        <div className="gallery-grid">
          {/* Left tall image */}
          <div
            className="reveal gallery-tall"
            onClick={() => setLightbox(images[0].src)}
            style={{
              position: 'relative',
              overflow: 'hidden',
              cursor: 'zoom-in',
              background: 'var(--green)',
            }}
          >
            <Image
              src={images[0].src}
              alt={images[0].alt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit: 'cover', transition: 'transform 0.7s ease' }}
              className="gallery-img"
            />
            <div className="gallery-overlay">
              <span className="gallery-label">{images[0].alt}</span>
            </div>
          </div>

          {/* Right column — two stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {images.slice(1, 3).map((img, i) => (
              <div
                key={img.src}
                className={`reveal reveal-delay-${i + 1} gallery-half`}
                onClick={() => setLightbox(img.src)}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'zoom-in',
                  background: 'var(--green)',
                }}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{ objectFit: 'cover', transition: 'transform 0.7s ease' }}
                  className="gallery-img"
                />
                <div className="gallery-overlay">
                  <span className="gallery-label">{img.alt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(8,18,12,0.97)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            aria-label="Fermer"
            style={{
              position: 'absolute',
              top: '20px',
              right: '24px',
              background: 'none',
              border: 'none',
              color: 'rgba(245,240,232,0.55)',
              fontSize: '36px',
              cursor: 'pointer',
              lineHeight: 1,
              fontFamily: 'var(--font-inter), sans-serif',
              fontWeight: 300,
              transition: 'color 0.3s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(245,240,232,0.55)')}
          >
            ×
          </button>
          <div
            style={{ position: 'relative', width: '100%', maxWidth: '1100px', maxHeight: '85vh', aspectRatio: '4/3' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={lightbox}
              alt=""
              fill
              sizes="100vw"
              style={{ objectFit: 'contain' }}
            />
          </div>
        </div>
      )}

      <style>{`
        .gallery-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 3px;
        }
        @media (min-width: 768px) {
          .gallery-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .gallery-tall {
          height: 400px;
        }
        @media (min-width: 768px) {
          .gallery-tall {
            height: 560px;
          }
        }
        .gallery-half {
          height: 200px;
        }
        @media (min-width: 768px) {
          .gallery-half {
            height: 278px;
          }
        }
        .gallery-wide {
          height: 320px;
        }
        @media (min-width: 768px) {
          .gallery-wide {
            height: 400px;
          }
        }
        .gallery-overlay {
          position: absolute;
          inset: 0;
          background: rgba(28,61,46,0);
          display: flex;
          align-items: flex-end;
          padding: 20px;
          transition: background 0.4s ease;
        }
        .gallery-tall:hover .gallery-overlay,
        .gallery-half:hover .gallery-overlay,
        .gallery-wide:hover .gallery-overlay {
          background: rgba(28,61,46,0.55);
        }
        .gallery-label {
          font-family: var(--font-inter), sans-serif;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(245,240,232,0.85);
          font-weight: 300;
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 0.4s ease, transform 0.4s ease;
        }
        .gallery-tall:hover .gallery-label,
        .gallery-half:hover .gallery-label,
        .gallery-wide:hover .gallery-label {
          opacity: 1;
          transform: translateY(0);
        }
        .gallery-tall:hover .gallery-img,
        .gallery-half:hover .gallery-img,
        .gallery-wide:hover .gallery-img {
          transform: scale(1.04);
        }
      `}</style>
    </section>
  )
}
