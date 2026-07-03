'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createLeaveRequestAction } from '@/lib/actions/rh'
import { ArrowLeft } from 'lucide-react'

const labelClass = 'block text-xs font-semibold mb-1'
const inputClass = 'w-full rounded-lg border px-3 py-2 text-sm'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-fg)' }
const textareaClass = 'w-full rounded-lg border px-3 py-2 text-sm resize-none'
const selectClass = 'w-full rounded-lg border px-3 py-2 text-sm'

const LEAVE_TYPES = [
  { value: 'conge_annuel', label: 'Congé annuel' },
  { value: 'conge_maladie', label: 'Congé maladie' },
  { value: 'conge_maternite', label: 'Congé maternité' },
  { value: 'conge_paternite', label: 'Congé paternité' },
  { value: 'conge_sans_solde', label: 'Congé sans solde' },
  { value: 'jour_ferie', label: 'Jour férié' },
  { value: 'autre', label: 'Autre' },
]

export default function NewLeavePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const duration = startDate && endDate
    ? Math.max(0, (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24) + 1)
    : 0

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = e.currentTarget
    const fd = new FormData(form)
    const data: Record<string, unknown> = {}
    fd.forEach((v, k) => { if (v) data[k] = v })
    data.durationDays = duration
    const result = await createLeaveRequestAction(data)
    if (result.success) {
      router.push('/admin/rh/leaves')
    } else {
      setError(result.error ?? 'Erreur inattendue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/rh/leaves" className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Demande de congé</h1>
          <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>FOR-RH-14</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Type de congé *</label>
            <select name="leaveType" required className={selectClass} style={inputStyle}>
              {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Date de début *</label>
              <input name="startDate" type="date" required value={startDate} onChange={e => setStartDate(e.target.value)}
                className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Date de fin *</label>
              <input name="endDate" type="date" required value={endDate} onChange={e => setEndDate(e.target.value)}
                className={inputClass} style={inputStyle} />
            </div>
          </div>
          {duration > 0 && (
            <div className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--admin-bg)', color: 'var(--green)', border: '1px solid var(--green)' }}>
              Durée calculée : {duration} jour(s)
            </div>
          )}
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Motif</label>
            <textarea name="reason" rows={3} className={textareaClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Notes</label>
            <textarea name="notes" rows={2} className={textareaClass} style={inputStyle} />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
            {loading ? 'Envoi...' : 'Soumettre la demande'}
          </button>
          <Link href="/admin/rh/leaves" className="px-6 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--admin-bg)', color: 'var(--admin-fg)', border: '1px solid var(--admin-border)' }}>
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
