'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createManagementReview } from '@/lib/actions/management-reviews'
import Link from 'next/link'

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }
const labelClass = 'block text-[12px] font-medium mb-1'

// Éléments d'entrée de la revue — ISO 9001:2015 §9.3.2
const INPUT_SECTIONS: { name: string; label: string }[] = [
  { name: 'previousActionsStatus',    label: 'État des actions des revues précédentes' },
  { name: 'contextChanges',           label: 'Modifications des enjeux externes et internes' },
  { name: 'customerSatisfaction',     label: 'Satisfaction client et retours des parties intéressées' },
  { name: 'qualityObjectivesReview',  label: 'Atteinte des objectifs qualité' },
  { name: 'processPerformance',       label: 'Performance des processus et conformité des produits/services' },
  { name: 'ncCapaStatus',             label: 'Non-conformités et actions correctives' },
  { name: 'auditResults',             label: "Résultats d'audits" },
  { name: 'supplierPerformance',      label: 'Performance des prestataires externes' },
  { name: 'resourceAdequacy',         label: 'Adéquation des ressources' },
  { name: 'risksOpportunitiesReview', label: 'Efficacité des actions face aux risques et opportunités' },
  { name: 'improvementOpportunities', label: "Opportunités d'amélioration" },
]

export default function NewManagementReviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const payload: Record<string, string | undefined> = {
      reviewDate: fd.get('reviewDate') as string,
      participants: (fd.get('participants') as string) || undefined,
      agenda: (fd.get('agenda') as string) || undefined,
      conclusions: (fd.get('conclusions') as string) || undefined,
    }
    for (const { name } of INPUT_SECTIONS) {
      payload[name] = (fd.get(name) as string) || undefined
    }

    const result = await createManagementReview(payload as { reviewDate: string })
    if (result.success && 'id' in result) {
      router.push(`/admin/management-reviews/${result.id}`)
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/management-reviews" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Retour
        </Link>
      </div>

      <h1 className="text-[18px] font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
        Nouvelle revue de direction
      </h1>
      <p className="text-xs mb-6" style={{ color: 'var(--admin-text-muted)' }}>
        FOR-MQ-15 — Les éléments d&apos;entrée suivent l&apos;ISO 9001:2015 §9.3.2. Les décisions et actions se saisissent ensuite sur la fiche.
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
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Date de la revue *</label>
              <input type="date" name="reviewDate" required className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Participants</label>
              <input type="text" name="participants" placeholder="Direction, RQ, chefs de service…" className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Ordre du jour</label>
            <textarea name="agenda" rows={3} className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            Éléments d&apos;entrée (ISO 9.3.2)
          </h2>
          {INPUT_SECTIONS.map(({ name, label }) => (
            <div key={name}>
              <label className={labelClass} style={{ color: 'var(--admin-text)' }}>{label}</label>
              <textarea name={name} rows={2} className={inputClass} style={inputStyle} />
            </div>
          ))}
        </div>

        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            Conclusions (ISO 9.3.3)
          </h2>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text)' }}>Conclusions générales</label>
            <textarea name="conclusions" rows={3} className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/admin/management-reviews"
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
            {loading ? 'Création…' : 'Créer la revue'}
          </button>
        </div>
      </form>
    </div>
  )
}
