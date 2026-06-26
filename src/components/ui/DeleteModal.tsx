'use client'

import { useEffect, useRef } from 'react'
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react'

type Props = {
  open:        boolean
  title:       string
  description: React.ReactNode
  loading:     boolean
  onConfirm:   () => void
  onClose:     () => void
}

export function DeleteModal({ open, title, description, loading, onConfirm, onClose }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Focus confirm button when modal opens
  useEffect(() => {
    if (open) setTimeout(() => confirmRef.current?.focus(), 50)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, loading, onClose])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 transition-opacity duration-150"
        style={{ background: 'rgba(10, 20, 15, 0.55)', backdropFilter: 'blur(2px)' }}
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        {/* Top accent strip */}
        <div className="h-0.5 w-full" style={{ background: 'var(--admin-red)' }} />

        <div className="p-6 space-y-5">
          {/* Icon + heading */}
          <div className="flex items-start gap-3.5">
            <div
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
              style={{ background: 'var(--admin-red-dim)', border: '1px solid rgba(28,61,46,0.15)' }}
            >
              <AlertTriangle className="w-[18px] h-[18px]" style={{ color: 'var(--admin-red)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3
                id="delete-modal-title"
                className="text-[14px] font-semibold leading-snug"
                style={{ color: 'var(--admin-text)' }}
              >
                {title}
              </h3>
              <div className="mt-1.5 text-[13px] leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
                {description}
              </div>
            </div>
          </div>

          {/* Irreversibility notice */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]"
            style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>Cette action est irréversible · Le code DMS sera rendu obsolète</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-opacity disabled:opacity-40"
              style={{
                background: 'var(--admin-bg)',
                border: '1px solid var(--admin-border)',
                color: 'var(--admin-text-muted)',
              }}
            >
              Annuler
            </button>
            <button
              ref={confirmRef}
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium text-white inline-flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              style={{ background: 'var(--admin-red)' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Suppression…
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
