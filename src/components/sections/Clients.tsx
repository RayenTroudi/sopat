'use client'
import Image from 'next/image'

const clients = [
  { name: 'Marriott',       img: '/telechargement-e1640982140501.png' },
  { name: 'Attijari Bank',  img: '/telechargement-e1640982169645.jpg.jpeg' },
  { name: 'BIAT',           img: '/telechargement-5-e1640982347867.png' },
  { name: 'BTL',            img: '/telechargement-4-e1640984790610.png' },
  { name: 'Gourmandise',    img: '/telechargement-3-e1640982314734.png' },
  { name: 'BTE',            img: '/telechargement-2-e1640984805982.png' },
  { name: 'Mövenpick',      img: '/telechargement-1-e1640821027951.png' },
  { name: 'Plaza Sfax',     img: '/logo-plaza-e1640821052505.png' },
  { name: 'The Orangers',   img: '/logo-14525-20190623-113554-e1640984821498.png' },
  { name: 'Laico',          img: '/Laico_Hotels_Resorts.png' },
  { name: 'Citroën',        img: '/citroenlogo-freelogovectors.net_-e1640985029976.png' },
  { name: 'California Gym', img: '/california.png' },
  { name: 'BMW',            img: '/bmw-logo-e1640982192345.png' },
  { name: 'El Emar',        img: '/81621178_2645475882195475_3191527306451484672_n-e1640982222850.jpg.jpeg' },
]

export default function Clients() {
  const doubled = [...clients, ...clients]

  return (
    <section style={{ background: 'var(--white)', padding: '72px 0' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', marginBottom: '36px' }}>
        <p
          style={{
            textAlign: 'center',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '9px',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'rgba(42,42,42,0.55)',
            fontWeight: 300,
          }}
        >
          Ils nous ont fait confiance
        </p>
      </div>

      {/* Marquee with fade edges */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        }}
      >
        <div className="animate-marquee">
          {doubled.map((c, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 16px',
                border: '1px solid rgba(42,42,42,0.10)',
                padding: '12px 28px',
                height: '72px',
                whiteSpace: 'nowrap',
                transition: 'border-color 0.3s, filter 0.3s',
                cursor: 'default',
                flexShrink: 0,
                filter: 'grayscale(100%) opacity(0.65)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(201,168,76,0.35)'
                e.currentTarget.style.filter = 'grayscale(0%) opacity(1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(42,42,42,0.10)'
                e.currentTarget.style.filter = 'grayscale(100%) opacity(0.65)'
              }}
            >
              <Image
                src={c.img}
                alt={c.name}
                width={100}
                height={44}
                style={{ objectFit: 'contain', maxHeight: '44px', width: 'auto' }}
              />
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
