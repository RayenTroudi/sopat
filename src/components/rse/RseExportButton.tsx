'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, Presentation, FileText, ChevronDown } from 'lucide-react'

type Props = {
  year: number
}

export function RseExportButton({ year }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  async function downloadFile(format: 'xlsx' | 'pptx' | 'pdf') {
    setLoading(format)
    setOpen(false)
    try {
      const res = await fetch(`/api/rse/export?format=${format}&year=${year}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SOPAT_RSE_${year}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setLoading(null)
    }
  }

  const btnBase =
    'flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left transition-colors rounded-lg hover:bg-[var(--admin-bg)]'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        disabled={!!loading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors"
        style={{ background: 'var(--admin-emerald)' }}
      >
        {loading ? (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
          </svg>
        ) : (
          <Download className="w-4 h-4" />
        )}
        {loading ? 'Export en cours…' : 'Exporter'}
        {!loading && <ChevronDown className="w-3 h-3 opacity-70" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border shadow-lg p-1.5 z-20"
            style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
          >
            <button
              onClick={() => downloadFile('xlsx')}
              className={btnBase}
              style={{ color: 'var(--admin-text)' }}
            >
              <FileSpreadsheet className="w-4 h-4" style={{ color: '#16a34a' }} />
              Excel (.xlsx)
            </button>
            <button
              onClick={() => downloadFile('pptx')}
              className={btnBase}
              style={{ color: 'var(--admin-text)' }}
            >
              <Presentation className="w-4 h-4" style={{ color: '#d97706' }} />
              PowerPoint (.pptx)
            </button>
            <button
              onClick={() => downloadFile('pdf')}
              className={btnBase}
              style={{ color: 'var(--admin-text)' }}
            >
              <FileText className="w-4 h-4" style={{ color: '#dc2626' }} />
              PDF (.pdf)
            </button>
          </div>
        </>
      )}
    </div>
  )
}
