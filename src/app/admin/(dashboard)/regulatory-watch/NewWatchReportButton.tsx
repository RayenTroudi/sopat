'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRegulatoryWatchReport } from '@/lib/actions/regulatory-watch'

/**
 * Ouvre le rapport de veille de l'année en cours et bascule directement sur sa
 * grille. Pas de formulaire de création : l'en-tête du FOR-MI-02 ne porte
 * qu'une année, et la référence se déduit du registre — rien à saisir pour
 * démarrer.
 */
export default function NewWatchReportButton({ year }: { year: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    const result = await createRegulatoryWatchReport(year)
    if (result.success && result.id) {
      router.push(`/admin/regulatory-watch/reports/${result.id}`)
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-[12px]" style={{ color: 'var(--admin-red)' }}>
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded border shrink-0 disabled:opacity-50"
        style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-accent)' }}
      >
        {loading ? 'Ouverture…' : `+ Rapport ${year}`}
      </button>
    </div>
  )
}
