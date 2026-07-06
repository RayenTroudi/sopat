'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

const labelClass = 'block text-xs font-semibold mb-1'
const inputClass = 'w-full rounded-lg border px-3 py-2 text-sm'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-fg)' }

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR + 1]

type Entry = { day: number; entryTime: string; exitTime: string; lunchOut: string; lunchIn: string; notes: string }

export default function NewAttendancePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [entries, setEntries] = useState<Entry[]>([{ day: 1, entryTime: '08:00', exitTime: '17:00', lunchOut: '12:00', lunchIn: '13:00', notes: '' }])

  function addEntry() {
    const last = entries[entries.length - 1]
    setEntries([...entries, { day: (last?.day ?? 0) + 1, entryTime: '08:00', exitTime: '17:00', lunchOut: '12:00', lunchIn: '13:00', notes: '' }])
  }
  function removeEntry(i: number) { setEntries(entries.filter((_, idx) => idx !== i)) }
  function updateEntry(i: number, field: keyof Entry, val: string | number) {
    setEntries(entries.map((e, idx) => idx === i ? { ...e, [field]: val } : e))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/rh/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: fd.get('userId'),
        month: parseInt(fd.get('month') as string),
        year: parseInt(fd.get('year') as string),
        daysWorked: parseInt(fd.get('daysWorked') as string) || entries.length,
        salaryAdvance: fd.get('salaryAdvance') || null,
        notes: fd.get('notes'),
        entries,
      }),
    })
    if (res.ok) {
      router.push('/admin/rh/attendance')
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erreur inattendue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/rh/attendance" className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Nouvelle fiche de pointage</h1>
          <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>FOR-RH-13</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Mois *</label>
              <select name="month" required className={inputClass} style={inputStyle}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Année *</label>
              <select name="year" required className={inputClass} style={inputStyle}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Jours travaillés</label>
              <input name="daysWorked" type="number" min={0} max={31} placeholder={String(entries.length)} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Avance sur salaire (DT)</label>
              <input name="salaryAdvance" type="number" step="0.001" min={0} className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Notes</label>
            <textarea name="notes" rows={2} className="w-full rounded-lg border px-3 py-2 text-sm resize-none" style={inputStyle} />
          </div>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--admin-muted)' }}>Entrées journalières</span>
            <button type="button" onClick={addEntry} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
              <Plus size={12} /> Ajouter un jour
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                  {['Jour', 'Entrée', 'Sortie déjeuner', 'Retour déjeuner', 'Sortie', 'Notes', ''].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--admin-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <td className="px-3 py-2">
                      <input type="number" min={1} max={31} value={entry.day} onChange={e => updateEntry(i, 'day', parseInt(e.target.value))}
                        className="w-14 rounded border px-2 py-1 text-xs text-center" style={inputStyle} />
                    </td>
                    {(['entryTime', 'lunchOut', 'lunchIn', 'exitTime'] as const).map(field => (
                      <td key={field} className="px-3 py-2">
                        <input type="time" value={entry[field]} onChange={e => updateEntry(i, field, e.target.value)}
                          className="rounded border px-2 py-1 text-xs" style={inputStyle} />
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <input type="text" value={entry.notes} onChange={e => updateEntry(i, 'notes', e.target.value)}
                        className="w-24 rounded border px-2 py-1 text-xs" style={inputStyle} />
                    </td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => removeEntry(i)}><Trash2 size={14} style={{ color: '#ef4444' }} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <Link href="/admin/rh/attendance" className="px-6 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--admin-bg)', color: 'var(--admin-fg)', border: '1px solid var(--admin-border)' }}>
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
