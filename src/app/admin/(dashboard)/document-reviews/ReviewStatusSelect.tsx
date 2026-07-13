'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateDocumentReviewStatus } from '@/lib/actions/document-reviews'

export default function ReviewStatusSelect({
  reviewId,
  status,
}: {
  reviewId: string
  status: 'planned' | 'in_progress' | 'completed'
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const next =
    status === 'planned' ? ('in_progress' as const)
    : status === 'in_progress' ? ('completed' as const)
    : null

  if (!next) return null

  async function advance() {
    if (!next) return
    setLoading(true)
    await updateDocumentReviewStatus(reviewId, next)
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={advance}
      disabled={loading}
      className="px-2 py-0.5 rounded border text-[11px] font-medium disabled:opacity-50"
      style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-accent)' }}
    >
      {next === 'in_progress' ? 'Démarrer' : 'Terminer'}
    </button>
  )
}
