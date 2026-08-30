'use client'

/**
 * Boîte de dialogue de confirmation — même langage visuel que `DeleteModal`,
 * mais ouverte : titre, description, contenu libre (un formulaire de motif,
 * typiquement) et deux actions.
 *
 * Elle existe parce qu'une décision tracée ISO ne peut pas passer par
 * `window.confirm` / `window.prompt` : le natif ne sait pas rendre un champ
 * obligatoire, ne se style pas, n'annonce rien aux lecteurs d'écran au-delà de
 * son texte, et n'empêche pas de valider à vide.
 *
 * `DeleteModal` reste le raccourci dédié aux suppressions ; tout le reste passe
 * par ici.
 */

import { useEffect, useRef } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'

type Tone = 'danger' | 'neutral'

type Props = {
  open:         boolean
  title:        string
  description:  React.ReactNode
  /** Champs de saisie éventuels — motif, justification… */
  children?:    React.ReactNode
  confirmLabel: string
  /** Libellé affiché pendant la soumission. Défaut : « Enregistrement… ». */
  loadingLabel?: string
  /** Icône du bouton de confirmation. */
  confirmIcon?: React.ReactNode
  tone?:        Tone
  loading:      boolean
  /** `false` verrouille la confirmation — un motif vide, par exemple. */
  canConfirm?:  boolean
  onConfirm:    () => void
  onClose:      () => void
}

const TONE = {
  danger:  { accent: 'var(--admin-red)',  dim: 'var(--admin-red-dim)' },
  neutral: { accent: 'var(--green)',      dim: 'var(--admin-accent-dim)' },
} as const

export function ConfirmModal({
  open,
  title,
  description,
  children,
  confirmLabel,
  loadingLabel = 'Enregistrement…',
  confirmIcon,
  tone = 'neutral',
  loading,
  canConfirm = true,
  onConfirm,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { accent, dim } = TONE[tone]

  // Le focus va au premier champ s'il y en a un — c'est lui qu'on vient
  // remplir — sinon au bouton de confirmation.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      const panel = panelRef.current
      if (!panel) return
      const field = panel.querySelector<HTMLElement>('textarea, input, select')
      ;(field ?? panel.querySelector<HTMLElement>('[data-confirm]'))?.focus()
    }, 50)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, loading, onClose])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 transition-opacity duration-150"
        style={{ background: 'rgba(10, 20, 15, 0.55)', backdropFilter: 'blur(2px)' }}
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        <div className="h-0.5 w-full" style={{ background: accent }} />

        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3.5">
            <div
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
              style={{ background: dim, border: '1px solid rgba(28,61,46,0.15)' }}
            >
              <AlertTriangle className="w-[18px] h-[18px]" style={{ color: accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3
                id="confirm-modal-title"
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

          {children}

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
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
              type="button"
              data-confirm
              onClick={onConfirm}
              disabled={loading || !canConfirm}
              className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium text-white inline-flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
              style={{ background: accent }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {loadingLabel}
                </>
              ) : (
                <>
                  {confirmIcon}
                  {confirmLabel}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
