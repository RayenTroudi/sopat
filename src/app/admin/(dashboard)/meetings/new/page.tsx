'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createMeeting } from '@/lib/actions/meetings'
import Link from 'next/link'

const MEETING_TYPES = [
  'Réunion qualité',
  'Réunion de direction',
  'Réunion de chantier',
  'Réunion RH',
  'Réunion commerciale',
  'Autre',
]

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const labelClass = 'block text-[12px] font-medium mb-1'

export default function NewMeetingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await createMeeting({
      meetingDate: fd.get('meetingDate') as string,
      meetingType: (fd.get('meetingType') as string) || undefined,
      location: (fd.get('location') as string) || undefined,
      participants: (fd.get('participants') as string) || undefined,
      absentees: (fd.get('absentees') as string) || undefined,
      agenda: (fd.get('agenda') as string) || undefined,
      discussions: (fd.get('discussions') as string) || undefined,
      decisions: (fd.get('decisions') as string) || undefined,
      nextMeetingDate: (fd.get('nextMeetingDate') as string) || undefined,
    })

    if (result.success && 'id' in result) {
      router.push(`/admin/meetings/${result.id}`)
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/meetings" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
      </div>

      <h1 className="text-[18px] font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
        Nouveau PV de réunion
      </h1>
      <p className="text-xs mb-6" style={{ color: 'var(--admin-text-muted)' }}>
        FOR-MI-04 — Le relevé d&apos;actions se complète ensuite sur la fiche du PV.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Date *</label>
              <input type="date" name="meetingDate" required className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Type de réunion</label>
              <select name="meetingType" className={inputClass} style={inputStyle}>
                {MEETING_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Lieu</label>
              <input type="text" name="location" className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Participants</label>
              <textarea name="participants" rows={2} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Absents excusés</label>
              <textarea name="absentees" rows={2} className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Ordre du jour</label>
            <textarea name="agenda" rows={3} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Points discutés</label>
            <textarea name="discussions" rows={4} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Décisions prises</label>
            <textarea name="decisions" rows={3} className={inputClass} style={inputStyle} />
          </div>
          <div className="max-w-xs">
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Prochaine réunion</label>
            <input type="date" name="nextMeetingDate" className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/admin/meetings"
            className="px-4 py-2 rounded-lg border text-[13px] font-medium"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg text-[13px] font-medium disabled:opacity-50"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}
          >
            {loading ? 'Création…' : 'Créer le PV'}
          </button>
        </div>
      </form>
    </div>
  )
}
