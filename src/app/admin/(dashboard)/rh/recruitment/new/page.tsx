'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createRecruitmentRequestAction } from '@/lib/actions/rh'
import { ArrowLeft } from 'lucide-react'

const labelClass = 'block text-xs font-semibold mb-1'
const inputClass = 'w-full rounded-lg border px-3 py-2 text-sm'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-fg)' }
const textareaClass = 'w-full rounded-lg border px-3 py-2 text-sm resize-none'
const selectClass = 'w-full rounded-lg border px-3 py-2 text-sm'

export default function NewRecruitmentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = e.currentTarget
    const fd = new FormData(form)
    const data: Record<string, unknown> = {}
    fd.forEach((v, k) => { if (v) data[k] = v })
    const result = await createRecruitmentRequestAction(data)
    if (result.success) {
      router.push(`/admin/rh/recruitment/${result.id}`)
    } else {
      setError(result.error ?? 'Erreur inattendue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/rh/recruitment" className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Demande de recrutement</h1>
          <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>FOR-RH-01</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--admin-fg)' }}>1. Identification</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Référence</label>
              <input name="refCode" className={inputClass} style={inputStyle} placeholder="Ex: REC-2026-001" />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Date d'ouverture</label>
              <input name="openedDate" type="date" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Statut</label>
              <select name="status" className={selectClass} style={inputStyle}>
                <option value="ouvert">Ouvert</option>
                <option value="en_cours">En cours</option>
                <option value="pourvu">Pourvu</option>
                <option value="annule">Annulé</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Intitulé du poste *</label>
            <input name="postTitle" required className={inputClass} style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Département demandeur</label>
              <input name="requestingDept" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Supérieur hiérarchique</label>
              <input name="hierarchicalSuperior" className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Statut proposé</label>
            <input name="proposedStatus" className={inputClass} style={inputStyle} placeholder="Ex: Cadre, Technicien..." />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Motif du recrutement</label>
            <textarea name="reason" rows={3} className={textareaClass} style={inputStyle} />
          </div>
        </div>

        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--admin-fg)' }}>2. Profil recherché</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Niveau d'études</label>
              <input name="studyLevel" className={inputClass} style={inputStyle} placeholder="Ex: Bac+5, Ingénieur..." />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Spécialité</label>
              <input name="studySpecialty" className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Durée d'expérience requise</label>
            <input name="experienceDuration" className={inputClass} style={inputStyle} placeholder="Ex: 3 ans minimum" />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Missions principales</label>
            <textarea name="mainMissions" rows={4} className={textareaClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Compétences requises</label>
            <textarea name="requiredSkills" rows={3} className={textareaClass} style={inputStyle} />
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
            {loading ? 'Enregistrement...' : 'Soumettre la demande'}
          </button>
          <Link href="/admin/rh/recruitment" className="px-6 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--admin-bg)', color: 'var(--admin-fg)', border: '1px solid var(--admin-border)' }}>
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
