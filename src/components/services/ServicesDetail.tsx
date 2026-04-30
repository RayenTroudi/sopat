'use client'
import { useScrollReveal } from '@/lib/useScrollReveal'
import Image from 'next/image'
import { useState } from 'react'

const services = [
  {
    num: '01',
    title: 'Études',
    sub: 'Study & Planning',
    img: '/service/Études.jpeg',
    tagline: 'Concevoir avant de créer.',
    desc: "Chaque projet commence par une écoute attentive et une analyse rigoureuse. Nos équipes réalisent une consultation initiale — en personne, par téléphone ou visioconférence — pour comprendre votre vision, vos contraintes et vos ambitions.",
    points: [
      "Consultation initiale et écoute du projet",
      "Inspection et relevé de terrain",
      "Études de faisabilité et conception paysagère",
      "Plans d'exécution et modélisation 3D",
      "Sélection des essences et validation du budget",
    ],
  },
  {
    num: '02',
    title: 'Réalisation',
    sub: 'Construction & Installation',
    img: '/service/Réalisation.jpeg',
    tagline: 'Construire l\'excellence, plante par plante.',
    desc: "Nos équipes terrain transforment chaque plan en espace vivant. Avec des matériaux premium, des végétaux soigneusement sélectionnés et des solutions techniques innovantes, nous créons des espaces verts exclusifs qui dépassent vos attentes.",
    points: [
      "Plantations et aménagements végétaux",
      "Structures, pergolas et éléments architecturaux",
      "Systèmes d'irrigation intelligents",
      "Éclairage paysager et mise en scène nocturne",
      "Piscines biologiques et plans d'eau",
      "Toitures vertes et murs végétaux",
      "Équipements et systèmes technologiques",
    ],
  },
  {
    num: '03',
    title: 'Entretien',
    sub: 'Maintenance',
    img: '/service/Entretien.jpeg',
    tagline: 'Préserver la beauté dans la durée.',
    desc: "Un jardin exceptionnel mérite un suivi exceptionnel. SOPAT propose des contrats de maintenance sur mesure, adaptés à chaque type d'espace et à chaque saison, pour que votre investissement reste impeccable année après année.",
    points: [
      "Contrats de maintenance personnalisés",
      "Taille, élagage et entretien des végétaux",
      "Fertilisation et traitement phytosanitaire",
      "Gestion et optimisation de l'irrigation",
      "Interventions saisonnières et replantations",
      "Suivi et rapport d'état régulier",
    ],
  },
]

export default function ServicesDetail() {
  const ref = useScrollReveal()
  const [active, setActive] = useState(0)

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{ background: 'var(--ivory)', padding: 'clamp(64px, 10vw, 140px) 0' }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>

        {/* Tab selector */}
        <div className="reveal" style={{ display: 'flex', gap: '0', marginBottom: '64px', borderBottom: '1px solid rgba(42,42,42,0.1)' }}>
          {services.map((s, i) => (
            <button
              key={s.num}
              onClick={() => setActive(i)}
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '10px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                fontWeight: 300,
                padding: '16px 28px',
                background: 'none',
                border: 'none',
                borderBottom: active === i ? '2px solid var(--gold)' : '2px solid transparent',
                color: active === i ? 'var(--green)' : 'rgba(42,42,42,0.4)',
                cursor: 'pointer',
                transition: 'color 0.3s ease, border-color 0.3s ease',
                marginBottom: '-1px',
              }}
            >
              <span style={{ color: 'rgba(201,168,76,0.6)', marginRight: '8px', fontFamily: 'var(--font-cormorant), serif', fontSize: '13px' }}>{s.num}</span>
              {s.title}
            </button>
          ))}
        </div>

        {/* Active service detail */}
        {services.map((s, i) => (
          <div
            key={s.num}
            style={{ display: active === i ? 'grid' : 'none' }}
            className="service-detail-grid"
          >
            {/* Left — image */}
            <div
              className="reveal service-img-wrap"
              style={{ position: 'relative', overflow: 'hidden', background: 'var(--green)' }}
            >
              <Image
                src={s.img}
                alt={s.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: 'cover', transition: 'transform 0.7s ease' }}
                className="service-img"
              />
              {/* Number watermark */}
              <span
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '24px',
                  fontFamily: 'var(--font-cormorant), serif',
                  fontSize: '120px',
                  fontWeight: 300,
                  color: 'rgba(245,240,232,0.08)',
                  lineHeight: 1,
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              >
                {s.num}
              </span>
            </div>

            {/* Right — content */}
            <div className="reveal reveal-delay-1" style={{ display: 'flex', flexDirection: 'column', gap: '28px', justifyContent: 'center' }}>
              <div>
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
                  {s.sub}
                </p>
                <h2
                  style={{
                    fontFamily: 'var(--font-cormorant), serif',
                    fontSize: 'clamp(32px, 4vw, 52px)',
                    fontWeight: 300,
                    color: 'var(--green)',
                    margin: 0,
                    lineHeight: 1.1,
                  }}
                >
                  {s.title}
                </h2>
                <p
                  style={{
                    fontFamily: 'var(--font-cormorant), serif',
                    fontStyle: 'italic',
                    fontSize: 'clamp(16px, 1.8vw, 22px)',
                    color: 'rgba(28,61,46,0.5)',
                    fontWeight: 300,
                    marginTop: '8px',
                  }}
                >
                  {s.tagline}
                </p>
              </div>

              <div style={{ width: '48px', height: '1px', background: 'var(--gold)' }} />

              <p
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '15px',
                  lineHeight: 1.85,
                  color: 'rgba(42,42,42,0.82)',
                  fontWeight: 300,
                  margin: 0,
                }}
              >
                {s.desc}
              </p>

              {/* Point list */}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {s.points.map((pt) => (
                  <li
                    key={pt}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontSize: '13px',
                      lineHeight: 1.6,
                      color: 'rgba(42,42,42,0.75)',
                      fontWeight: 300,
                    }}
                  >
                    <span style={{ color: 'var(--gold)', flexShrink: 0, marginTop: '2px', fontSize: '16px', lineHeight: 1 }}>—</span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .service-detail-grid {
          grid-template-columns: 1fr;
          gap: 48px;
          align-items: center;
        }
        .service-img-wrap {
          height: 380px;
        }
        @media (min-width: 768px) {
          .service-detail-grid {
            grid-template-columns: 1fr 1fr;
            gap: 80px;
          }
          .service-img-wrap {
            height: 560px;
          }
        }
        .service-img-wrap:hover .service-img {
          transform: scale(1.04);
        }
      `}</style>
    </section>
  )
}
