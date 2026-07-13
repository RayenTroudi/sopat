'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateKnowledgeStatus } from '@/lib/actions/organizational-knowledge'

export default function KnowledgeStatusButton({
  knowledgeId,
  status,
}: {
  knowledgeId: string
  status: 'active' | 'a_preserver' | 'archived'
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function set(next: 'active' | 'a_preserver' | 'archived') {
    setLoading(true)
    await updateKnowledgeStatus(knowledgeId, next)
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex gap-1.5">
      {status !== 'a_preserver' && status !== 'archived' && (
        <button
          onClick={() => set('a_preserver')}
          disabled={loading}
          className="px-2 py-0.5 rounded border text-[11px] font-medium disabled:opacity-50"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-amber)' }}
        >
          À préserver
        </button>
      )}
      {status !== 'archived' && (
        <button
          onClick={() => set('archived')}
          disabled={loading}
          className="px-2 py-0.5 rounded border text-[11px] font-medium disabled:opacity-50"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
        >
          Archiver
        </button>
      )}
      {status === 'archived' && (
        <button
          onClick={() => set('active')}
          disabled={loading}
          className="px-2 py-0.5 rounded border text-[11px] font-medium disabled:opacity-50"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-emerald)' }}
        >
          Réactiver
        </button>
      )}
    </div>
  )
}
