'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRiskOpportunity } from '@/lib/actions/risks-opportunities'
import Link from 'next/link'

const CATEGORIES = [
  { value: 'contexte_interne', label: 'Contexte interne' },
  { value: 'contexte_externe', label: 'Contexte externe' },
  { value: 'partie_interessee', label: 'Partie intéressée' },
  { value: 'processus', label: 'Processus' },
  { value: 'environnement', label: 'Environnement' },
  { value: 'autre', label: 'Autre' },
]

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const labelClass = 'block text-[12px] font-medium mb-1'

export default function NewRiskOpportunityPage() {
  const router = useRouter()
  const [type, setType] = useState<'risk' | 'opportunity'>('risk')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await createRiskOpportunity({
      type,
      category: fd.get('category') as string,
      description: fd.get('description') as string,
      context: fd.get('context') as string || undefined,
      gravity: type === 'risk' && fd.get('gravity') ? Number(fd.get('gravity')) : undefined,
      probability: type === 'risk' && fd.get('probability') ? Number(fd.get('probability')) : undefined,
      priority: type === 'opportunity' && fd.get('priority') ? Number(fd.get('priority')) : undefined,
      importance: type === 'opportunity' && fd.get('importance') ? Number(fd.get('importance')) : undefined,
      owner: fd.get('owner') as string || undefined,
      targetDate: fd.get('targetDate') as string || undefined,
      notes: fd.get('notes') as string || undefined,
    })

    if (result.success) {
      router.push('/admin/risks-opportunities')
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/risks-opportunities" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
          Nouveau Risque / Opportunité
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border p-6 space-y-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          {/* Type toggle */}
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Type *</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setType('risk')}
                className="flex-1 py-2.5 rounded-lg border text-sm font-medium transition-opacity hover:opacity-90"
                style={type === 'risk'
                  ? { background: 'var(--admin-red)', color: '#fff', borderColor: 'transparent' }
                  : { borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }
                }
              >
                Risque
              </button>
              <button
                type="button"
                onClick={() => setType('opportunity')}
                className="flex-1 py-2.5 rounded-lg border text-sm font-medium transition-opacity hover:opacity-90"
                style={type === 'opportunity'
                  ? { background: 'var(--green)', color: 'var(--ivory)', borderColor: 'transparent' }
                  : { borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }
                }
              >
                Opportunité
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="category" className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Catégorie *</label>
            <select id="category" name="category" required className={inputClass} style={inputStyle}>
              <option value="">Sélectionner…</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="description" className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Description *</label>
            <textarea
              id="description" name="description" required rows={3}
              className={inputClass} style={inputStyle}
              placeholder="Décrire le risque ou l'opportunité…"
            />
          </div>

          <div>
            <label htmlFor="context" className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Source / Contexte</label>
            <input
              id="context" name="context" type="text"
              className={inputClass} style={inputStyle}
              placeholder="Origine du risque ou de l'opportunité"
            />
          </div>

          {type === 'risk' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="gravity" className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Gravité (1–4)</label>
                <select id="gravity" name="gravity" className={inputClass} style={inputStyle}>
                  <option value="">—</option>
                  {[1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="probability" className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Probabilité (1–4)</label>
                <select id="probability" name="probability" className={inputClass} style={inputStyle}>
                  <option value="">—</option>
                  {[1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          )}

          {type === 'opportunity' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="priority" className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Priorité (1–4)</label>
                <select id="priority" name="priority" className={inputClass} style={inputStyle}>
                  <option value="">—</option>
                  {[1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="importance" className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Importance (1–4)</label>
                <select id="importance" name="importance" className={inputClass} style={inputStyle}>
                  <option value="">—</option>
                  {[1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="owner" className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Responsable</label>
              <input id="owner" name="owner" type="text" className={inputClass} style={inputStyle} placeholder="Nom ou fonction" />
            </div>
            <div>
              <label htmlFor="targetDate" className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Date cible</label>
              <input id="targetDate" name="targetDate" type="date" className={inputClass} style={inputStyle} />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className={labelClass} style={{ color: 'var(--admin-text-muted)' }}>Notes</label>
            <textarea id="notes" name="notes" rows={2} className={inputClass} style={inputStyle} />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-sm px-3 py-2.5 rounded-xl" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Link
              href="/admin/risks-opportunities"
              className="flex-1 py-2.5 rounded-lg border text-sm text-center font-medium transition-colors hover:opacity-80"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}
            >
              Annuler
            </Link>
            <button
              type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--green)', color: 'var(--ivory)' }}
            >
              {loading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
