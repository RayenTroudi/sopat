'use client'

import { ReactNode, useEffect } from 'react'

// ── KPI Card ─────────────────────────────────────────────────────────────
const accentMap = {
  green: {
    bar: 'var(--admin-emerald)',
    glow: 'var(--admin-emerald-dim)',
    icon: '#4CAF80',
  },
  gold: {
    bar: 'var(--admin-accent)',
    glow: 'var(--admin-accent-glow)',
    icon: 'var(--admin-accent)',
  },
  red: {
    bar: 'var(--admin-red)',
    glow: 'var(--admin-red-dim)',
    icon: 'var(--admin-red)',
  },
  orange: {
    bar: 'var(--admin-amber)',
    glow: 'var(--admin-amber-dim)',
    icon: 'var(--admin-amber)',
  },
  blue: {
    bar: 'var(--admin-blue)',
    glow: 'var(--admin-blue-dim)',
    icon: 'var(--admin-blue)',
  },
}

export function KpiCard({
  label,
  value,
  sub,
  accent = 'green',
  icon,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: 'green' | 'gold' | 'red' | 'orange' | 'blue'
  icon?: ReactNode
}) {
  const colors = accentMap[accent]

  return (
    <div
      className="admin-card-shine relative rounded-xl p-5 flex flex-col gap-3 transition-all duration-200"
      style={{
        background: 'var(--admin-card)',
        border: '1px solid var(--admin-border)',
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-5 right-5 h-px rounded-full opacity-60"
        style={{ background: `linear-gradient(to right, transparent, ${colors.bar}, transparent)` }}
      />

      <div className="flex items-start justify-between">
        <p
          className="text-xs uppercase tracking-widest"
          style={{
            color: 'var(--admin-text-muted)',
            fontFamily: 'var(--font-sans)',
            letterSpacing: '0.1em',
          }}
        >
          {label}
        </p>
        {icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: colors.glow, color: colors.icon }}
          >
            {icon}
          </div>
        )}
      </div>

      <div>
        <p
          className="admin-count-in font-semibold leading-none"
          style={{
            color: 'var(--admin-text)',
            fontFamily: 'var(--font-playfair)',
            fontSize: typeof value === 'number' ? '2rem' : '1.5rem',
          }}
        >
          {value}
        </p>
        {sub && (
          <p
            className="text-xs mt-1.5"
            style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Status Badge ──────────────────────────────────────────────────────────
const statusLabels: Record<string, string> = {
  Active: 'Actif',
  Closed: 'Clôturé',
  Pending: 'En attente',
  Paid: 'Payé',
  Issued: 'Émise',
  Draft: 'Brouillon',
  Overdue: 'En retard',
}

export function Badge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; dot: string }> = {
    Active: { bg: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)', dot: 'var(--admin-emerald)' },
    Closed: { bg: 'rgba(107,138,122,0.1)', color: 'var(--admin-text-muted)', dot: 'var(--admin-text-muted)' },
    Pending: { bg: 'var(--admin-amber-dim)', color: 'var(--admin-amber)', dot: 'var(--admin-amber)' },
    Paid: { bg: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)', dot: 'var(--admin-emerald)' },
    Issued: { bg: 'var(--admin-blue-dim)', color: 'var(--admin-blue)', dot: 'var(--admin-blue)' },
    Draft: { bg: 'rgba(107,138,122,0.1)', color: 'var(--admin-text-muted)', dot: 'var(--admin-text-muted)' },
    Overdue: { bg: 'var(--admin-red-dim)', color: 'var(--admin-red)', dot: 'var(--admin-red)' },
  }
  const c = map[status] ?? { bg: 'rgba(107,138,122,0.1)', color: 'var(--admin-text-muted)', dot: 'var(--admin-text-muted)' }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{
        background: c.bg,
        color: c.color,
        fontFamily: 'var(--font-sans)',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: c.dot }}
      />
      {statusLabels[status] ?? status}
    </span>
  )
}

// ── Margin color helper ───────────────────────────────────────────────────
export function marginColor(pct: number) {
  if (pct > 20) return 'var(--admin-emerald)'
  if (pct >= 5) return 'var(--admin-amber)'
  return 'var(--admin-red)'
}

// ── Modal ─────────────────────────────────────────────────────────────────
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      />
      <div
        className="relative rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto admin-scroll"
        style={{
          background: 'var(--admin-card)',
          border: '1px solid var(--admin-border-light)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--admin-border)' }}
        >
          <h3
            className="font-semibold text-base"
            style={{
              color: 'var(--admin-text)',
              fontFamily: 'var(--font-playfair)',
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150"
            style={{
              color: 'var(--admin-text-muted)',
              background: 'var(--admin-border)',
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ── Form field ────────────────────────────────────────────────────────────
export function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <label
        className="block text-xs uppercase tracking-widest mb-1.5"
        style={{
          color: 'var(--admin-text-muted)',
          fontFamily: 'var(--font-sans)',
          letterSpacing: '0.09em',
        }}
      >
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs mt-1.5 font-sans" style={{ color: 'var(--admin-red)' }}>
          {error}
        </p>
      )}
    </div>
  )
}

export const inputCls = 'admin-input'
export const inputStyle = {}
export const selectCls = 'admin-input'
export const selectStyle = {}

// ── Submit button ─────────────────────────────────────────────────────────
export function SubmitBtn({ loading, label = 'Enregistrer' }: { loading: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full font-semibold text-sm py-2.5 rounded-lg transition-all duration-200 mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: loading ? 'var(--admin-border)' : 'var(--admin-accent)',
        color: loading ? 'var(--admin-text-muted)' : '#0B1012',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {loading ? 'Enregistrement…' : label}
    </button>
  )
}

// ── Section card ─────────────────────────────────────────────────────────
export function Card({
  title,
  children,
  action,
}: {
  title?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div
      className="admin-card-shine rounded-xl"
      style={{
        background: 'var(--admin-card)',
        border: '1px solid var(--admin-border)',
      }}
    >
      {title && (
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--admin-border)' }}
        >
          <h3
            className="font-semibold text-xs uppercase tracking-widest"
            style={{
              color: 'var(--admin-text-muted)',
              fontFamily: 'var(--font-sans)',
              letterSpacing: '0.1em',
            }}
          >
            {title}
          </h3>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────
export function Empty({ message }: { message: string }) {
  return (
    <div
      className="text-center py-12 text-sm font-sans"
      style={{ color: 'var(--admin-text-dim)' }}
    >
      {message}
    </div>
  )
}

// ── Progress bar ─────────────────────────────────────────────────────────
export function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(Math.max(pct, 0), 100)
  const barColor = pct > 100
    ? 'var(--admin-red)'
    : pct > 80
    ? 'var(--admin-amber)'
    : 'var(--admin-emerald)'

  return (
    <div
      className="w-full h-1.5 rounded-full overflow-hidden"
      style={{ background: 'var(--admin-border)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${Math.min(clamped, 100)}%`,
          background: barColor,
          boxShadow: `0 0 6px ${barColor}60`,
        }}
      />
    </div>
  )
}
