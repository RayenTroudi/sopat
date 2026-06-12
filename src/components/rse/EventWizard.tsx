'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Step1General } from './wizard/Step1General'
import { Step2Teams } from './wizard/Step2Teams'
import { Step3Logistics } from './wizard/Step3Logistics'
import { Step4Retroplanning } from './wizard/Step4Retroplanning'
import { Step5Communication } from './wizard/Step5Communication'
import { StepReview } from './wizard/StepReview'

export type WizardDraft = {
  // Step 1
  title?: string
  eventType?: string
  date?: string
  location?: string
  partnerId?: string | null
  sopatCoordinatorId?: string
  participantCountPlanned?: string
  notes?: string
  // Step 2
  teams?: Array<{
    teamName: string
    teamLeaderId?: string | null
    missions: string[]
    notes?: string
  }>
  // Step 3
  logistics?: Array<{
    category: string
    itemName: string
    quantityPlanned?: string
    unit?: string
    supplier?: string
    cost?: string
    notes?: string
  }>
  // Step 4
  retroplanning?: Array<{
    taskDescription: string
    deadline?: string
    assignedTeam?: string | null
    status?: string
    notes?: string
  }>
  // Step 5
  communication?: Array<{
    phase: string
    actionDescription: string
    channel: string
    responsibleId?: string | null
    notes?: string
  }>
}

const DRAFT_KEY = 'rse_event_draft'
const STEPS = [
  { n: 1, label: 'Général' },
  { n: 2, label: 'Équipes' },
  { n: 3, label: 'Logistique' },
  { n: 4, label: 'Rétro-planning' },
  { n: 5, label: 'Communication' },
  { n: 6, label: 'Révision' },
]

export function EventWizard({
  step,
  teamMembers,
  partnerships,
  currentUserId,
}: {
  step: number
  teamMembers: Array<{ id: string; name: string; role: string }>
  partnerships: Array<{ id: string; partnerName: string }>
  currentUserId: string
}) {
  const router = useRouter()
  const [draft, setDraft] = useState<WizardDraft>({})
  const [loaded, setLoaded] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) setDraft(JSON.parse(saved))
    } catch {
      // ignore
    }
    setLoaded(true)
  }, [])

  function saveDraft(updates: Partial<WizardDraft>) {
    const next = { ...draft, ...updates }
    setDraft(next)
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  function goStep(n: number) {
    router.push(`/admin/rse/events/new?step=${n}`)
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      // Create event
      const eventRes = await fetch('/api/rse/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          eventType: draft.eventType,
          date: draft.date,
          location: draft.location,
          partnerId: draft.partnerId || null,
          participantCountPlanned: draft.participantCountPlanned ? parseInt(draft.participantCountPlanned) : null,
          sopatCoordinatorId: draft.sopatCoordinatorId,
          notes: draft.notes || null,
        }),
      })

      if (!eventRes.ok) {
        const err = await eventRes.json()
        alert(`Erreur: ${JSON.stringify(err)}`)
        setSubmitting(false)
        return
      }

      const event = await eventRes.json()
      const eventId = event.id

      // Create sub-resources in parallel
      await Promise.all([
        draft.teams?.length
          ? fetch(`/api/rse/events/${eventId}/teams`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ teams: draft.teams }),
            })
          : Promise.resolve(),
        draft.logistics?.length
          ? fetch(`/api/rse/events/${eventId}/logistics`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: draft.logistics }),
            })
          : Promise.resolve(),
        draft.retroplanning?.length
          ? fetch(`/api/rse/events/${eventId}/retroplanning`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tasks: draft.retroplanning }),
            })
          : Promise.resolve(),
        draft.communication?.length
          ? fetch(`/api/rse/events/${eventId}/communication`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ actions: draft.communication }),
            })
          : Promise.resolve(),
      ])

      localStorage.removeItem(DRAFT_KEY)
      router.push(`/admin/rse/events/${eventId}`)
    } catch (e) {
      alert(`Erreur réseau: ${String(e)}`)
      setSubmitting(false)
    }
  }

  if (!loaded) return null

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <a href="/admin/rse/events" className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          ← Événements RSE
        </a>
        <h1 className="text-xl font-bold mt-1" style={{ color: 'var(--admin-text)' }}>
          Créer un événement
        </h1>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center gap-1 flex-1">
            <button
              onClick={() => goStep(s.n)}
              className="flex items-center gap-1.5 text-xs font-medium"
              style={{
                color: step === s.n
                  ? 'var(--admin-emerald)'
                  : step > s.n
                  ? 'var(--admin-text-muted)'
                  : 'var(--admin-text-muted)',
              }}
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: step === s.n
                    ? 'var(--admin-emerald)'
                    : step > s.n
                    ? 'var(--admin-emerald-dim)'
                    : 'var(--admin-border)',
                  color: step === s.n ? '#fff' : step > s.n ? 'var(--admin-emerald)' : 'var(--admin-text-muted)',
                }}
              >
                {step > s.n ? '✓' : s.n}
              </span>
              <span className="hidden sm:block">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px" style={{ background: step > s.n ? 'var(--admin-emerald)' : 'var(--admin-border)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div
        className="rounded-xl border p-6"
        style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
      >
        {step === 1 && (
          <Step1General
            draft={draft}
            teamMembers={teamMembers}
            partnerships={partnerships}
            onNext={(data) => { saveDraft(data); goStep(2) }}
          />
        )}
        {step === 2 && (
          <Step2Teams
            draft={draft}
            teamMembers={teamMembers}
            onBack={() => goStep(1)}
            onNext={(data) => { saveDraft(data); goStep(3) }}
          />
        )}
        {step === 3 && (
          <Step3Logistics
            draft={draft}
            onBack={() => goStep(2)}
            onNext={(data) => { saveDraft(data); goStep(4) }}
          />
        )}
        {step === 4 && (
          <Step4Retroplanning
            draft={draft}
            onBack={() => goStep(3)}
            onNext={(data) => { saveDraft(data); goStep(5) }}
          />
        )}
        {step === 5 && (
          <Step5Communication
            draft={draft}
            teamMembers={teamMembers}
            onBack={() => goStep(4)}
            onNext={(data) => { saveDraft(data); goStep(6) }}
          />
        )}
        {step === 6 && (
          <StepReview
            draft={draft}
            teamMembers={teamMembers}
            partnerships={partnerships}
            onBack={() => goStep(5)}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  )
}
