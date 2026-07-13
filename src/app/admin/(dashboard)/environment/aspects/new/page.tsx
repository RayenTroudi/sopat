'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createEnvironmentalAspect } from '@/lib/actions/environmental-aspects'
import Link from 'next/link'

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const labelClass = 'block text-[12px] font-medium mb-1'

export default function NewAspectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [frequency, setFrequency] = useState<number | ''>('')
  const [gravity, setGravity] = useState<number | ''>('')

  const significance = frequency !== '' && gravity !== '' ? frequency * gravity : null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const result = await createEnvironmentalAspect({
      activity: fd.get('activity') as string,
      aspect: fd.get('aspect') as string,
      impact: (fd.get('impact') as string) || undefined,
      condition: fd.get('condition') as 'normale' | 'anormale' | 'urgence',
      frequency: frequency === '' ? undefined : frequency,
      gravity: gravity === '' ? undefined : gravity,
      controlMeasures: (fd.get('controlMeasures') as string) || undefined,
      legalRequirement: (fd.get('legalRequirement') as string) || undefined,
    })

    if (result.success && 'id' in result) {
      router.push('/admin/environment/aspects')
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/environment/aspects" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
      </div>

      <h1 className="text-[18px] font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
        Nouvel aspect environnemental
      </h1>
      <p className="text-xs mb-6" style={{ color: 'var(--admin-text-muted)' }}>
        PLA-MI-04/05 — Signification = Fréquence × Gravité (significatif si ≥ 9)
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Activité / processus *</label>
            <input type="text" name="activity" required placeholder="Ex. : entretien des espaces verts, traitement phytosanitaire…" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Aspect environnemental *</label>
            <input type="text" name="aspect" required placeholder="Ex. : consommation d'eau, déchets verts, émissions…" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Impact environnemental</label>
            <textarea name="impact" rows={2} placeholder="Ex. : épuisement des ressources, pollution du sol…" className={inputClass} style={inputStyle} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Condition</label>
              <select name="condition" defaultValue="normale" className={inputClass} style={inputStyle}>
                <option value="normale">Normale</option>
                <option value="anormale">Anormale</option>
                <option value="urgence">Situation d&apos;urgence</option>
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Fréquence (1–5)</label>
              <input
                type="number" min={1} max={5}
                value={frequency}
                onChange={(e) => setFrequency(e.target.value === '' ? '' : Number(e.target.value))}
                className={inputClass} style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Gravité (1–5)</label>
              <input
                type="number" min={1} max={5}
                value={gravity}
                onChange={(e) => setGravity(e.target.value === '' ? '' : Number(e.target.value))}
                className={inputClass} style={inputStyle}
              />
            </div>
          </div>
          {significance != null && (
            <div className="px-4 py-3 rounded-lg text-sm font-medium" style={{
              background: significance >= 9 ? 'var(--admin-red-dim)' : 'var(--admin-emerald-dim)',
              color: significance >= 9 ? 'var(--admin-red)' : 'var(--admin-emerald)',
            }}>
              Signification : {significance} — {significance >= 9 ? 'aspect SIGNIFICATIF, mesures de maîtrise requises' : 'non significatif'}
            </div>
          )}
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Mesures de maîtrise</label>
            <textarea name="controlMeasures" rows={2} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Exigence légale / réglementaire applicable</label>
            <textarea name="legalRequirement" rows={2} className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/admin/environment/aspects"
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
            {loading ? 'Création…' : "Créer l'aspect"}
          </button>
        </div>
      </form>
    </div>
  )
}
