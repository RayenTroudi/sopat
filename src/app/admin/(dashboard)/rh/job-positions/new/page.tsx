'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createJobPositionAction } from '@/lib/actions/rh'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

const labelClass = 'block text-xs font-semibold mb-1'
const inputClass = 'w-full rounded-lg border px-3 py-2 text-sm'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-fg)' }
const textareaClass = 'w-full rounded-lg border px-3 py-2 text-sm resize-none'

export default function NewJobPositionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [techniques, setTechniques] = useState<string[]>([''])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = e.currentTarget
    const fd = new FormData(form)
    fd.set('workTechniques', JSON.stringify(techniques.filter(Boolean).map(t => ({ label: t }))))
    const result = await createJobPositionAction(fd)
    if (result.success) {
      router.push(`/admin/rh/job-positions/${result.id}`)
    } else {
      setError(result.error ?? 'Erreur inattendue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/rh/job-positions" className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Nouvelle fiche de poste</h1>
          <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>FOR-RH-08</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identification */}
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--admin-fg)' }}>1. Identification du poste</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Code</label>
              <input name="code" className={inputClass} style={inputStyle} placeholder="Ex: RH-001" />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Date de mise à jour</label>
              <input name="updatedDate" type="date" className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Intitulé du poste *</label>
            <input name="title" required className={inputClass} style={inputStyle} placeholder="Ex: Ingénieur paysagiste" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Département</label>
              <input name="department" className={inputClass} style={inputStyle} placeholder="Ex: Études" />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Supérieur hiérarchique</label>
              <input name="hierarchicalSuperior" className={inputClass} style={inputStyle} placeholder="Ex: Directeur technique" />
            </div>
          </div>
        </div>

        {/* Formation */}
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--admin-fg)' }}>2. Formation requise</h2>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Formation initiale</label>
            <textarea name="initialTraining" rows={3} className={textareaClass} style={inputStyle} placeholder="Niveau d'études, spécialité..." />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Formation continue</label>
            <textarea name="continuousTraining" rows={3} className={textareaClass} style={inputStyle} placeholder="Formations requises en cours d'emploi..." />
          </div>
        </div>

        {/* Missions */}
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--admin-fg)' }}>3. Missions & attributions</h2>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Missions principales</label>
            <textarea name="mainMissions" rows={4} className={textareaClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Attributions</label>
            <textarea name="attributions" rows={4} className={textareaClass} style={inputStyle} />
          </div>
        </div>

        {/* Critères */}
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--admin-fg)' }}>4. Profil requis</h2>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Critères indispensables</label>
            <textarea name="indispensableCriteria" rows={3} className={textareaClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-muted)' }}>Critères souhaitables</label>
            <textarea name="desirableCriteria" rows={3} className={textareaClass} style={inputStyle} />
          </div>
        </div>

        {/* Techniques de travail */}
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--admin-fg)' }}>5. Techniques de travail</h2>
            <button type="button" onClick={() => setTechniques(t => [...t, ''])}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--admin-bg)', color: 'var(--green)', border: '1px solid var(--green)' }}>
              <Plus size={12} /> Ajouter
            </button>
          </div>
          {techniques.map((tech, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={tech}
                onChange={e => setTechniques(t => t.map((x, j) => j === i ? e.target.value : x))}
                className={inputClass} style={inputStyle}
                placeholder={`Technique ${i + 1}`}
              />
              <button type="button" onClick={() => setTechniques(t => t.filter((_, j) => j !== i))}
                className="p-2 rounded-lg hover:opacity-70" style={{ color: '#ef4444', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
            {loading ? 'Enregistrement...' : 'Créer la fiche de poste'}
          </button>
          <Link href="/admin/rh/job-positions" className="px-6 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--admin-bg)', color: 'var(--admin-fg)', border: '1px solid var(--admin-border)' }}>
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
