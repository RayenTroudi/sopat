'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createKnowledge } from '@/lib/actions/organizational-knowledge'
import { KNOWLEDGE_DOMAINS } from '@/lib/db/organizational-knowledge'
import Link from 'next/link'

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const labelClass = 'block text-[12px] font-medium mb-1'

export default function NewKnowledgePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await createKnowledge({
      domain: (fd.get('domain') as string) || undefined,
      title: fd.get('title') as string,
      description: (fd.get('description') as string) || undefined,
      holder: (fd.get('holder') as string) || undefined,
      criticality: fd.get('criticality') ? Number(fd.get('criticality')) : undefined,
      preservationMethod: (fd.get('preservationMethod') as string) || undefined,
      transferPlan: (fd.get('transferPlan') as string) || undefined,
    })

    if (result.success) {
      router.push('/admin/knowledge')
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/knowledge" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
      </div>

      <h1 className="text-[18px] font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
        Nouvelle connaissance organisationnelle
      </h1>
      <p className="text-xs mb-6" style={{ color: 'var(--admin-text-muted)' }}>
        ORG-MI-09 — ISO 9001:2015 §7.1.6
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Domaine</label>
              <select name="domain" defaultValue="" className={inputClass} style={inputStyle}>
                <option value="">— Choisir —</option>
                {KNOWLEDGE_DOMAINS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Criticité (1–5)</label>
              <input type="number" min={1} max={5} name="criticality" className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Connaissance *</label>
            <input type="text" name="title" required placeholder="Ex. : dosages phytosanitaires par espèce…" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Description</label>
            <textarea name="description" rows={2} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Détenteur (personne / équipe)</label>
            <input type="text" name="holder" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Méthode de préservation</label>
            <textarea name="preservationMethod" rows={2} placeholder="Documentation, base de données, tutorat…" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Plan de transfert</label>
            <textarea name="transferPlan" rows={2} placeholder="Formation interne, binômage, procédure à rédiger…" className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/admin/knowledge"
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
            {loading ? 'Création…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
