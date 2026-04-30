'use client'
import Nav from '@/components/Nav'
import { getProjectBySlug, getAdjacentProjects, projects } from '@/lib/projects'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'

function Gallery({ images }: { images: string[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null)

  const close = useCallback(() => setLightbox(null), [])
  const prev = useCallback(() => setLightbox((i) => (i !== null ? (i - 1 + images.length) % images.length : 0)), [images.length])
  const next = useCallback(() => setLightbox((i) => (i !== null ? (i + 1) % images.length : 0)), [images.length])

  useEffect(() => {
    if (lightbox === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, close, prev, next])

  const main = images[0]
  const rest = images.slice(1)

  return (
    <>
      {/* Hero image */}
      <div
        style={{ position: 'relative', width: '100%', height: 'clamp(400px, 55vw, 680px)', cursor: 'zoom-in', marginBottom: '3px' }}
        onClick={() => setLightbox(0)}
      >
        <Image src={main} alt="Project" fill sizes="100vw" style={{ objectFit: 'cover' }} priority />
      </div>

      {/* Grid of remaining images */}
      {rest.length > 0 && (
        <div className="project-gallery-grid">
          {rest.map((img, i) => (
            <div
              key={img}
              style={{ position: 'relative', aspectRatio: '4/3', cursor: 'zoom-in', overflow: 'hidden', background: 'var(--green)' }}
              onClick={() => setLightbox(i + 1)}
            >
              <Image
                src={img}
                alt={`Project image ${i + 2}`}
                fill
                sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 33vw"
                style={{ objectFit: 'cover', transition: 'transform 0.5s ease' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1)')}
              />
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(10,22,16,0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={close}
        >
          <div style={{ position: 'relative', width: '90vw', height: '85vh' }} onClick={(e) => e.stopPropagation()}>
            <Image src={images[lightbox]} alt="Project" fill sizes="90vw" style={{ objectFit: 'contain' }} />
          </div>
          {/* Counter */}
          <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(245,240,232,0.5)', fontWeight: 300 }}>
            {lightbox + 1} / {images.length}
          </div>
          {/* Close */}
          <button onClick={close} style={{ position: 'absolute', top: '24px', right: '32px', background: 'none', border: 'none', color: 'rgba(245,240,232,0.7)', fontSize: '28px', cursor: 'pointer', lineHeight: 1 }}>×</button>
          {/* Prev */}
          {images.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); prev() }} style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'var(--ivory)', fontSize: '22px', cursor: 'pointer', padding: '12px 16px', backdropFilter: 'blur(4px)' }}>‹</button>
          )}
          {/* Next */}
          {images.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); next() }} style={{ position: 'absolute', right: '24px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'var(--ivory)', fontSize: '22px', cursor: 'pointer', padding: '12px 16px', backdropFilter: 'blur(4px)' }}>›</button>
          )}
        </div>
      )}
    </>
  )
}

export default function ProjectDetailPage() {
  const params = useParams()
  const slug = typeof params.slug === 'string' ? params.slug : Array.isArray(params.slug) ? params.slug[0] : ''
  const project = getProjectBySlug(slug)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  if (!project) {
    return (
      <>
        <Nav />
        <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ivory)' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(42,42,42,0.4)', marginBottom: '16px' }}>Projet introuvable</p>
            <Link href="/projects" style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--green)', textDecoration: 'none' }}>← Tous les projets</Link>
          </div>
        </main>
      </>
    )
  }

  const { prev: prevProject, next: nextProject } = getAdjacentProjects(slug)

  const categoryColor: Record<string, string> = {
    Villa: 'rgba(201,168,76,0.85)',
    Résidence: 'rgba(201,168,76,0.85)',
    Hôtel: 'rgba(201,168,76,0.85)',
    Entreprise: 'rgba(201,168,76,0.85)',
    Restauration: 'rgba(201,168,76,0.85)',
  }

  return (
    <>
      <Nav />
      <main>
        {/* Hero overlay with first image */}
        <section
          className="texture-overlay"
          style={{
            position: 'relative',
            minHeight: '52svh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            overflow: 'hidden',
            background: 'linear-gradient(155deg, var(--green) 0%, var(--green-dark) 100%)',
          }}
        >
          <Image
            src={project.images[0]}
            alt={project.name}
            fill
            priority
            sizes="100vw"
            style={{ objectFit: 'cover', objectPosition: 'center 40%', opacity: 0.3, mixBlendMode: 'luminosity' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,36,25,0.90) 0%, transparent 60%)', pointerEvents: 'none' }} />

          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: 'clamp(120px, 16vw, 180px) 24px clamp(48px, 6vw, 72px)', position: 'relative', zIndex: 1, width: '100%' }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', opacity: mounted ? 1 : 0, transition: 'opacity 0.6s ease' }}>
              <Link href="/projects" style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.45)', textDecoration: 'none', fontWeight: 300 }}>Projets</Link>
              <span style={{ color: 'rgba(245,240,232,0.25)', fontSize: '10px' }}>›</span>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.7)', fontWeight: 300 }}>{project.category}</span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-cormorant), serif',
                fontSize: 'clamp(40px, 6vw, 72px)',
                fontWeight: 300,
                lineHeight: 1.05,
                color: 'var(--ivory)',
                margin: '0 0 16px',
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.8s ease 80ms, transform 0.8s ease 80ms',
              }}
            >
              {project.name}
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '11px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'rgba(245,240,232,0.45)',
                fontWeight: 300,
                margin: 0,
                opacity: mounted ? 1 : 0,
                transition: 'opacity 0.8s ease 180ms',
              }}
            >
              {project.location}
            </p>
          </div>
        </section>

        {/* Content */}
        <section style={{ background: 'var(--ivory)', padding: 'clamp(48px, 7vw, 96px) 0' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>

            {/* Description + Quote row */}
            <div className="project-meta-row">
              <div style={{ flex: '1 1 320px' }}>
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: categoryColor[project.category], fontWeight: 300, marginBottom: '16px' }}>{project.category}</p>
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px', lineHeight: 1.85, color: 'rgba(42,42,42,0.72)', fontWeight: 300, maxWidth: '540px', margin: 0 }}>{project.description}</p>
              </div>
              <div style={{ flex: '0 0 auto', maxWidth: '360px', paddingLeft: 'clamp(0px, 4vw, 64px)', borderLeft: '1px solid rgba(42,42,42,0.1)' }}>
                <div style={{ width: '32px', height: '1px', background: 'var(--gold)', marginBottom: '20px' }} />
                <blockquote style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(20px, 2.2vw, 26px)', fontWeight: 300, fontStyle: 'italic', color: 'var(--green)', lineHeight: 1.4, margin: 0 }}>
                  &ldquo;{project.quote}&rdquo;
                </blockquote>
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(42,42,42,0.35)', fontWeight: 300, marginTop: '16px', marginBottom: 0 }}>SOPAT</p>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(42,42,42,0.08)', margin: 'clamp(40px, 5vw, 64px) 0' }} />

            {/* Gallery */}
            <Gallery images={project.images} />
          </div>
        </section>

        {/* Adjacent project navigation */}
        <section style={{ background: 'var(--mist)', borderTop: '1px solid rgba(42,42,42,0.08)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: prevProject && nextProject ? '1fr 1fr' : '1fr', gap: 0 }}>
            {prevProject && (
              <AdjacentCard project={prevProject} direction="prev" hasBorder={!!nextProject} />
            )}
            {nextProject && (
              <AdjacentCard project={nextProject} direction="next" hasBorder={false} />
            )}
          </div>
        </section>

        {/* Footer bar */}
        <div style={{ borderTop: '1px solid rgba(42,42,42,0.1)', background: 'var(--mist)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '11px', fontWeight: 300, letterSpacing: '0.08em', color: 'rgba(42,42,42,0.45)' }}>
              © {new Date().getFullYear()} SOPAT · Société de Paysage de Tunisie
            </span>
            <Link href="/projects" style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(42,42,42,0.4)', textDecoration: 'none', fontWeight: 300, transition: 'color 0.3s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--green)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(42,42,42,0.4)')}
            >
              ← Tous les projets
            </Link>
          </div>
        </div>
      </main>

      <style>{`
        .project-gallery-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 3px;
        }
        @media (min-width: 600px) {
          .project-gallery-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (min-width: 1024px) {
          .project-gallery-grid { grid-template-columns: 1fr 1fr 1fr; }
        }
        .project-meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: clamp(32px, 5vw, 64px);
          align-items: flex-start;
        }
      `}</style>
    </>
  )
}

function AdjacentCard({ project, direction, hasBorder }: { project: ReturnType<typeof getProjectBySlug>; direction: 'prev' | 'next'; hasBorder: boolean }) {
  const [hovered, setHovered] = useState(false)
  if (!project) return null
  return (
    <Link
      href={`/projects/${project.slug}`}
      style={{ textDecoration: 'none', display: 'block', borderRight: hasBorder ? '1px solid rgba(42,42,42,0.08)' : 'none' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }}>
        <Image src={project.images[0]} alt={project.name} fill sizes="50vw" style={{ objectFit: 'cover', transition: 'transform 0.7s ease', transform: hovered ? 'scale(1.04)' : 'scale(1)', opacity: 0.55 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,36,25,0.85) 0%, rgba(15,36,25,0.3) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '28px 32px', alignItems: direction === 'next' ? 'flex-end' : 'flex-start' }}>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.75)', fontWeight: 300, marginBottom: '8px' }}>
            {direction === 'prev' ? '← Précédent' : 'Suivant →'}
          </p>
          <h3 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(18px, 2vw, 24px)', fontWeight: 300, color: 'var(--ivory)', margin: 0, lineHeight: 1.1, textAlign: direction === 'next' ? 'right' : 'left' }}>
            {project.name}
          </h3>
        </div>
      </div>
    </Link>
  )
}
