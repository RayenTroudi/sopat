'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { decideExtraExpense } from '@/lib/actions/achat'

export default function ExpenseDecisionButtons({ expenseId }: { expenseId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')

  async function decide(decision: 'approved' | 'rejected') {
    setLoading(true)
    await decideExtraExpense(expenseId, decision, decision === 'rejected' ? reason : undefined)
    router.refresh()
    setLoading(false)
    setRejecting(false)
  }

  if (rejecting) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motif"
          className="px-2 py-1 rounded border text-xs w-32"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
        />
        <button
          onClick={() => decide('rejected')}
          disabled={loading}
          className="px-2 py-1 rounded text-xs font-medium disabled:opacity-50"
          style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}
        >
          Confirmer
        </button>
        <button
          onClick={() => setRejecting(false)}
          className="px-2 py-1 rounded border text-xs"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => decide('approved')}
        disabled={loading}
        className="px-2.5 py-1 rounded text-xs font-medium disabled:opacity-50"
        style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}
      >
        Approuver
      </button>
      <button
        onClick={() => setRejecting(true)}
        disabled={loading}
        className="px-2.5 py-1 rounded text-xs font-medium disabled:opacity-50"
        style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}
      >
        Rejeter
      </button>
    </div>
  )
}
