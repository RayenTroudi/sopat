'use client'
import { useScrollReveal } from '@/lib/useScrollReveal'
import { useState, useRef } from 'react'
import Image from 'next/image'

export default function ProposVideo() {
  const ref = useScrollReveal()
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  function handlePlay() {
    setPlaying(true)
    videoRef.current?.play()
  }

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{ background: 'var(--green-dark)', padding: 'clamp(64px, 10vw, 120px) 0' }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        {/* Label + title */}
        <div className="reveal" style={{ marginBottom: '48px', maxWidth: '640px' }}>
          <p
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '10px',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(201,168,76,0.85)',
              fontWeight: 300,
              marginBottom: '16px',
            }}
          >
            En Images
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-cormorant), serif',
              fontSize: 'clamp(28px, 3.5vw, 46px)',
              fontWeight: 300,
              color: 'var(--ivory)',
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            Découvrez notre savoir-faire à travers la Villa Marsa
          </h2>
        </div>

        {/* Video container */}
        <div
          className="reveal reveal-delay-1"
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/9',
            overflow: 'hidden',
            background: '#000',
          }}
        >
          {/* Actual video — always rendered, hidden until play */}
          <video
            ref={videoRef}
            src="/propos/Villa marsa by sopat.mp4"
            controls
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              outline: 'none',
              opacity: playing ? 1 : 0,
              transition: 'opacity 0.4s ease',
            }}
          />

          {/* Thumbnail overlay — fades out when playing */}
          {!playing && (
            <div
              className="video-thumb"
              onClick={handlePlay}
              role="button"
              aria-label="Lire la vidéo Villa Marsa by SOPAT"
              style={{
                position: 'absolute',
                inset: 0,
                cursor: 'pointer',
              }}
            >
              {/* Thumbnail image */}
              <Image
                src="/propos/thumbnail.png"
                alt="Villa Marsa by SOPAT — aperçu"
                fill
                sizes="(max-width: 1280px) 100vw, 1280px"
                style={{ objectFit: 'cover', transition: 'transform 0.7s ease' }}
                className="video-poster"
              />

              {/* Subtle dark vignette */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 35%, rgba(8,18,12,0.45) 100%)',
                  pointerEvents: 'none',
                }}
              />

              {/* Center play button */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '20px',
                }}
              >
                <div
                  className="play-ring"
                  style={{
                    width: '88px',
                    height: '88px',
                    borderRadius: '50%',
                    border: '1px solid rgba(201,168,76,0.65)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.4s ease, border-color 0.4s ease, transform 0.4s ease',
                  }}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <polygon points="7,3 21,12 7,21" fill="rgba(245,240,232,0.95)" />
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p
                    style={{
                      fontFamily: 'var(--font-cormorant), serif',
                      fontSize: 'clamp(18px, 2vw, 26px)',
                      fontWeight: 300,
                      fontStyle: 'italic',
                      color: 'rgba(245,240,232,0.92)',
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    Villa Marsa by SOPAT
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: '10px',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'rgba(201,168,76,0.75)',
                      fontWeight: 300,
                      marginTop: '6px',
                    }}
                  >
                    Cliquez pour visionner
                  </p>
                </div>
              </div>

              {/* Badge */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '20px',
                  background: 'rgba(15,36,25,0.75)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  padding: '6px 14px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize: '10px',
                    letterSpacing: '0.12em',
                    color: 'rgba(245,240,232,0.7)',
                    fontWeight: 300,
                  }}
                >
                  Vidéo de présentation
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .video-thumb:hover .video-poster {
          transform: scale(1.03);
        }
        .video-thumb:hover .play-ring {
          background: rgba(201,168,76,0.15);
          border-color: var(--gold);
          transform: scale(1.08);
        }
      `}</style>
    </section>
  )
}
