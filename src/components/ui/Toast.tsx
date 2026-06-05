'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning'

type Toast = {
  id:      string
  message: string
  type:    ToastType
}

type ToastContextValue = {
  toast:   (message: string, type?: ToastType) => void
  success: (message: string) => void
  error:   (message: string) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

// ─── Individual toast ─────────────────────────────────────────────────────────

const TYPE_STYLES: Record<ToastType, { bg: string; text: string; border: string; icon: string }> = {
  success: { bg: 'var(--admin-emerald-dim)', text: 'var(--admin-emerald)', border: 'var(--admin-emerald)', icon: '✓' },
  error:   { bg: 'var(--admin-red-dim)',     text: 'var(--admin-red)',     border: 'var(--admin-red)',     icon: '✕' },
  info:    { bg: 'var(--admin-blue-dim)',    text: 'var(--admin-blue)',    border: 'var(--admin-blue)',    icon: 'i' },
  warning: { bg: 'var(--admin-amber-dim)',   text: 'var(--admin-amber)',   border: 'var(--admin-amber)',   icon: '!' },
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const s = TYPE_STYLES[toast.type]

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss(toast.id), 300)
    }, 4000)
    return () => clearTimeout(t)
  }, [toast.id, onDismiss])

  return (
    <div
      role="alert"
      style={{
        background:  s.bg,
        border:      `1px solid ${s.border}`,
        borderRadius: 10,
        padding:     '12px 16px',
        display:     'flex',
        alignItems:  'center',
        gap:         10,
        minWidth:    260,
        maxWidth:    400,
        boxShadow:   '0 4px 16px rgba(0,0,0,0.10)',
        transition:  'all 0.3s ease',
        opacity:     visible ? 1 : 0,
        transform:   visible ? 'translateX(0)' : 'translateX(32px)',
        fontFamily:  'var(--font-sans)',
      }}
    >
      <span style={{ color: s.text, fontWeight: 700, fontSize: 13, lineHeight: 1, flexShrink: 0 }}>{s.icon}</span>
      <span style={{ color: s.text, fontSize: 13, lineHeight: 1.4, flex: 1 }}>{toast.message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300) }}
        style={{ color: s.text, opacity: 0.6, fontSize: 12, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 2 }}
        aria-label="Fermer"
      >✕</button>
    </div>
  )
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${++counter.current}`
    setToasts((prev) => [...prev.slice(-4), { id, message, type }])
  }, [])

  const success = useCallback((message: string) => toast(message, 'success'), [toast])
  const error   = useCallback((message: string) => toast(message, 'error'),   [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        style={{
          position:      'fixed',
          bottom:        24,
          right:         24,
          zIndex:        9999,
          display:       'flex',
          flexDirection: 'column',
          gap:           8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'all' }}>
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
