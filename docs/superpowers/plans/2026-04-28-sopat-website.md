# SOPAT Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, premium single-page Next.js website for SOPAT, a Tunisian international landscape architecture firm.

**Architecture:** App Router with a single root page (`src/app/page.tsx`) that composes section components. Each section lives in `src/components/sections/`. Shared primitives (hooks, utilities) live in `src/lib/`. Global styles and CSS custom properties are defined in `src/app/globals.css`.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, Google Fonts (Cormorant Garamond + Inter), vanilla CSS animations, IntersectionObserver for scroll reveals.

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/app/globals.css` | CSS custom properties, base resets, font imports, animations |
| `src/app/layout.tsx` | Root layout, font loading, metadata |
| `src/app/page.tsx` | Page composition — renders all sections in order |
| `src/components/Nav.tsx` | Sticky nav, scroll-aware transparency, mobile hamburger |
| `src/components/sections/Hero.tsx` | Full-vh hero, headline, CTA, stat badges, scroll indicator |
| `src/components/sections/About.tsx` | Pull quote + description, gold divider |
| `src/components/sections/Services.tsx` | 3 service cards + pill tags |
| `src/components/sections/Projects.tsx` | Filter tabs + asymmetric grid |
| `src/components/sections/Process.tsx` | 4-step timeline, horizontal desktop / vertical mobile |
| `src/components/sections/Clients.tsx` | Infinite CSS marquee with fade edges |
| `src/components/sections/Testimonial.tsx` | Single centered quote |
| `src/components/sections/Contact.tsx` | Two-column contact + form + footer bar |
| `src/lib/useScrollReveal.ts` | IntersectionObserver hook for scroll-reveal animations |
| `src/lib/useScrolled.ts` | Hook that returns true when window.scrollY > threshold |
| `public/logo-sopat.png` | Full color logo (already present) |
| `public/sopaNoBg.png` | Transparent bg logo for nav (already present) |

---

## Task 1: Global Styles & Fonts

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Update globals.css**

Replace entire content of `src/app/globals.css` with:

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --green: #1C3D2E;
  --green-dark: #0F2419;
  --ivory: #F5F0E8;
  --gold: #C9A84C;
  --charcoal: #2A2A2A;
  --mist: #E8E4DC;
  --white: #FFFFFF;
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: var(--ivory);
  color: var(--charcoal);
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
}

.font-display {
  font-family: 'Cormorant Garamond', serif;
}

/* Scroll reveal */
.reveal {
  opacity: 0;
  transform: translateY(32px);
  transition: opacity 0.7s ease, transform 0.7s ease;
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
.reveal-delay-1 { transition-delay: 0.1s; }
.reveal-delay-2 { transition-delay: 0.2s; }
.reveal-delay-3 { transition-delay: 0.3s; }
.reveal-delay-4 { transition-delay: 0.4s; }

/* Marquee animation */
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.animate-marquee {
  animation: marquee 28s linear infinite;
  display: flex;
  width: max-content;
}

/* Organic texture overlay (CSS noise) */
.texture-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
  opacity: 0.06;
}

/* Gold line divider */
.gold-divider {
  width: 2px;
  background: linear-gradient(to bottom, transparent, var(--gold), transparent);
}

/* Project card gradient placeholders */
.project-placeholder-1 { background: linear-gradient(135deg, #1C3D2E 0%, #2D5A42 50%, #1a3828 100%); }
.project-placeholder-2 { background: linear-gradient(135deg, #2D4A3E 0%, #3D6B55 50%, #1C3D2E 100%); }
.project-placeholder-3 { background: linear-gradient(135deg, #1a2e1f 0%, #2A4A35 50%, #3D5C45 100%); }
.project-placeholder-4 { background: linear-gradient(135deg, #243d2d 0%, #1C3D2E 40%, #0F2419 100%); }
.project-placeholder-5 { background: linear-gradient(135deg, #2e4a3a 0%, #1C3D2E 60%, #263d30 100%); }
.project-placeholder-6 { background: linear-gradient(135deg, #1a3325 0%, #2D5040 50%, #1C3D2E 100%); }
.project-placeholder-7 { background: linear-gradient(135deg, #243328 0%, #3A5C47 50%, #1C3D2E 100%); }
.project-placeholder-8 { background: linear-gradient(135deg, #1C3D2E 0%, #243d30 40%, #2D5A42 100%); }
```

- [ ] **Step 2: Update layout.tsx**

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SOPAT — Architecture Paysagère · Tunisie & International',
  description: 'Société de Paysage de Tunisie. Architecture paysagère haut de gamme depuis des décennies. 72 experts, +3500 projets, 5 pays.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Extend tailwind.config.ts with brand colors**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        green: { DEFAULT: '#1C3D2E', dark: '#0F2419' },
        gold: '#C9A84C',
        ivory: '#F5F0E8',
        charcoal: '#2A2A2A',
        mist: '#E8E4DC',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 4: Commit**
```bash
git add src/app/globals.css src/app/layout.tsx tailwind.config.ts
git commit -m "feat: global styles, fonts, CSS custom properties"
```

---

## Task 2: Utility Hooks

**Files:**
- Create: `src/lib/useScrolled.ts`
- Create: `src/lib/useScrollReveal.ts`

- [ ] **Step 1: Create useScrolled.ts**

```ts
'use client'
import { useEffect, useState } from 'react'

export function useScrolled(threshold = 60) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > threshold)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [threshold])
  return scrolled
}
```

- [ ] **Step 2: Create useScrollReveal.ts**

```ts
'use client'
import { useEffect, useRef } from 'react'

export function useScrollReveal() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const targets = el.querySelectorAll<HTMLElement>('.reveal')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 }
    )
    targets.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  }, [])
  return ref
}
```

- [ ] **Step 3: Commit**
```bash
git add src/lib/
git commit -m "feat: scroll utility hooks"
```

---

## Task 3: Navigation Component

**Files:**
- Create: `src/components/Nav.tsx`

- [ ] **Step 1: Create Nav.tsx**

```tsx
'use client'
import Image from 'next/image'
import { useState } from 'react'
import { useScrolled } from '@/lib/useScrolled'

const links = [
  { label: 'Accueil', href: '#accueil' },
  { label: 'À Propos', href: '#apropos' },
  { label: 'Services', href: '#services' },
  { label: 'Projets', href: '#projets' },
  { label: 'Contact', href: '#contact' },
]

export default function Nav() {
  const scrolled = useScrolled(60)
  const [open, setOpen] = useState(false)

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'bg-green border-b border-gold/20 py-3' : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <a href="#accueil" className="flex items-center gap-3">
            <Image src="/sopaNoBg.png" alt="SOPAT" width={44} height={44} className="object-contain" />
            <span
              className="font-display text-2xl font-light tracking-widest"
              style={{ color: 'var(--gold)' }}
            >
              SOPAT
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-ivory/80 hover:text-gold text-sm tracking-widest uppercase font-light transition-colors duration-300"
                style={{ letterSpacing: '0.12em' }}
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setOpen(true)}
            aria-label="Menu"
          >
            <span className="w-6 h-px bg-ivory block" />
            <span className="w-4 h-px bg-gold block" />
            <span className="w-6 h-px bg-ivory block" />
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-[100] bg-green flex flex-col items-center justify-center">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-6 right-6 text-ivory/60 hover:text-gold text-3xl"
            aria-label="Fermer"
          >
            ×
          </button>
          <nav className="flex flex-col items-center gap-8">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="font-display text-4xl text-ivory/80 hover:text-gold italic transition-colors duration-300"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/Nav.tsx
git commit -m "feat: sticky nav with scroll-aware transparency and mobile overlay"
```

---

## Task 4: Hero Section

**Files:**
- Create: `src/components/sections/Hero.tsx`

- [ ] **Step 1: Create Hero.tsx**

```tsx
'use client'
import { useEffect, useState } from 'react'

const stats = [
  { value: '72', label: 'Experts' },
  { value: '+3500', label: 'Projets' },
  { value: '5', label: 'Pays' },
]

export default function Hero() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setTimeout(() => setMounted(true), 100) }, [])

  return (
    <section
      id="accueil"
      className="relative min-h-screen flex flex-col justify-center texture-overlay overflow-hidden"
      style={{ background: 'linear-gradient(160deg, var(--green) 0%, var(--green-dark) 100%)' }}
    >
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 30% 50%, rgba(201,168,76,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 pt-28 pb-20 flex flex-col gap-8">
        {/* Accent label */}
        <p
          className={`text-gold/70 text-xs tracking-[0.25em] uppercase font-light transition-all duration-700 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Société de Paysage de Tunisie
        </p>

        {/* Headline */}
        <div className="max-w-3xl">
          <h1
            className={`font-display font-light leading-none transition-all duration-700 delay-100 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
            style={{ fontSize: 'clamp(56px, 8vw, 96px)', color: 'var(--ivory)' }}
          >
            L&apos;Art du Paysage
          </h1>
          <h1
            className={`font-display font-light leading-none transition-all duration-700 delay-200 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
            style={{ fontSize: 'clamp(56px, 8vw, 96px)', color: 'var(--ivory)' }}
          >
            À Votre{' '}
            <span style={{ color: 'var(--gold)' }}>Service.</span>
          </h1>
        </div>

        {/* Subtext */}
        <p
          className={`text-ivory/50 text-sm tracking-[0.2em] uppercase font-light transition-all duration-700 delay-300 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Architecture paysagère · Tunisie &amp; International
        </p>

        {/* CTA */}
        <div
          className={`transition-all duration-700 delay-[400ms] ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <a
            href="#projets"
            className="inline-block border border-ivory/40 text-ivory/80 px-8 py-3.5 text-sm tracking-[0.15em] uppercase font-light hover:bg-ivory hover:text-green transition-all duration-400"
          >
            Découvrir nos projets
          </a>
        </div>

        {/* Stat badges */}
        <div
          className={`flex flex-wrap gap-4 mt-4 transition-all duration-700 delay-500 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              className="backdrop-blur-sm border border-ivory/10 px-5 py-3 flex flex-col gap-0.5"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <span className="font-display text-2xl text-gold font-light">{s.value}</span>
              <span className="text-ivory/50 text-xs tracking-widest uppercase">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <div
          className="w-px bg-gradient-to-b from-transparent via-gold/60 to-transparent"
          style={{ height: '48px', animation: 'pulse 2s ease-in-out infinite' }}
        />
        <div
          className="w-1.5 h-1.5 rounded-full bg-gold/60"
          style={{ animation: 'bounce 2s ease-in-out infinite' }}
        />
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/sections/Hero.tsx
git commit -m "feat: hero section with headline, CTA, stat badges, scroll indicator"
```

---

## Task 5: About Section

**Files:**
- Create: `src/components/sections/About.tsx`

- [ ] **Step 1: Create About.tsx**

```tsx
'use client'
import { useScrollReveal } from '@/lib/useScrollReveal'

export default function About() {
  const ref = useScrollReveal()

  return (
    <section
      id="apropos"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 md:py-36"
      style={{ background: 'var(--ivory)' }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row gap-12 md:gap-0 items-start">
          {/* Pull quote */}
          <div className="md:w-1/2 md:pr-16 reveal">
            <blockquote
              className="font-display italic font-light leading-snug"
              style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', color: 'var(--green)' }}
            >
              &ldquo;Nous créons des jardins qui racontent une histoire.&rdquo;
            </blockquote>
            <div className="mt-6 w-12 h-px" style={{ background: 'var(--gold)' }} />
          </div>

          {/* Vertical gold divider — desktop only */}
          <div className="hidden md:block gold-divider self-stretch mx-0 reveal reveal-delay-1" style={{ minHeight: '120px' }} />

          {/* Description */}
          <div className="md:w-1/2 md:pl-16 flex flex-col gap-5 reveal reveal-delay-2">
            <p className="text-sm tracking-[0.18em] uppercase text-gold font-light mb-2">À Propos</p>
            <p className="text-charcoal/80 leading-relaxed text-base font-light">
              Fondée avec l'ambition de redéfinir le paysage tunisien et au-delà, SOPAT réunit une équipe interdisciplinaire de 72 experts — architectes paysagistes, ingénieurs, botanistes et techniciens — unis par une même exigence d'excellence.
            </p>
            <p className="text-charcoal/80 leading-relaxed text-base font-light">
              De la Villa privée aux complexes hôteliers internationaux, en passant par les espaces corporate et les résidences de prestige, nos réalisations témoignent d'un savoir-faire reconnu à travers la Tunisie, la France, les Émirats et au-delà. Chaque projet est une conversation entre la nature, l'architecture et l'usage humain.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/sections/About.tsx
git commit -m "feat: about strip with pull quote and gold divider"
```

---

## Task 6: Services Section

**Files:**
- Create: `src/components/sections/Services.tsx`

- [ ] **Step 1: Create Services.tsx**

```tsx
'use client'
import { useScrollReveal } from '@/lib/useScrollReveal'

const services = [
  {
    num: '01',
    title: 'Études',
    sub: 'Study & Planning',
    desc: 'Analyse de site, études de faisabilité, conception paysagère, plans d\'exécution et modélisation 3D pour une vision complète avant la première pierre.',
  },
  {
    num: '02',
    title: 'Réalisation',
    sub: 'Construction & Installation',
    desc: 'Mise en œuvre de tous les corps d\'état du paysage : plantations, structures, irrigation, éclairage, piscines biologiques et équipements technologiques.',
  },
  {
    num: '03',
    title: 'Entretien',
    sub: 'Maintenance',
    desc: 'Contrats de maintenance sur mesure, taille, fertilisation, gestion de l\'eau et interventions saisonnières pour préserver la beauté dans le temps.',
  },
]

const tags = [
  'Irrigation', 'Éclairage', 'Toitures Vertes', 'Bio-Piscines',
  'Structures', 'Systèmes Technologiques',
]

export default function Services() {
  const ref = useScrollReveal()

  return (
    <section
      id="services"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 md:py-36"
      style={{ background: 'var(--green)' }}
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Section label */}
        <p className="text-gold text-xs tracking-[0.25em] uppercase font-light mb-12 reveal">
          Nos Services
        </p>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-ivory/10">
          {services.map((s, i) => (
            <div
              key={s.num}
              className={`group bg-green p-10 flex flex-col gap-4 cursor-default reveal reveal-delay-${i + 1} hover:bg-green-dark transition-colors duration-500 relative overflow-hidden`}
            >
              {/* Gold left border on hover */}
              <div
                className="absolute left-0 top-0 bottom-0 w-0.5 bg-gold transition-all duration-500 opacity-0 group-hover:opacity-100"
              />
              <span
                className="font-display text-6xl font-light leading-none select-none"
                style={{ color: 'rgba(201,168,76,0.15)', transition: 'color 0.5s' }}
              >
                {s.num}
              </span>
              <div>
                <h3 className="font-display text-3xl text-ivory font-light">{s.title}</h3>
                <p className="text-gold/60 text-xs tracking-widest uppercase mt-1 font-light">{s.sub}</p>
              </div>
              <p className="text-ivory/60 text-sm leading-relaxed font-light">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Pill tags */}
        <div className="mt-14 overflow-x-auto pb-2 reveal">
          <div className="flex gap-3 w-max md:w-auto md:flex-wrap">
            {tags.map((tag) => (
              <span
                key={tag}
                className="border border-gold/30 text-gold/70 text-xs tracking-[0.15em] uppercase px-4 py-2 font-light whitespace-nowrap hover:border-gold hover:text-gold transition-colors duration-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/sections/Services.tsx
git commit -m "feat: services section with hover cards and pill tags"
```

---

## Task 7: Projects Showcase

**Files:**
- Create: `src/components/sections/Projects.tsx`

- [ ] **Step 1: Create Projects.tsx**

```tsx
'use client'
import { useState } from 'react'
import { useScrollReveal } from '@/lib/useScrollReveal'

const projects = [
  { name: 'Villa Notre-Dame', category: 'Villa', placeholder: 'project-placeholder-1', tall: true },
  { name: 'Villa Marsa', category: 'Villa', placeholder: 'project-placeholder-2', tall: false },
  { name: 'Villa Manar', category: 'Villa', placeholder: 'project-placeholder-3', tall: false },
  { name: 'Villa Jardins de Carthage', category: 'Villa', placeholder: 'project-placeholder-4', tall: true },
  { name: 'Novotel Tunis Lac', category: 'Hôtel', placeholder: 'project-placeholder-5', tall: false },
  { name: 'Hotel Laico Tunis', category: 'Hôtel', placeholder: 'project-placeholder-6', tall: true },
  { name: 'Hotel Mövenpick', category: 'Hôtel', placeholder: 'project-placeholder-7', tall: false },
  { name: 'The Residence', category: 'Résidence', placeholder: 'project-placeholder-8', tall: false },
]

const filters = ['Tous', 'Villa', 'Hôtel', 'Résidence', 'Entreprise']

export default function Projects() {
  const [active, setActive] = useState('Tous')
  const ref = useScrollReveal()

  const visible = active === 'Tous' ? projects : projects.filter((p) => p.category === active)

  return (
    <section
      id="projets"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 md:py-36"
      style={{ background: 'var(--ivory)' }}
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14 reveal">
          <div>
            <p className="text-gold text-xs tracking-[0.25em] uppercase font-light mb-3">Nos Projets</p>
            <h2
              className="font-display font-light"
              style={{ fontSize: 'clamp(36px, 4vw, 56px)', color: 'var(--green)' }}
            >
              Des réalisations qui inspirent
            </h2>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActive(f)}
                className={`text-xs tracking-[0.15em] uppercase px-4 py-2 font-light transition-all duration-300 ${
                  active === f
                    ? 'bg-green text-ivory'
                    : 'border border-charcoal/20 text-charcoal/60 hover:border-green hover:text-green'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Masonry-style grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4 reveal reveal-delay-1">
          {visible.map((p) => (
            <div key={p.name} className="break-inside-avoid group relative overflow-hidden cursor-pointer">
              <div
                className={`${p.placeholder} w-full transition-transform duration-700 group-hover:scale-105`}
                style={{ height: p.tall ? '420px' : '280px' }}
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-green/70 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
                <span className="text-gold text-xs tracking-[0.2em] uppercase font-light mb-2">{p.category}</span>
                <h3 className="font-display text-ivory text-2xl font-light">{p.name}</h3>
                <div
                  className="mt-2 h-px bg-gold transition-all duration-500 w-0 group-hover:w-12"
                  style={{ transitionDelay: '0.1s' }}
                />
              </div>
              {/* Category badge (always visible) */}
              <div className="absolute top-4 left-4 bg-green/80 backdrop-blur-sm px-3 py-1">
                <span className="text-gold/80 text-xs tracking-widest uppercase font-light">{p.category}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Ghost button */}
        <div className="flex justify-center mt-16 reveal reveal-delay-2">
          <button className="border border-green/40 text-green/70 text-sm tracking-[0.15em] uppercase px-8 py-3.5 font-light hover:border-green hover:text-green transition-all duration-300">
            Voir tous les projets
          </button>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/sections/Projects.tsx
git commit -m "feat: projects showcase with filter tabs and masonry grid"
```

---

## Task 8: Process Timeline

**Files:**
- Create: `src/components/sections/Process.tsx`

- [ ] **Step 1: Create Process.tsx**

```tsx
'use client'
import { useScrollReveal } from '@/lib/useScrollReveal'

const steps = [
  { n: '01', title: 'Première Consultation', desc: 'Écoute, analyse du site et définition des objectifs du projet.' },
  { n: '02', title: 'Études & Conception', desc: 'Plans, rendus 3D, choix des essences et validation du budget.' },
  { n: '03', title: 'Réalisation', desc: 'Mise en œuvre par nos équipes terrain avec suivi qualité rigoureux.' },
  { n: '04', title: 'Entretien & Suivi', desc: 'Maintenance régulière pour préserver l\'esthétique dans la durée.' },
]

export default function Process() {
  const ref = useScrollReveal()

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 md:py-36"
      style={{ background: 'var(--charcoal)' }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-gold text-xs tracking-[0.25em] uppercase font-light mb-4 reveal">Notre Approche</p>
        <h2
          className="font-display font-light text-ivory mb-16 reveal reveal-delay-1"
          style={{ fontSize: 'clamp(36px, 4vw, 56px)' }}
        >
          Un processus éprouvé
        </h2>

        {/* Desktop: horizontal timeline */}
        <div className="hidden md:block relative reveal reveal-delay-2">
          {/* Connecting line */}
          <div
            className="absolute top-8 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(to right, transparent, var(--gold), transparent)' }}
          />
          <div className="grid grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div key={s.n} className={`flex flex-col gap-4 reveal reveal-delay-${i + 1}`}>
                {/* Number circle */}
                <div
                  className="w-16 h-16 rounded-full border border-gold/60 flex items-center justify-center relative z-10"
                  style={{ background: 'var(--charcoal)' }}
                >
                  <span className="font-display text-gold text-xl font-light">{s.n}</span>
                </div>
                <h3 className="font-display text-ivory text-xl font-light mt-2">{s.title}</h3>
                <p className="text-ivory/40 text-sm leading-relaxed font-light">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: vertical timeline */}
        <div className="md:hidden flex flex-col gap-0 relative">
          <div
            className="absolute left-8 top-0 bottom-0 w-px"
            style={{ background: 'linear-gradient(to bottom, transparent, var(--gold), transparent)' }}
          />
          {steps.map((s, i) => (
            <div key={s.n} className={`flex gap-6 pb-10 reveal reveal-delay-${i + 1}`}>
              <div
                className="w-16 h-16 rounded-full border border-gold/60 flex items-center justify-center flex-shrink-0 relative z-10"
                style={{ background: 'var(--charcoal)' }}
              >
                <span className="font-display text-gold text-xl font-light">{s.n}</span>
              </div>
              <div className="pt-4">
                <h3 className="font-display text-ivory text-xl font-light">{s.title}</h3>
                <p className="text-ivory/40 text-sm leading-relaxed font-light mt-2">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/sections/Process.tsx
git commit -m "feat: process timeline section, horizontal desktop / vertical mobile"
```

---

## Task 9: Client Logos Marquee

**Files:**
- Create: `src/components/sections/Clients.tsx`

- [ ] **Step 1: Create Clients.tsx**

```tsx
export default function Clients() {
  const clients = ['Novotel', 'Mövenpick', 'Laico Hotels', 'BMW', 'Citroën', 'The Orangers', 'California', 'Plaza']
  const doubled = [...clients, ...clients]

  return (
    <section className="py-20" style={{ background: 'var(--white)' }}>
      <div className="max-w-7xl mx-auto px-6 mb-10">
        <p className="text-center text-xs tracking-[0.25em] uppercase text-charcoal/40 font-light">
          Ils nous ont fait confiance
        </p>
      </div>

      {/* Marquee wrapper with fade edges */}
      <div
        className="relative overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        }}
      >
        <div className="animate-marquee">
          {doubled.map((c, i) => (
            <span
              key={i}
              className="inline-block mx-6 border border-charcoal/15 text-charcoal/50 text-sm tracking-[0.15em] uppercase font-light px-6 py-2.5 whitespace-nowrap hover:border-gold hover:text-gold transition-colors duration-300"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/sections/Clients.tsx
git commit -m "feat: infinite CSS marquee with fade edges"
```

---

## Task 10: Testimonial Section

**Files:**
- Create: `src/components/sections/Testimonial.tsx`

- [ ] **Step 1: Create Testimonial.tsx**

```tsx
'use client'
import { useScrollReveal } from '@/lib/useScrollReveal'

export default function Testimonial() {
  const ref = useScrollReveal()

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-28 md:py-40 text-center relative overflow-hidden"
      style={{ background: 'var(--green)' }}
    >
      {/* Decorative radial */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(201,168,76,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-6 flex flex-col items-center gap-6">
        {/* Oversized opening quote */}
        <span
          className="font-display text-gold/30 select-none leading-none -mb-4 reveal"
          style={{ fontSize: 'clamp(80px, 12vw, 140px)' }}
        >
          &ldquo;
        </span>

        <blockquote
          className="font-display italic font-light text-ivory leading-snug reveal reveal-delay-1"
          style={{ fontSize: 'clamp(22px, 3vw, 36px)' }}
        >
          Leur équipe a transformé notre terrasse en un espace qui dépasse tout ce que nous avions imaginé. Une maîtrise rare, un sens du détail exceptionnel.
        </blockquote>

        <div className="w-8 h-px bg-gold/60 reveal reveal-delay-2" />

        <p className="text-ivory/40 text-sm tracking-[0.15em] uppercase font-light reveal reveal-delay-3">
          Directeur Général · Hôtel Mövenpick, Tunis
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/sections/Testimonial.tsx
git commit -m "feat: testimonial section with editorial quote layout"
```

---

## Task 11: Contact & Footer

**Files:**
- Create: `src/components/sections/Contact.tsx`

- [ ] **Step 1: Create Contact.tsx**

```tsx
'use client'
import Image from 'next/image'
import { useScrollReveal } from '@/lib/useScrollReveal'
import { useState } from 'react'

export default function Contact() {
  const ref = useScrollReveal()
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Form submission placeholder — wire to backend or email service
    alert('Message envoyé. Nous vous répondrons sous 24h.')
    setForm({ name: '', email: '', message: '' })
  }

  return (
    <section
      id="contact"
      ref={ref as React.RefObject<HTMLElement>}
      style={{ background: 'var(--ivory)' }}
    >
      {/* Main contact area */}
      <div className="max-w-7xl mx-auto px-6 py-24 md:py-36 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24">
        {/* Left */}
        <div className="flex flex-col gap-8 reveal">
          <div>
            <p className="text-gold text-xs tracking-[0.25em] uppercase font-light mb-4">Contact</p>
            <h2
              className="font-display font-light"
              style={{ fontSize: 'clamp(32px, 4vw, 52px)', color: 'var(--green)' }}
            >
              Commençons votre projet
            </h2>
          </div>

          <div className="flex flex-col gap-4 text-charcoal/70 text-sm font-light leading-relaxed">
            <div className="flex items-start gap-4">
              <div className="w-px h-4 bg-gold mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs tracking-widest uppercase text-charcoal/40 mb-1">Téléphone</p>
                <a href="tel:+21672236668" className="hover:text-green transition-colors duration-300">
                  +216 72 236 668
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-px h-4 bg-gold mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs tracking-widest uppercase text-charcoal/40 mb-1">Email</p>
                <a href="mailto:contact.sopat@gnet.tn" className="hover:text-green transition-colors duration-300">
                  contact.sopat@gnet.tn
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-px h-4 bg-gold mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs tracking-widest uppercase text-charcoal/40 mb-1">Adresse</p>
                <p>Tunisie</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right — form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 reveal reveal-delay-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-[0.15em] uppercase text-charcoal/40 font-light">Nom</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-transparent border-b border-charcoal/20 focus:border-green py-2.5 text-charcoal text-sm outline-none transition-colors duration-300 font-light"
              placeholder="Votre nom"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-[0.15em] uppercase text-charcoal/40 font-light">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="bg-transparent border-b border-charcoal/20 focus:border-green py-2.5 text-charcoal text-sm outline-none transition-colors duration-300 font-light"
              placeholder="votre@email.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs tracking-[0.15em] uppercase text-charcoal/40 font-light">Message</label>
            <textarea
              required
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="bg-transparent border-b border-charcoal/20 focus:border-green py-2.5 text-charcoal text-sm outline-none transition-colors duration-300 font-light resize-none"
              placeholder="Décrivez votre projet..."
            />
          </div>
          <button
            type="submit"
            className="mt-2 self-start px-8 py-3.5 text-sm tracking-[0.15em] uppercase font-light text-ivory transition-all duration-300 hover:opacity-90"
            style={{ background: 'var(--gold)' }}
          >
            Envoyer
          </button>
        </form>
      </div>

      {/* Footer bar */}
      <div
        className="border-t"
        style={{ borderColor: 'rgba(42,42,42,0.1)', background: 'var(--mist)' }}
      >
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/sopaNoBg.png" alt="SOPAT" width={28} height={28} className="object-contain opacity-60" />
            <span className="text-charcoal/40 text-xs font-light tracking-widest">
              © {new Date().getFullYear()} SOPAT · Société de Paysage de Tunisie
            </span>
          </div>
          {/* Facebook icon SVG */}
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-charcoal/30 hover:text-green transition-colors duration-300"
            aria-label="Facebook"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/sections/Contact.tsx
git commit -m "feat: contact form and footer section"
```

---

## Task 12: Compose Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace page.tsx**

```tsx
import Nav from '@/components/Nav'
import Hero from '@/components/sections/Hero'
import About from '@/components/sections/About'
import Services from '@/components/sections/Services'
import Projects from '@/components/sections/Projects'
import Process from '@/components/sections/Process'
import Clients from '@/components/sections/Clients'
import Testimonial from '@/components/sections/Testimonial'
import Contact from '@/components/sections/Contact'

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <About />
        <Services />
        <Projects />
        <Process />
        <Clients />
        <Testimonial />
        <Contact />
      </main>
    </>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/app/page.tsx
git commit -m "feat: compose full page from section components"
```

---

## Task 13: Clean up boilerplate

**Files:**
- Delete: `src/app/page.tsx` default imports (already replaced above)
- Modify: `src/app/globals.css` (remove Next.js defaults — done in Task 1)

- [ ] **Step 1: Remove unused Next.js boilerplate files**
```bash
rm -f src/app/favicon.ico 2>/dev/null || true
```
No code change needed — boilerplate was already replaced in globals.css.

- [ ] **Step 2: Verify build passes**
```bash
npm run build 2>&1 | tail -20
```
Expected: `✓ Compiled successfully` (or similar).

- [ ] **Step 3: Commit any cleanup**
```bash
git add -A
git commit -m "chore: remove boilerplate, verify build"
```
