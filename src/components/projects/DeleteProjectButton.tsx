'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const router = useRouter()
  const [open, setOpen]       = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/admin/projects')
    } else {
      setDeleting(false)
      setOpen(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded-lg border"
        style={{ borderColor: 'var(--admin-red)', color: 'var(--admin-red)' }}
      >
        Supprimer
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setOpen(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-xl p-6 shadow-xl space-y-4" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Supprimer le projet ?</h3>
            <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              <strong>{projectName}</strong> sera archivé et son code DMS sera rendu obsolète. Toutes les données associées resteront dans la base de données.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setOpen(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>Annuler</button>
              <button onClick={() => void handleDelete()} disabled={deleting} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: 'var(--admin-red)' }}>
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
