'use client'

import { useState } from 'react'
import type { SatisfactionRow } from '@/lib/db/entretien'

type Props = {
  projectId:  string
  records:    SatisfactionRow[]
  onSubmitted: (r: SatisfactionRow) => void
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })
}

export function SatisfactionForm({ projectId, records, onSubmitted }: Props) {
  const [score,     setScore]     = useState(0)
  const [comments,  setComments]  = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,     setError]     = useState('')
  const [showForm,  setShowForm]  = useState(false)

  const avg = records.length > 0
    ? (records.reduce((s, r) => s + r.score, 0) / records.length).toFixed(1)
    : null

  async function handleSubmit() {
    if (!score) { setError('Sélectionnez une note'); return }
    setSubmitting(true); setError('')
    const res = await fetch(`/api/projects/${projectId}/satisfaction`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ score, comments: comments || undefined }),
    })
    const data = await res.json() as SatisfactionRow & { error?:string }
    if (!res.ok) { setError(data.error ?? 'Erreur'); setSubmitting(false); return }
    onSubmitted(data)
    setScore(0); setComments(''); setShowForm(false)
    setSubmitting(false)
  }

  return (
    <div className="space-y-4">
      {/* Average */}
      {avg && (
        <div className="flex items-center gap-4 px-4 py-3 rounded-lg" style={{ background:'var(--admin-emerald-dim)', border:'1px solid var(--admin-emerald)' }}>
          <div className="text-3xl font-bold" style={{ color:'var(--admin-emerald)' }}>{avg}</div>
          <div>
            <p className="text-sm font-medium" style={{ color:'var(--admin-emerald)' }}>Score moyen</p>
            <p className="text-xs" style={{ color:'var(--admin-text-muted)' }}>{records.length} évaluation{records.length > 1 ? 's' : ''} · ISO 9001:2015 clause 9.1.2</p>
          </div>
          <div className="flex gap-0.5 ml-auto">
            {[1,2,3,4,5].map((s) => (
              <span key={s} className="text-xl" style={{ color: parseFloat(avg) >= s ? '#F59E0B' : 'var(--admin-border)' }}>★</span>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {records.length > 0 && (
        <div className="space-y-2">
          {records.map((r) => (
            <div key={r.id} className="flex items-start gap-3 px-4 py-3 rounded-lg border" style={{ borderColor:'var(--admin-border)' }}>
              <div className="flex gap-0.5 shrink-0">
                {[1,2,3,4,5].map((s) => (
                  <span key={s} style={{ color: r.score >= s ? '#F59E0B' : 'var(--admin-border)' }}>★</span>
                ))}
              </div>
              <div className="flex-1 min-w-0">
                {r.comments && <p className="text-sm" style={{ color:'var(--admin-text)' }}>{r.comments}</p>}
                <p className="text-xs mt-0.5" style={{ color:'var(--admin-text-muted)' }}>
                  {r.recordedByName ?? '—'} · {fmtDate(r.recordedAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new */}
      {showForm ? (
        <div className="space-y-3 p-4 rounded-xl border" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)' }}>
          <p className="text-sm font-medium" style={{ color:'var(--admin-text)' }}>Nouvelle évaluation client</p>

          {/* Star picker */}
          <div className="flex gap-2">
            {[1,2,3,4,5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScore(s)}
                className="text-3xl transition-transform hover:scale-110"
                style={{ color: score >= s ? '#F59E0B' : 'var(--admin-border)' }}
              >
                ★
              </button>
            ))}
            {score > 0 && (
              <span className="ml-2 text-sm self-center font-semibold" style={{ color:'var(--admin-text-muted)' }}>{score}/5</span>
            )}
          </div>

          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            placeholder="Commentaires du client (optionnel)…"
            className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
            style={{ borderColor:'var(--admin-border)', background:'var(--admin-surface)', color:'var(--admin-text)' }}
          />

          {error && <p className="text-xs" style={{ color:'var(--admin-red)' }}>{error}</p>}

          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', color:'var(--admin-text-muted)' }}>Annuler</button>
            <button onClick={() => void handleSubmit()} disabled={submitting || !score} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background:'var(--admin-emerald)' }}>
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-sm"
          style={{ color:'var(--admin-blue)' }}
        >
          + Ajouter une évaluation
        </button>
      )}
    </div>
  )
}
