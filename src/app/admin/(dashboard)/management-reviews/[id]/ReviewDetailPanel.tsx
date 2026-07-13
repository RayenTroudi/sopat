'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  addReviewAction,
  completeReviewAction,
  updateManagementReview,
} from '@/lib/actions/management-reviews'

const ACTION_TYPES = [
  { value: 'amelioration', label: "Opportunité d'amélioration" },
  { value: 'ressources', label: 'Besoin en ressources' },
  { value: 'changement_smq', label: 'Changement à apporter au SMQ' },
  { value: 'autre', label: 'Autre' },
] as const

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }

type ActionRow = {
  id: string
  type: string
  description: string
  responsible: string | null
  targetDate: string | null
  completedAt: string | null
  result: string | null
}

export default function ReviewDetailPanel({
  reviewId,
  status,
  actions,
}: {
  reviewId: string
  status: 'planned' | 'held' | 'closed'
  actions: ActionRow[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function changeStatus(next: 'planned' | 'held' | 'closed') {
    setLoading(true)
    const res = await updateManagementReview(reviewId, { status: next })
    if (!res.success) setError(res.error ?? 'Erreur')
    router.refresh()
    setLoading(false)
  }

  async function handleAddAction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    const res = await addReviewAction({
      reviewId,
      type: fd.get('type') as 'amelioration' | 'ressources' | 'changement_smq' | 'autre',
      description: fd.get('description') as string,
      responsible: (fd.get('responsible') as string) || undefined,
      targetDate: (fd.get('targetDate') as string) || undefined,
    })
    if (res.success) {
      form.reset()
      router.refresh()
    } else {
      setError(res.error ?? 'Erreur')
    }
    setLoading(false)
  }

  async function handleComplete(actionId: string) {
    setLoading(true)
    await completeReviewAction(actionId, reviewId)
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="rounded-xl border p-5 space-y-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
          Décisions & actions (ISO 9.3.3)
        </h2>
        <div className="flex gap-2">
          {status === 'planned' && (
            <button onClick={() => changeStatus('held')} disabled={loading}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium disabled:opacity-50"
              style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
              Marquer comme tenue
            </button>
          )}
          {status === 'held' && (
            <button onClick={() => changeStatus('closed')} disabled={loading}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium disabled:opacity-50"
              style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>
              Clôturer la revue
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
          {error}
        </div>
      )}

      <div className="space-y-2">
        {actions.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucune action enregistrée.</p>
        )}
        {actions.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-4 rounded-lg border p-3"
            style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
                {ACTION_TYPES.find((t) => t.value === a.type)?.label ?? a.type}
              </p>
              <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{a.description}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
                {a.responsible ? `Responsable : ${a.responsible}` : ''}
                {a.targetDate ? ` · Échéance : ${new Date(a.targetDate).toLocaleDateString('fr-FR')}` : ''}
              </p>
            </div>
            {a.completedAt ? (
              <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>
                Réalisée
              </span>
            ) : (
              <button onClick={() => handleComplete(a.id)} disabled={loading}
                className="shrink-0 px-2.5 py-1 rounded-lg border text-xs font-medium disabled:opacity-50"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                Marquer réalisée
              </button>
            )}
          </div>
        ))}
      </div>

      {status !== 'closed' && (
        <form onSubmit={handleAddAction} className="space-y-3 pt-3" style={{ borderTop: '1px solid var(--admin-border)' }}>
          <div className="grid grid-cols-2 gap-3">
            <select name="type" className={inputClass} style={inputStyle} defaultValue="amelioration">
              {ACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <input name="responsible" placeholder="Responsable" className={inputClass} style={inputStyle} />
          </div>
          <div className="grid grid-cols-[1fr_auto_auto] gap-3">
            <input name="description" required placeholder="Décision / action décidée…" className={inputClass} style={inputStyle} />
            <input type="date" name="targetDate" className={inputClass} style={inputStyle} />
            <button type="submit" disabled={loading}
              className="px-4 py-2 rounded-lg text-[13px] font-medium disabled:opacity-50"
              style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
              Ajouter
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
