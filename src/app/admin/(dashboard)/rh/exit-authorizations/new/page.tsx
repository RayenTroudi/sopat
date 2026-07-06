'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createExitAuthorizationAction } from '@/lib/actions/rh'

const labelClass = 'block text-xs font-semibold mb-1'
const inputClass = 'w-full rounded-lg border px-3 py-2 text-sm'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-fg)' }

export default function NewExitAuthorizationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const durationHours = startTime && endTime
    ? Math.max(0, (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60))
    : 0

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const data: Record<string, unknown> = {}
    fd.forEach((v, k) => { if (v) data[k] = v })
    data.durationHours = parseFloat(durationHours.toFixed(1))
    const result = await createExitAuthorizationAction(data)
    if (result.success) {
      router.push('/admin/rh/exit-authorizations')
    } else {
      setError(result.error ?? 'Erreur inattendue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/rh/exit-authorizations" className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Autorisation de sortie</h1>
          <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>FOR-RH-15</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Heure de départ *</label>
              <input name="startTime" type="datetime-local" required value={startTime}
                onChange={e => setStartTime(e.target.value)} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Heure de retour *</label>
              <input name="endTime" type="datetime-local" required value={endTime}
                onChange={e => setEndTime(e.target.value)} className={inputClass} style={inputStyle} />
            </div>
          </div>
          {durationHours > 0 && (
            <div className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--admin-bg)', color: 'var(--green)', border: '1px solid var(--green)' }}>
              Durée : {durationHours.toFixed(1)} heure(s)
            </div>
          )}
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Motif de la sortie *</label>
            <textarea name="reason" required rows={3} className="w-full rounded-lg border px-3 py-2 text-sm resize-none" style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Notes</label>
            <textarea name="notes" rows={2} className="w-full rounded-lg border px-3 py-2 text-sm resize-none" style={inputStyle} />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
            {loading ? 'Envoi...' : 'Soumettre la demande'}
          </button>
          <Link href="/admin/rh/exit-authorizations" className="px-6 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--admin-bg)', color: 'var(--admin-fg)', border: '1px solid var(--admin-border)' }}>
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
