'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addMeetingAction, completeMeetingAction } from '@/lib/actions/meetings'

const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = { borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }

type ActionRow = {
  id: string
  description: string
  responsible: string | null
  targetDate: string | null
  completedAt: string | null
}

export default function MeetingActionsPanel({
  meetingId,
  actions,
}: {
  meetingId: string
  actions: ActionRow[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    const res = await addMeetingAction({
      meetingId,
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
    await completeMeetingAction(actionId, meetingId)
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
        Relevé d&apos;actions
      </h2>

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

      <form onSubmit={handleAdd} className="space-y-3 pt-3" style={{ borderTop: '1px solid var(--admin-border)' }}>
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3">
          <input name="description" required placeholder="Action décidée…" className={inputClass} style={inputStyle} />
          <input name="responsible" placeholder="Responsable" className={inputClass} style={inputStyle} />
          <input type="date" name="targetDate" className={inputClass} style={inputStyle} />
          <button type="submit" disabled={loading}
            className="px-4 py-2 rounded-lg text-[13px] font-medium disabled:opacity-50"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
            Ajouter
          </button>
        </div>
      </form>
    </div>
  )
}
