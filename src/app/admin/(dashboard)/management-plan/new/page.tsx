'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createManagementActivity } from '@/lib/actions/management-plan'
import Link from 'next/link'

const DEPTS = ['AC', 'CO', 'ET', 'MI', 'RE1', 'RE2', 'RH']

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const labelClass = 'block text-[12px] font-medium mb-1'

export default function NewManagementActivityPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([])

  function toggleWeek(w: number) {
    setSelectedWeeks((prev) =>
      prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await createManagementActivity({
      year: parseInt(fd.get('year') as string),
      dept: fd.get('dept') as string,
      objective: fd.get('objective') as string,
      action: fd.get('action') as string,
      responsible: fd.get('responsible') as string || undefined,
      plannedWeeks: selectedWeeks,
    })

    if (result.success) {
      router.push('/admin/management-plan')
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/management-plan" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
          Nouvelle activité
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border p-6 space-y-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Année *</label>
              <input name="year" type="number" required defaultValue={currentYear} min={2020} max={2030}
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
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Objectif *</label>
            <input name="objective" type="text" required className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Action *</label>
            <textarea name="action" required rows={2} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Responsable</label>
            <input name="responsible" type="text" className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div className="rounded-xl border p-6" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <label className="block text-[12px] font-medium mb-3" style={{ color: 'var(--admin-text-muted)' }}>
            Semaines planifiées ({selectedWeeks.length} sélectionnées)
          </label>
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
            {weeks.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => toggleWeek(w)}
                className="h-8 rounded text-xs font-medium transition-opacity hover:opacity-80"
                style={selectedWeeks.includes(w)
                  ? { background: 'var(--green)', color: 'var(--ivory)' }
                  : { background: 'var(--admin-bg)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)' }
                }
              >
                {w}
              </button>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--admin-text-muted)' }}>Cliquer sur les semaines pour les sélectionner</p>
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-sm px-3 py-2.5 rounded-xl" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href="/admin/management-plan"
            className="flex-1 py-2.5 rounded-lg border text-sm text-center font-medium hover:opacity-80 transition-opacity"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-surface)' }}
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
