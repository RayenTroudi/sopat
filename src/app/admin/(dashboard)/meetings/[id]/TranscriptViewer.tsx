'use client'

import { useState } from 'react'

/**
 * Transcription affichée SÉPARÉMENT du compte rendu, et repliée par défaut.
 *
 * Deux raisons : le compte rendu est ce que l'on consulte au quotidien, et
 * mélanger les deux laisserait croire que les propos bruts ont la même valeur
 * que l'analyse validée. Le repli évite aussi de déverser des milliers de mots
 * dans la page à chaque ouverture.
 */
export default function TranscriptViewer({
  plainText,
  wordCount,
  provider,
}: {
  plainText: string
  wordCount: number
  provider: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            Transcription
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            {wordCount.toLocaleString('fr-FR')} mots · source : {provider}
          </p>
        </div>
        <span className="text-[13px]" style={{ color: 'var(--admin-accent)' }}>
          {open ? 'Masquer' : 'Afficher'}
        </span>
      </button>

      {open && (
        <div
          className="px-5 pb-5 max-h-[480px] overflow-y-auto text-[13px] whitespace-pre-wrap leading-relaxed"
          style={{ color: 'var(--admin-text)', borderTop: '1px solid var(--admin-border)' }}
        >
          <p className="pt-4">{plainText}</p>
        </div>
      )}
    </div>
  )
}
