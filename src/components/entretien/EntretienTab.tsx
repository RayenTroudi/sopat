'use client'

import { useState, useEffect, useCallback } from 'react'
import { CalendarView } from './CalendarView'
import { VisitReportForm } from './VisitReportForm'
import { PlantHealthTracker } from './PlantHealthTracker'
import { ContractSection } from './ContractSection'
import { SatisfactionForm } from './SatisfactionForm'
import type {
  ScheduledVisitRow,
  PlantHealthSummary,
  ContractRow,
  SatisfactionRow,
} from '@/lib/db/entretien'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ─── Types ────────────────────────────────────────────────────────────────────

type User = { id: string; name: string; email: string; role: string }

type PlanVisitForm = {
  visitDate:    string
  visitType:    string
  durationHours: string
  teamMemberId: string
  notes:        string
}

type Props = {
  projectId:    string
  phaseStatus:  string
  plantZones:   string[]   // from études plant categories (e.g. ['Arbres', 'Arbustes', 'Couvre-sols'])
  users:        User[]
  currentUserId: string
}

const VISIT_TYPE_OPTIONS = [
  { value: 'taille',                    label: 'Taille' },
  { value: 'arrosage',                  label: 'Arrosage' },
  { value: 'traitement_phytosanitaire', label: 'Traitement phytosanitaire' },
  { value: 'fertilisation',            label: 'Fertilisation' },
  { value: 'controle_general',         label: 'Contrôle général' },
  { value: 'other',                    label: 'Autre' },
]

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor:'var(--admin-border)', background:'var(--admin-surface)' }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor:'var(--admin-border)' }}>
        <h3 className="text-sm font-semibold" style={{ color:'var(--admin-text)' }}>{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EntretienTab({ projectId, phaseStatus, plantZones, users, currentUserId }: Props) {
  const [visits,          setVisits]          = useState<ScheduledVisitRow[]>([])
  const [healthSummary,   setHealthSummary]   = useState<PlantHealthSummary[]>([])
  const [contract,        setContract]        = useState<ContractRow | null>(null)
  const [satisfactions,   setSatisfactions]   = useState<SatisfactionRow[]>([])
  const [loading,         setLoading]         = useState(true)

  // UI state
  const [showPlanForm,    setShowPlanForm]    = useState(false)
  const [showReportForm,  setShowReportForm]  = useState(false)
  const [activeVisit,     setActiveVisit]     = useState<ScheduledVisitRow | undefined>(undefined)
  const [planForm,        setPlanForm]        = useState<PlanVisitForm>({ visitDate:'', visitType:'controle_general', durationHours:'', teamMemberId:currentUserId, notes:'' })
  const [planSubmitting,  setPlanSubmitting]  = useState(false)
  const [planError,       setPlanError]       = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [visitsRes, healthRes, contractRes, satRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/maintenance-visits`),
      fetch(`/api/projects/${projectId}/plant-health`),
      fetch(`/api/projects/${projectId}/maintenance-contract`),
      fetch(`/api/projects/${projectId}/satisfaction`),
    ])
    if (visitsRes.ok)   setVisits(await visitsRes.json() as ScheduledVisitRow[])
    if (healthRes.ok)   setHealthSummary(await healthRes.json() as PlantHealthSummary[])
    if (contractRes.ok) setContract(await contractRes.json() as ContractRow | null)
    if (satRes.ok)      setSatisfactions(await satRes.json() as SatisfactionRow[])
    setLoading(false)
  }, [projectId])

  useEffect(() => { void load() }, [load])

  async function submitPlanVisit() {
    if (!planForm.visitDate) { setPlanError('Sélectionnez une date'); return }
    setPlanSubmitting(true); setPlanError('')
    const res = await fetch(`/api/projects/${projectId}/maintenance-visits`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        visitDate:    new Date(planForm.visitDate).toISOString(),
        visitType:    planForm.visitType,
        durationHours: planForm.durationHours || undefined,
        teamMemberId: planForm.teamMemberId,
        notes:        planForm.notes || undefined,
      }),
    })
    const data = await res.json() as { error?:string }
    if (!res.ok) { setPlanError(data.error ?? 'Erreur'); setPlanSubmitting(false); return }
    setShowPlanForm(false)
    setPlanForm({ visitDate:'', visitType:'controle_general', durationHours:'', teamMemberId:currentUserId, notes:'' })
    await load()
    setPlanSubmitting(false)
  }

  function openReport(visit?: ScheduledVisitRow) {
    setActiveVisit(visit)
    setShowReportForm(true)
  }

  const pendingVisits = visits.filter((v) => !v.hasReport)
  const completedVisits = visits.filter((v) => v.hasReport)

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <span className="animate-spin w-5 h-5 border-2 rounded-full inline-block" style={{ borderColor:'var(--admin-border)', borderTopColor:'var(--admin-emerald)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Calendrier ── */}
      <Section
        title="Calendrier des visites"
        action={
          <button
            onClick={() => setShowReportForm(true)}
            className="text-xs px-3 py-1.5 rounded-lg font-medium text-white"
            style={{ background:'var(--admin-emerald)' }}
          >
            + Rapport de visite
          </button>
        }
      >
        <CalendarView
          visits={visits}
          onPlanVisit={() => setShowPlanForm(true)}
          onVisitClick={(v) => openReport(v)}
        />
      </Section>

      {/* ── 2. Visites planifiées (pending) ── */}
      {pendingVisits.length > 0 && (
        <Section title={`Visites à venir — ${pendingVisits.length}`}>
          <div className="space-y-2">
            {pendingVisits.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border" style={{ borderColor:'var(--admin-border)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color:'var(--admin-text)' }}>
                    {new Date(v.visitDate).toLocaleDateString('fr-FR', { weekday:'short', day:'2-digit', month:'long' })}
                    {v.durationHours ? ` · ${v.durationHours}h` : ''}
                  </p>
                  <p className="text-xs" style={{ color:'var(--admin-text-muted)' }}>
                    {VISIT_TYPE_OPTIONS.find((o) => o.value === v.visitType)?.label ?? v.visitType}
                    {v.teamMemberName ? ` · ${v.teamMemberName}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => openReport(v)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ background:'var(--admin-emerald-dim)', color:'var(--admin-emerald)' }}
                >
                  Saisir rapport
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── 3. Santé végétale ── */}
      <Section title="Suivi de la santé végétale">
        <PlantHealthTracker summary={healthSummary} />
      </Section>

      {/* ── 4. Historique des rapports ── */}
      {completedVisits.length > 0 && (
        <Section title={`Rapports de visite — ${completedVisits.length}`}>
          <div className="space-y-2">
            {completedVisits.slice(0, 5).map((v) => (
              <div key={v.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border" style={{ borderColor:'var(--admin-border)' }}>
                <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background:'var(--admin-emerald-dim)', color:'var(--admin-emerald)' }}>✓</span>
                <p className="text-sm" style={{ color:'var(--admin-text)' }}>
                  {new Date(v.visitDate).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}
                  {' · '}{VISIT_TYPE_OPTIONS.find((o) => o.value === v.visitType)?.label ?? v.visitType}
                  {v.teamMemberName ? ` · ${v.teamMemberName}` : ''}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── 5. Contrat de maintenance ── */}
      <Section title="Contrat de maintenance">
        <ContractSection
          projectId={projectId}
          contract={contract}
          onUpdated={(c) => setContract(c)}
        />
      </Section>

      {/* ── 6. Satisfaction client ── */}
      <Section title="Satisfaction client (ISO 9001:2015 · clause 9.1.2)">
        <SatisfactionForm
          projectId={projectId}
          records={satisfactions}
          onSubmitted={(r) => setSatisfactions((prev) => [r, ...prev])}
        />
      </Section>

      {/* ── Plan visit drawer ── */}
      {showPlanForm && (
        <>
          <div className="fixed inset-0 z-40" style={{ background:'rgba(0,0,0,0.4)' }} onClick={() => setShowPlanForm(false)} />
          <div className="fixed top-0 right-0 h-full z-50 w-full max-w-md flex flex-col shadow-xl overflow-y-auto" style={{ background:'var(--admin-surface)', borderLeft:'1px solid var(--admin-border)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor:'var(--admin-border)' }}>
              <h2 className="text-base font-semibold" style={{ color:'var(--admin-text)' }}>Planifier une visite</h2>
              <button onClick={() => setShowPlanForm(false)} className="p-1.5 rounded-lg hover:bg-[var(--admin-bg)]" style={{ color:'var(--admin-text-muted)' }}>✕</button>
            </div>
            <div className="flex-1 px-6 py-5 space-y-4">
              <FF label="Date & heure *">
                <input type="datetime-local" value={planForm.visitDate} onChange={(e) => setPlanForm((f) => ({ ...f, visitDate:e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
              </FF>
              <FF label="Type de visite">
                <Select value={planForm.visitType} onValueChange={(v) => setPlanForm((f) => ({ ...f, visitType: v }))}>
                  <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                    {VISIT_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FF>
              <div className="grid grid-cols-2 gap-3">
                <FF label="Durée estimée (h)">
                  <input type="number" step="0.5" min="0" value={planForm.durationHours} onChange={(e) => setPlanForm((f) => ({ ...f, durationHours:e.target.value }))} placeholder="2" className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
                </FF>
                <FF label="Équipe assignée">
                  <Select value={planForm.teamMemberId} onValueChange={(v) => setPlanForm((f) => ({ ...f, teamMemberId: v }))}>
                    <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                      {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FF>
              </div>
              <FF label="Notes">
                <textarea value={planForm.notes} onChange={(e) => setPlanForm((f) => ({ ...f, notes:e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ borderColor:'var(--admin-border)', background:'var(--admin-bg)', color:'var(--admin-text)' }} />
              </FF>
              {planError && <p className="text-sm" style={{ color:'var(--admin-red)' }}>{planError}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowPlanForm(false)} className="flex-1 px-4 py-2.5 rounded-lg border text-sm" style={{ borderColor:'var(--admin-border)', color:'var(--admin-text-muted)' }}>Annuler</button>
                <button onClick={() => void submitPlanVisit()} disabled={planSubmitting} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background:'var(--admin-emerald)' }}>
                  {planSubmitting ? 'Enregistrement…' : 'Planifier'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Visit report form ── */}
      {showReportForm && (
        <VisitReportForm
          projectId={projectId}
          scheduledVisit={activeVisit}
          plantZones={plantZones.length > 0 ? plantZones : ['Zone principale']}
          users={users}
          currentUserId={currentUserId}
          onSubmitted={async () => {
            setShowReportForm(false)
            setActiveVisit(undefined)
            await load()
          }}
          onClose={() => { setShowReportForm(false); setActiveVisit(undefined) }}
        />
      )}
    </div>
  )
}

function FF({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color:'var(--admin-text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}
