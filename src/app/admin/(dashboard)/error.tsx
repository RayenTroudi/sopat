'use client'

import { AlertCircle } from 'lucide-react'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="text-center space-y-3 max-w-sm">
        <div
          className="w-9 h-9 rounded flex items-center justify-center mx-auto"
          style={{ background: 'var(--admin-red-dim)' }}
        >
          <AlertCircle className="w-4 h-4" style={{ color: 'var(--admin-red)' }} />
        </div>
        <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
          Une erreur est survenue
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--admin-text-muted)' }}>
          {error.message ?? 'Impossible de charger cette page.'}
        </p>
        {error.digest && (
          <p className="text-[11px] font-mono" style={{ color: 'var(--admin-text-dim)' }}>
            ref: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="px-3 py-1.5 rounded text-[13px] font-medium transition-opacity hover:opacity-90"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
