'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addStaffSuggestion } from '@/lib/actions/stakeholders'
import Link from 'next/link'

const DEPTS = ['AC', 'CO', 'ET', 'MI', 'RE1', 'RE2', 'RH'] as const

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const labelClass = 'block text-[12px] font-medium mb-1'

export default function NewStaffSuggestionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await addStaffSuggestion({
      date: fd.get('date') as string,
      dept: fd.get('dept') as string,
      suggestionText: fd.get('suggestionText') as string,
    })

    if (result.success) {
      router.push('/admin/stakeholders')
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/stakeholders" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
          Nouvelle suggestion / remontée terrain
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Date *</label>
            <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)}
              className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Département *</label>
            <select name="dept" required className={inputClass} style={inputStyle}>
              {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Suggestion / Remontée *</label>
          <textarea name="suggestionText" required rows={5}
            placeholder="Décrire la suggestion, observation ou remontée terrain..."
            className={inputClass} style={inputStyle} />
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-sm px-3 py-2.5 rounded-xl" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href="/admin/stakeholders"
            className="flex-1 py-2.5 rounded-lg border text-sm text-center font-medium hover:opacity-80 transition-opacity"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}
          >
            Annuler
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}
          >
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
