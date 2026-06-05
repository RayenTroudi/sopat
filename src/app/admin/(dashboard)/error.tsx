'use client'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl"
          style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
          ✕
        </div>
        <h2 className="text-base font-semibold" style={{ color: 'var(--admin-text)' }}>Une erreur est survenue</h2>
        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          {error.message ?? "Impossible de charger cette page."}
        </p>
        {error.digest && (
          <p className="text-xs font-mono" style={{ color: 'var(--admin-text-dim)' }}>ref: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'var(--admin-emerald)' }}
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
