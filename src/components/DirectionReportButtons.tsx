'use client'

import { useState } from 'react'
import { FileText, Presentation, Loader2 } from 'lucide-react'

/** Boutons de téléchargement du rapport de direction SMQ (PDF / PPTX). */
export default function DirectionReportButtons({ year }: { year?: number }) {
  const [loading, setLoading] = useState<'pdf' | 'pptx' | null>(null)
  const [error, setError] = useState(false)

  async function download(format: 'pdf' | 'pptx') {
    setLoading(format)
    setError(false)
    try {
      const y = year ?? new Date().getFullYear()
      const res = await fetch(`/api/reports/direction?format=${format}&year=${y}`)
      if (!res.ok) throw new Error(`Export failed: ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SOPAT_Rapport_Direction_${y}.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError(true)
    } finally {
      setLoading(null)
    }
  }

  const btnClass = 'inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded border transition-opacity hover:opacity-80 disabled:opacity-50'
  const btnStyle = {
    borderColor: error ? 'var(--admin-red)' : 'var(--admin-border)',
    color: error ? 'var(--admin-red)' : 'var(--admin-text)',
    background: 'var(--admin-surface)',
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => download('pdf')} disabled={loading !== null} className={btnClass} style={btnStyle} title="Rapport de direction SMQ (PDF)">
        {loading === 'pdf' ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
        Rapport PDF
      </button>
      <button onClick={() => download('pptx')} disabled={loading !== null} className={btnClass} style={btnStyle} title="Rapport de direction SMQ (PowerPoint)">
        {loading === 'pptx' ? <Loader2 size={13} className="animate-spin" /> : <Presentation size={13} />}
        Rapport PPTX
      </button>
    </div>
  )
}
