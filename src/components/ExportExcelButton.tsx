'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { FileSpreadsheet, Loader2 } from 'lucide-react'

/**
 * Bouton « Exporter Excel » standard, placé en haut à droite des registres.
 * Transmet les filtres actifs (query string) à l'API d'export.
 */
export default function ExportExcelButton({ register }: { register: string }) {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function handleExport() {
    setLoading(true)
    setError(false)
    try {
      const params = new URLSearchParams(searchParams.toString())
      params.set('register', register)
      const res = await fetch(`/api/export?${params.toString()}`)
      if (!res.ok) throw new Error(`Export failed: ${res.status}`)
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="([^"]+)"/)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = match?.[1] ?? `sopat-${register}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded border shrink-0 transition-opacity hover:opacity-80 disabled:opacity-50"
      style={{
        borderColor: error ? 'var(--admin-red)' : 'var(--admin-border)',
        color: error ? 'var(--admin-red)' : 'var(--admin-text)',
        background: 'var(--admin-surface)',
      }}
      title={error ? "Échec de l'export — réessayer" : 'Exporter au format Excel'}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
      {loading ? 'Export…' : error ? 'Réessayer' : 'Exporter Excel'}
    </button>
  )
}
