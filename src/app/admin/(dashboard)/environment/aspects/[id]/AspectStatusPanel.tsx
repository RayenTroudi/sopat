'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateEnvironmentalAspect } from '@/lib/actions/environmental-aspects'

const STATUSES = [
  { value: 'identified', label: 'Identifié' },
  { value: 'controlled', label: 'Maîtrisé' },
  { value: 'closed', label: 'Clôturé' },
] as const

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }

export default function AspectStatusPanel({
  aspectId,
  status,
}: {
  aspectId: string
  status: 'identified' | 'controlled' | 'closed'
}) {
  const router = useRouter()
  const [next, setNext] = useState(status)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setLoading(true)
    setError(null)
    const res = await updateEnvironmentalAspect(aspectId, { status: next })
    if (!res.success) setError(res.error ?? 'Erreur')
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
        Mettre à jour le statut
      </h2>
      {error && (
        <div className="px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
          {error}
        </div>
      )}
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <select
          value={next}
          onChange={(e) => setNext(e.target.value as typeof status)}
          className={inputClass}
          style={inputStyle}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
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
