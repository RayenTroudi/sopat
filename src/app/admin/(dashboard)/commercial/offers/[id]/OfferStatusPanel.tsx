'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateOffer } from '@/lib/actions/commercial'
import { OFFER_STATUS_LABELS, type OfferStatus } from '@/lib/db/commercial'

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }

export default function OfferStatusPanel({
  offerId,
  status,
}: {
  offerId: string
  status: OfferStatus
}) {
  const router = useRouter()
  const [next, setNext] = useState<OfferStatus>(status)
  const [lostReason, setLostReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setLoading(true)
    setError(null)
    const isDecision = next === 'gagnee' || next === 'perdue' || next === 'annulee'
    const res = await updateOffer(offerId, {
      status: next,
      ...(isDecision ? { decisionDate: new Date().toISOString().slice(0, 10) } : {}),
      ...(next === 'perdue' && lostReason ? { lostReason } : {}),
    })
    if (!res.success) setError(res.error ?? 'Erreur')
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
        Mettre à jour le statut
      </h2>

      {error && (
        <div className="px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
        <div className="space-y-3">
          <select
            value={next}
            onChange={(e) => setNext(e.target.value as OfferStatus)}
            className={inputClass}
            style={inputStyle}
          >
            {(Object.keys(OFFER_STATUS_LABELS) as OfferStatus[]).map((s) => (
              <option key={s} value={s}>{OFFER_STATUS_LABELS[s]}</option>
            ))}
          </select>
          {next === 'perdue' && (
            <textarea
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="Motif de perte (prix, délai, concurrence…)"
              rows={2}
              className={inputClass}
              style={inputStyle}
            />
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={loading || next === status}
          className="px-4 py-2 rounded-lg text-[13px] font-medium disabled:opacity-50"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
