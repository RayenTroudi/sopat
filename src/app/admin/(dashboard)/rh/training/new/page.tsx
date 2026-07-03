'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createTrainingSessionAction } from '@/lib/actions/rh'
import { ArrowLeft } from 'lucide-react'

const labelClass = 'block text-xs font-semibold mb-1'
const inputClass = 'w-full rounded-lg border px-3 py-2 text-sm'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-fg)' }
const textareaClass = 'w-full rounded-lg border px-3 py-2 text-sm resize-none'
const selectClass = 'w-full rounded-lg border px-3 py-2 text-sm'

const CURRENT_YEAR = new Date().getFullYear()

export default function NewTrainingPage() {
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
    if (data.year) data.year = parseInt(data.year as string)
    const result = await createTrainingSessionAction(data)
    if (result.success) {
      router.push(`/admin/rh/training/${result.id}`)
    } else {
      setError(result.error ?? 'Erreur inattendue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/rh/training" className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Nouvelle action de formation</h1>
          <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>PLA-RH-02 / FOR-RH-05</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--admin-fg)' }}>1. Identification</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Référence</label>
              <input name="refCode" className={inputClass} style={inputStyle} placeholder="Ex: FOR-2026-001" />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Année *</label>
              <input name="year" type="number" required defaultValue={CURRENT_YEAR} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Statut</label>
              <select name="status" className={selectClass} style={inputStyle}>
                <option value="planifie">Planifié</option>
                <option value="en_cours">En cours</option>
                <option value="realise">Réalisé</option>
                <option value="reporte">Reporté</option>
                <option value="annule">Annulé</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Thème de la formation *</label>
            <input name="theme" required className={inputClass} style={inputStyle} placeholder="Ex: Sécurité au travail, ISO 9001..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Thématique</label>
              <input name="thematic" className={inputClass} style={inputStyle} placeholder="Ex: QHSE, Technique, Management..." />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Type d'action</label>
              <input name="actionType" className={inputClass} style={inputStyle} placeholder="Ex: Interne, Externe..." />
            </div>
          </div>
        </div>

        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--admin-fg)' }}>2. Organisme & lieu</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Organisme de formation</label>
              <input name="trainingOrg" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Formateur</label>
              <input name="trainerName" className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Lieu</label>
            <input name="location" className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--admin-fg)' }}>3. Dates</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Date début prévue</label>
              <input name="plannedStartDate" type="date" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Date fin prévue</label>
              <input name="plannedEndDate" type="date" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Date début réelle</label>
              <input name="actualStartDate" type="date" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Date fin réelle</label>
              <input name="actualEndDate" type="date" className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Date éval. à chaud</label>
              <input name="hotEvalDate" type="date" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Date éval. à froid</label>
              <input name="coldEvalDate" type="date" className={inputClass} style={inputStyle} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--admin-fg)' }}>4. Objectif & notes</h2>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Objectif de la formation</label>
            <textarea name="objective" rows={3} className={textareaClass} style={inputStyle} />
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
            {loading ? 'Enregistrement...' : 'Créer l\'action de formation'}
          </button>
          <Link href="/admin/rh/training" className="px-6 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--admin-bg)', color: 'var(--admin-fg)', border: '1px solid var(--admin-border)' }}>
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
