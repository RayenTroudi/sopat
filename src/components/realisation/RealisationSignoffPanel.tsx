'use client'

import { useState, useCallback, useEffect } from 'react'

type Checks = {
  hasAll5Photos:         boolean
  hasClientReception:    boolean
  hasBudgetReconciliation: boolean
  hasNoOpenNCs:          boolean
  allPassed:             boolean
  details: {
    completedMilestones: string[]
    missingMilestones:   string[]
  }
}

type Props = {
  projectId:      string
  phaseStatus:    string
  approvedBudget: string | null
  onSignedOff:    () => void
}

export function RealisationSignoffPanel({ projectId, phaseStatus, approvedBudget, onSignedOff }: Props) {
  const [checks, setChecks] = useState<Checks | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')

  const loadChecks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/realisation-signoff`)
      if (res.ok) {
        const data = await res.json() as Checks
        setChecks(data)
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void loadChecks() }, [loadChecks])

  async function handleSignOff() {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/projects/${projectId}/realisation-signoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      const data = await res.json() as { ok?: boolean; error?: string; missing?: string[] }
      if (!res.ok) {
        setError(data.error ?? 'Erreur serveur')
        if (data.missing) setError(`${data.error}\n${data.missing.join('\n')}`)
        return
      }
      onSignedOff()
    } catch {
      setError('Impossible de soumettre la validation')
    } finally {
      setSubmitting(false)
    }
  }

  const alreadyCompleted = phaseStatus === 'completed'

  if (alreadyCompleted) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl border"
        style={{ borderColor: 'var(--admin-emerald)', background: 'var(--admin-emerald-dim)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--admin-emerald)', flexShrink: 0 }}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-sm font-medium" style={{ color: 'var(--admin-emerald)' }}>
          Phase Réalisation validée — projet transmis à l'Entretien.
        </span>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
    >
      {/* Header */}
      <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          Soumettre à l&apos;Entretien
        </h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
          Tous les prérequis ci-dessous doivent être validés avant la transmission.
        </p>
      </div>

      {/* Checklist */}
      <div className="px-5 py-4 space-y-2.5">
        {loading ? (
          <div className="py-4 flex items-center justify-center">
            <span className="animate-spin w-5 h-5 border-2 rounded-full inline-block" style={{ borderColor: 'var(--admin-border)', borderTopColor: 'var(--admin-emerald)' }} />
          </div>
        ) : checks ? (
          <>
            <CheckRow
              label="5 photos de jalons téléchargées"
              passed={checks.hasAll5Photos}
              detail={
                !checks.hasAll5Photos && checks.details.missingMilestones.length > 0
                  ? `Manquants : ${checks.details.missingMilestones.join(', ')}`
                  : undefined
              }
            />
            <CheckRow
              label="Document de réception client téléchargé"
              passed={checks.hasClientReception}
            />
            <CheckRow
              label="Rapprochement budgétaire soumis"
              passed={checks.hasBudgetReconciliation}
            />
            <CheckRow
              label="Aucune non-conformité ouverte"
              passed={checks.hasNoOpenNCs}
            />

            {/* Refresh */}
            <button
              type="button"
              onClick={() => void loadChecks()}
              className="text-xs underline mt-1"
              style={{ color: 'var(--admin-text-muted)' }}
            >
              Rafraîchir les prérequis
            </button>
          </>
        ) : null}
      </div>

      {/* Notes + submit */}
      <div className="px-5 pb-5 space-y-3 border-t" style={{ borderColor: 'var(--admin-border)' }}>
        <div className="pt-3 space-y-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>
            Notes de clôture (optionnel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Observations, remarques de fin de chantier..."
            className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
            style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
          />
        </div>

        {error && (
          <pre
            className="text-xs px-3 py-2 rounded-lg whitespace-pre-wrap"
            style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}
          >
            {error}
          </pre>
        )}

        <button
          type="button"
          onClick={() => void handleSignOff()}
          disabled={submitting || loading || !checks?.allPassed}
          className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={{ background: checks?.allPassed ? 'var(--admin-emerald)' : 'var(--admin-border)' }}
        >
          {submitting ? 'Transmission…' : 'Soumettre à l\'Entretien & Suivi'}
        </button>

        {checks && !checks.allPassed && (
          <p className="text-xs text-center" style={{ color: 'var(--admin-text-muted)' }}>
            Complétez les prérequis manquants pour débloquer la soumission.
          </p>
        )}
      </div>
    </div>
  )
}

function CheckRow({ label, passed, detail }: { label: string; passed: boolean; detail?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5"
        style={{
          background: passed ? 'var(--admin-emerald)' : 'var(--admin-border)',
          color:      passed ? 'white' : 'var(--admin-text-muted)',
        }}
      >
        {passed ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        )}
      </div>
      <div>
        <p className="text-sm" style={{ color: passed ? 'var(--admin-text)' : 'var(--admin-text-muted)' }}>
          {label}
        </p>
        {detail && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-amber)' }}>{detail}</p>
        )}
      </div>
    </div>
  )
}
