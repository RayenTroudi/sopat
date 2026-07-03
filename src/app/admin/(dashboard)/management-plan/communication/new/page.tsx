'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCommunicationEntry } from '@/lib/actions/management-plan'
import Link from 'next/link'

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const labelClass = 'block text-[12px] font-medium mb-1'

export default function NewCommunicationEntryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await createCommunicationEntry({
      year: parseInt(fd.get('year') as string),
      direction: fd.get('direction') as string,
      subject: fd.get('subject') as string,
      target: fd.get('target') as string || undefined,
      channel: fd.get('channel') as string || undefined,
      frequency: fd.get('frequency') as string || undefined,
      responsible: fd.get('responsible') as string || undefined,
      plannedDate: fd.get('plannedDate') as string || undefined,
    })

    if (result.success) {
      router.push('/admin/management-plan')
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  const currentYear = new Date().getFullYear()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/management-plan" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
          Nouvelle entrée — Plan de communication
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Année *</label>
            <input name="year" type="number" required defaultValue={currentYear} min={2020} max={2030}
              className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Direction *</label>
            <select name="direction" required className={inputClass} style={inputStyle}>
              <option value="interne">Interne</option>
              <option value="externe">Externe</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Sujet *</label>
          <input name="subject" type="text" required placeholder="Ex: Réunion de revue de direction"
            className={inputClass} style={inputStyle} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Cible / Destinataire</label>
            <input name="target" type="text" placeholder="Ex: Équipe, Direction, Clients..."
              className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Canal</label>
            <input name="channel" type="text" placeholder="Ex: Réunion, Email, Affichage..."
              className={inputClass} style={inputStyle} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Fréquence</label>
            <input name="frequency" type="text" placeholder="Ex: Mensuel, Trimestriel..."
              className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Responsable</label>
            <input name="responsible" type="text" className={inputClass} style={inputStyle} />
          </div>
        </div>
        <div>
          <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Date prévue</label>
          <input name="plannedDate" type="date" className={inputClass} style={inputStyle} />
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-sm px-3 py-2.5 rounded-xl" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href="/admin/management-plan"
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
