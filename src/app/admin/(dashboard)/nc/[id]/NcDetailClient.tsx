'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NcDetail, CapaDetail, AuditFindingOrigin } from '@/lib/db/iso'
import { CloudinaryUploader } from '@/components/upload/CloudinaryUploader'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert', in_progress: 'En cours', closed: 'Clôturé', verified: 'Vérifié',
}
const STATUS_COLORS: Record<string, string> = {
  open:        'bg-[var(--admin-red-dim)] text-[var(--admin-red)]',
  in_progress: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  closed:      'bg-[var(--admin-blue-dim)] text-[var(--admin-blue)]',
  verified:    'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
}
const CAPA_STATUS_LABELS: Record<string, string> = {
  open: 'Ouverte', in_progress: 'En cours', closed: 'Clôturée',
}
const NC_TYPE_LABELS: Record<string, string> = {
  technique: 'NC Technique', documentaire: 'NC Documentaire',
  reclamation_client: 'Réclamation Client', audit: 'Audit', systeme: 'NC Système',
}
const NC_SOURCE_LABELS: Record<string, string> = {
  interne: 'Interne', audit: 'Audit',
  reclamation_client: 'Réclamation Client', reclamation_pi: 'Réclamation PI',
}
const OWNER_TYPE_LABELS: Record<string, string> = {
  interne: 'Interne', externe: 'Externe',
}
const DEPT_LABELS: Record<string, string> = {
  AC: 'AC – Achats', CO: 'CO – Commercial', ET: 'ET – Études',
  MI: 'MI – Management', MI1: 'MI1 – Management Intégré 1', MI2: 'MI2 – Management Intégré 2',
  RE1: 'RE1 – Réalisation 1', RE2: 'RE2 – Réalisation 2', RH: 'RH – RH',
}

/** A date, or the planning expression the register used in its place. */
function fmtOr(d: Date | string | null, text: string | null) {
  if (d) return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  return text ?? '—'
}

function fmt(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

type User = { id: string; name: string; email: string; role: string }

type AuditEntry = {
  id:            string
  entityType:    string
  entityId:      string
  action:        string
  actorName:     string
  actorRole:     string
  previousState: unknown
  newState:      unknown
  /** Porte `changeReason` et `criticalChange` — le pourquoi, pas seulement le quoi. */
  metadata:      unknown
  occurredAt:    Date
}

type Props = {
  nc:              NcDetail
  users:           User[]
  currentUserId:   string
  currentUserName: string
  isAdmin:         boolean
  auditTrail:      AuditEntry[]
  originFinding:   AuditFindingOrigin | null
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  created: 'Création', updated: 'Modification', deleted: 'Suppression',
  imported: 'Reprise du registre historique', reclassified: 'Reclassement',
  status_changed: 'Changement de statut', closed: 'Clôture',
  reopened: 'Réouverture', verified: 'Vérification', revised: 'Révision',
  approved: 'Approbation', rejected: 'Rejet',
}
const AUDIT_ENTITY_LABELS: Record<string, string> = {
  non_conformance: 'NC', corrective_action: 'Action corrective',
}

/** yyyy-mm-dd for <input type="date">, or '' when unset. */
function dateInput(d: Date | string | null | undefined) {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10)
}

/** '' -> null so a cleared field actually clears in the database. */
const orNull = (v: string) => (v.trim() === '' ? null : v.trim())
const dateOrNull = (v: string) => (v === '' ? null : new Date(v).toISOString())

type EditState = {
  description: string; impact: string; ncType: string; ncSource: string
  dept: string; ownerType: string; auditorName: string; detectorName: string
  detectorEmail: string; referenceDoc: string
  immediateCorrection: string; derogationAuth: boolean; rebut: boolean
  correctionResponsible: string
  correctionDeadlinePlanned: string; correctionDeadlinePlannedText: string
  correctionDeadlineActual: string;  correctionDeadlineActualText: string
  correctionProgress: string
  evalDatePlanned: string; evalDateActual: string
  clientResponse: string; clientResponseRef: string
  isRisk: boolean; isOpportunity: boolean
  riskDesignation: string; opportunityDesignation: string
  needsSecondCapa: boolean
}

function editStateFrom(nc: NcDetail): EditState {
  return {
    description:  nc.description ?? '',
    impact:       nc.impact ?? '',
    ncType:       nc.ncType ?? '',
    ncSource:     nc.ncSource ?? '',
    dept:         nc.dept ?? '',
    ownerType:    nc.ownerType ?? '',
    auditorName:  nc.auditorName ?? '',
    detectorName: nc.detectorName ?? '',
    detectorEmail: nc.detectorEmail ?? '',
    referenceDoc:  nc.referenceDoc ?? '',
    immediateCorrection: nc.immediateCorrection ?? '',
    derogationAuth: !!nc.derogationAuth,
    rebut:          !!nc.rebut,
    correctionResponsible: nc.correctionResponsible ?? '',
    correctionDeadlinePlanned:     dateInput(nc.correctionDeadlinePlanned),
    correctionDeadlinePlannedText: nc.correctionDeadlinePlannedText ?? '',
    correctionDeadlineActual:      dateInput(nc.correctionDeadlineActual),
    correctionDeadlineActualText:  nc.correctionDeadlineActualText ?? '',
    correctionProgress: nc.correctionProgress != null ? String(Math.round(nc.correctionProgress * 100)) : '',
    evalDatePlanned: dateInput(nc.evalDatePlanned),
    evalDateActual:  dateInput(nc.evalDateActual),
    clientResponse:    nc.clientResponse ?? '',
    clientResponseRef: nc.clientResponseRef ?? '',
    isRisk:        !!nc.isRisk,
    isOpportunity: !!nc.isOpportunity,
    riskDesignation:        nc.riskDesignation ?? '',
    opportunityDesignation: nc.opportunityDesignation ?? '',
    needsSecondCapa: !!nc.needsSecondCapa,
  }
}

export function NcDetailClient({ nc: initialNc, users, currentUserId, currentUserName, isAdmin, auditTrail, originFinding }: Props) {
  const [nc, setNc] = useState(initialNc)
  const [status, setStatus] = useState('')
  const [rootCause, setRootCause] = useState(nc.rootCause ?? '')
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState('')

  // CAPA form
  const [showCapaForm, setShowCapaForm] = useState(false)
  const [capaForm, setCapaForm] = useState({
    actionDescription: '', responsibleId: '', responsibleName: '',
    deadline: '', deadlinePlannedText: '', progressStatus: '', notes: '',
  })
  const [capaSubmitting, setCapaSubmitting] = useState(false)
  const [capaError, setCapaError] = useState('')

  // Field editing (admin / direction only)
  const [editing, setEditing]       = useState(false)
  const [edit, setEdit]             = useState<EditState>(() => editStateFrom(initialNc))
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError]   = useState('')
  // Motif de modification : exigé par le serveur dès qu'un engagement bouge sur
  // une fiche déjà instruite. Le champ est toujours offert, jamais deviné.
  const [changeReason, setChangeReason] = useState('')

  /**
   * Une fiche « open » se corrige librement. Dès qu'elle est instruite, clôturée
   * ou vérifiée, des engagements ont été pris et le serveur exige un motif pour
   * les défaire (ISO 9001:2015 §7.5.3.2 c).
   */
  const isEngaged = nc.status !== 'open'

  async function reload() {
    const res = await fetch(`/api/nc/${nc.id}`)
    if (res.ok) setNc(await res.json() as NcDetail)
  }

  function startEditing() {
    setEdit(editStateFrom(nc))
    setEditError('')
    setEditing(true)
  }

  async function saveEdit() {
    if (edit.description.trim().length < 5) {
      setEditError('La description doit comporter au moins 5 caractères'); return
    }
    const pct = edit.correctionProgress.trim()
    if (pct !== '' && (Number.isNaN(Number(pct)) || Number(pct) < 0 || Number(pct) > 100)) {
      setEditError('L\u2019état d\u2019avancement doit être un pourcentage entre 0 et 100'); return
    }
    setEditSaving(true)
    setEditError('')

    const res = await fetch(`/api/nc/${nc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description:   edit.description.trim(),
        impact:        orNull(edit.impact),
        ncType:        orNull(edit.ncType),
        ncSource:      orNull(edit.ncSource),
        dept:          orNull(edit.dept),
        ownerType:     orNull(edit.ownerType),
        auditorName:   orNull(edit.auditorName),
        detectorName:  orNull(edit.detectorName),
        detectorEmail: orNull(edit.detectorEmail),
        referenceDoc:  orNull(edit.referenceDoc),
        immediateCorrection:   orNull(edit.immediateCorrection),
        derogationAuth:        edit.derogationAuth,
        rebut:                 edit.rebut,
        correctionResponsible: orNull(edit.correctionResponsible),
        correctionDeadlinePlanned:     dateOrNull(edit.correctionDeadlinePlanned),
        // A real date wins; the free-text field only holds planning expressions.
        correctionDeadlinePlannedText: edit.correctionDeadlinePlanned ? null : orNull(edit.correctionDeadlinePlannedText),
        correctionDeadlineActual:      dateOrNull(edit.correctionDeadlineActual),
        correctionDeadlineActualText:  edit.correctionDeadlineActual ? null : orNull(edit.correctionDeadlineActualText),
        correctionProgress: pct === '' ? null : Number(pct) / 100,
        evalDatePlanned: dateOrNull(edit.evalDatePlanned),
        evalDateActual:  dateOrNull(edit.evalDateActual),
        clientResponse:    orNull(edit.clientResponse),
        clientResponseRef: orNull(edit.clientResponseRef),
        isRisk:        edit.isRisk,
        isOpportunity: edit.isOpportunity,
        riskDesignation:        edit.isRisk ? orNull(edit.riskDesignation) : null,
        opportunityDesignation: edit.isOpportunity ? orNull(edit.opportunityDesignation) : null,
        needsSecondCapa: edit.needsSecondCapa,
        changeReason: changeReason.trim() || undefined,
      }),
    })
    const data = await res.json() as NcDetail & { error?: string }
    if (!res.ok) { setEditError(data.error ?? 'Erreur'); setEditSaving(false); return }
    setNc(data)
    setEditing(false)
    setChangeReason('')
    setEditSaving(false)
  }

  async function updateStatus() {
    if (!status) return
    setStatusLoading(true)
    setStatusError('')
    const res = await fetch(`/api/nc/${nc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        rootCause: rootCause || undefined,
        changeReason: changeReason.trim() || undefined,
      }),
    })
    const data = await res.json() as NcDetail & { error?: string }
    if (!res.ok) { setStatusError(data.error ?? 'Erreur'); setStatusLoading(false); return }
    setNc(data)
    setStatus('')
    setStatusLoading(false)
  }

  async function submitCapa() {
    if (!capaForm.actionDescription.trim() || capaForm.actionDescription.length < 10) {
      setCapaError('L\'action doit comporter au moins 10 caractères')
      return
    }
    // A platform account OR a free-text role ("RMI", "DG") is enough.
    if (!capaForm.responsibleId && !capaForm.responsibleName.trim()) {
      setCapaError('Indiquez un responsable : un compte ou un nom / rôle'); return
    }
    setCapaSubmitting(true)
    setCapaError('')
    const res = await fetch(`/api/nc/${nc.id}/capa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionDescription:   capaForm.actionDescription,
        responsibleId:       capaForm.responsibleId || undefined,
        responsibleName:     capaForm.responsibleName.trim() || undefined,
        deadlinePlanned:     capaForm.deadline ? new Date(capaForm.deadline).toISOString() : undefined,
        deadlinePlannedText: capaForm.deadline ? undefined : (capaForm.deadlinePlannedText.trim() || undefined),
        progressStatus:      capaForm.progressStatus.trim() || undefined,
        notes:               capaForm.notes || undefined,
      }),
    })
    const data = await res.json() as { id?: string; error?: string }
    if (!res.ok) { setCapaError(data.error ?? 'Erreur'); setCapaSubmitting(false); return }
    setShowCapaForm(false)
    setCapaForm({ actionDescription: '', responsibleId: '', responsibleName: '',
      deadline: '', deadlinePlannedText: '', progressStatus: '', notes: '' })
    await reload()
    setCapaSubmitting(false)
  }

  async function updateCapa(capaId: string, patch: Record<string, unknown>) {
    await fetch(`/api/nc/${nc.id}/capa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capaId, ...patch }),
    })
    await reload()
  }

  const isOverdue = nc.correctionDeadlinePlanned && new Date(nc.correctionDeadlinePlanned) < new Date() && nc.status !== 'closed' && nc.status !== 'verified'

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
        <Link href="/admin/nc" className="hover:underline">Non-Conformités</Link>
        <span>/</span>
        <span style={{ color: 'var(--admin-text)' }}>{nc.reference}</span>
      </nav>

      {/* Header card */}
      <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {nc.ncFicheNum && (
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded"
                  style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
                  N°{nc.ncFicheNum}
                </span>
              )}
              <h1 className="text-xl font-semibold font-mono" style={{ color: 'var(--admin-text)' }}>{nc.reference}</h1>
              {nc.dept && (
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded"
                  style={{ background: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  {nc.dept}
                </span>
              )}
              {nc.ncMonth && (
                <span className="text-xs px-2 py-0.5 rounded"
                  style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                  {nc.ncMonth}
                </span>
              )}
              {nc.dmsDocumentCode && (
                <a href={`/admin/documents?search=${encodeURIComponent(nc.dmsDocumentCode)}`}
                  className="font-mono text-[11px] px-2 py-0.5 rounded hover:opacity-75 transition-opacity"
                  style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                  {nc.dmsDocumentCode}
                </a>
              )}
              <span className={cn('text-xs px-2 py-0.5 rounded font-medium', STATUS_COLORS[nc.status])}>
                {STATUS_LABELS[nc.status]}
              </span>
              {isOverdue && (
                <span className="text-xs px-2 py-0.5 rounded font-medium bg-[var(--admin-red-dim)] text-[var(--admin-red)]">
                  En retard
                </span>
              )}
              {nc.isRisk && (
                <span className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--admin-red)' }}>
                  <TrendingDown className="w-3.5 h-3.5" />
                  {nc.riskDesignation ? `Risque : ${nc.riskDesignation}` : 'Risque'}
                </span>
              )}
              {nc.isOpportunity && (
                <span className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--admin-emerald)' }}>
                  <TrendingUp className="w-3.5 h-3.5" />
                  {nc.opportunityDesignation ? `Opportunité : ${nc.opportunityDesignation}` : 'Opportunité'}
                </span>
              )}
              {nc.recordOrigin === 'imported' && (
                <span className="text-xs px-2 py-0.5 rounded font-medium"
                  style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
                  title={nc.importedFrom ?? 'Reprise du registre historique'}>
                  Fiche historique (importée)
                </span>
              )}
              {nc.needsSecondCapa && (
                <span className="text-xs px-2 py-0.5 rounded font-medium"
                  style={{ background: 'var(--admin-amber-dim)', color: 'var(--admin-amber)' }}>
                  2ᵉ action corrective requise
                </span>
              )}
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--admin-text-muted)' }}>
              {nc.ncType ? NC_TYPE_LABELS[nc.ncType] : '—'}
              {nc.ncSource ? ` · Source : ${NC_SOURCE_LABELS[nc.ncSource] ?? nc.ncSource}` : ''}
              {nc.auditorName ? ` · Auditeur : ${nc.auditorName}` : ''}
              {nc.referenceDoc ? ` · Réf : ${nc.referenceDoc}` : ''}
              {nc.projectName ? ` · ${nc.projectName}` : ''}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
              Détectée le {fmt(nc.detectedAt)} par {nc.detectorName ?? nc.detectedByName ?? '—'}
              {nc.detectorEmail ? ` (${nc.detectorEmail})` : ''}
            </p>
          </div>
          {isAdmin && !editing && (
            <button
              onClick={startEditing}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg border font-medium hover:opacity-80 transition-opacity"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
            >
              Modifier la fiche
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t" style={{ borderColor: 'var(--admin-border)' }}>
          <InfoCell label="Assigné à"     value={nc.assignedToName ?? '—'} />
          <InfoCell label="Correction (prévu)" value={fmtOr(nc.correctionDeadlinePlanned, nc.correctionDeadlinePlannedText)} highlight={!!isOverdue} />
          <InfoCell label="Correction (réel)"  value={fmtOr(nc.correctionDeadlineActual, nc.correctionDeadlineActualText)} />
          <InfoCell label="Clôturé le"    value={fmt(nc.closedAt)} />
        </div>

        {/* Eval dates */}
        {(nc.evalDatePlanned || nc.evalDateActual) && (
          <div className="grid grid-cols-2 gap-4 pt-3 border-t" style={{ borderColor: 'var(--admin-border)' }}>
            <InfoCell label="Évaluation efficacité (prévue)" value={fmt(nc.evalDatePlanned)} />
            <InfoCell label="Évaluation efficacité (réelle)" value={fmt(nc.evalDateActual)} />
          </div>
        )}
      </div>

      {/* Origin: the audit finding that raised this NC */}
      {originFinding && (
        <Card title="Origine — constat d'audit">
          <div className="space-y-2">
            <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{originFinding.agendaStep}</p>
            {originFinding.response && (
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--admin-text-muted)' }}>
                {originFinding.response}
              </p>
            )}
            <div className="flex gap-4 flex-wrap text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              {originFinding.clauseRef && (
                <span>Clause ISO : <span style={{ color: 'var(--admin-text)' }}>{originFinding.clauseRef}</span></span>
              )}
              {originFinding.evidence && (
                <span>Preuves : <span style={{ color: 'var(--admin-text)' }}>{originFinding.evidence}</span></span>
              )}
              <span>Processus : <span style={{ color: 'var(--admin-text)' }}>{originFinding.programDept}</span></span>
            </div>
            <a href={`/admin/audit-programs?ref=${encodeURIComponent(originFinding.programRef)}`}
              className="inline-block text-xs font-medium hover:underline"
              style={{ color: 'var(--admin-accent)' }}>
              Programme d&apos;audit {originFinding.programRef} ({originFinding.programYear}) →
            </a>
          </div>
        </Card>
      )}

      {/* Historical provenance notice */}
      {nc.recordOrigin === 'imported' && (
        <div className="rounded-xl border p-4 text-sm"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
          <p className="font-medium mb-1" style={{ color: 'var(--admin-text)' }}>
            Fiche reprise du registre historique
          </p>
          <p style={{ color: 'var(--admin-text-muted)' }}>
            Cette fiche provient de {nc.importedFrom ?? 'l\u2019ancien registre Excel'} et est
            antérieure au flux qualité de la plateforme. Le système d\u2019origine ne collectait
            ni preuve d\u2019action corrective ni vérification d\u2019efficacité : ces champs sont
            vides par construction, et aucune preuve n\u2019a été fabriquée lors de la reprise.
            Son statut et sa date de clôture sont conservés tels qu\u2019ils figurent au registre.
          </p>
          <p className="mt-2" style={{ color: 'var(--admin-text-muted)' }}>
            Les nouvelles non-conformités restent soumises au flux complet : preuve documentée
            et vérification d\u2019efficacité obligatoires avant clôture.
          </p>
        </div>
      )}

      {/* Edit form (admin / direction) */}
      {editing && (
        <Card title="Modifier la fiche FOR-MI-05">
          <div className="space-y-4">
            <FormField label="Identification de la NC *">
              <textarea
                value={edit.description}
                onChange={(e) => setEdit((f) => ({ ...f, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
              />
            </FormField>
            <FormField label="Impact de la non-conformité">
              <textarea
                value={edit.impact}
                onChange={(e) => setEdit((f) => ({ ...f, impact: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
              />
            </FormField>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <EditSelect label="Type de NC" value={edit.ncType} options={NC_TYPE_LABELS}
                onChange={(v) => setEdit((f) => ({ ...f, ncType: v }))} />
              <EditSelect label="Source de NC" value={edit.ncSource} options={NC_SOURCE_LABELS}
                onChange={(v) => setEdit((f) => ({ ...f, ncSource: v }))} />
              <EditSelect label="Processus rattaché" value={edit.dept} options={DEPT_LABELS}
                onChange={(v) => setEdit((f) => ({ ...f, dept: v }))} />
              <EditSelect label="Origine" value={edit.ownerType} options={OWNER_TYPE_LABELS}
                onChange={(v) => setEdit((f) => ({ ...f, ownerType: v }))} />
              <EditText label="Document de référence" value={edit.referenceDoc}
                onChange={(v) => setEdit((f) => ({ ...f, referenceDoc: v }))} placeholder="NC N°12" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <EditText label="Détecteur" value={edit.detectorName}
                onChange={(v) => setEdit((f) => ({ ...f, detectorName: v }))} placeholder="MAM, TEM, Auditeur…" />
              <EditText label="Coordonnées" value={edit.detectorEmail}
                onChange={(v) => setEdit((f) => ({ ...f, detectorEmail: v }))} placeholder="email ou contact" />
              <EditText label="Auditeur" value={edit.auditorName}
                onChange={(v) => setEdit((f) => ({ ...f, auditorName: v }))} />
            </div>

            <SectionRule label="Correction" />
            <FormField label="Action(s) de correction">
              <textarea
                value={edit.immediateCorrection}
                onChange={(e) => setEdit((f) => ({ ...f, immediateCorrection: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
              />
            </FormField>
            <div className="flex gap-5 flex-wrap text-sm" style={{ color: 'var(--admin-text)' }}>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={edit.derogationAuth}
                  onChange={(e) => setEdit((f) => ({ ...f, derogationAuth: e.target.checked }))} />
                Autorisation de dérogation
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={edit.rebut}
                  onChange={(e) => setEdit((f) => ({ ...f, rebut: e.target.checked }))} />
                Rebut
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={edit.needsSecondCapa}
                  onChange={(e) => setEdit((f) => ({ ...f, needsSecondCapa: e.target.checked }))} />
                Nécessité d&apos;une 2ᵉ action corrective
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <EditText label="Responsable(s)" value={edit.correctionResponsible}
                onChange={(v) => setEdit((f) => ({ ...f, correctionResponsible: v }))} placeholder="RMI, DG…" />
              <EditDate label="Date prévue" value={edit.correctionDeadlinePlanned}
                onChange={(v) => setEdit((f) => ({ ...f, correctionDeadlinePlanned: v }))} />
              <EditText label="…ou échéance en clair" value={edit.correctionDeadlinePlannedText}
                disabled={!!edit.correctionDeadlinePlanned}
                onChange={(v) => setEdit((f) => ({ ...f, correctionDeadlinePlannedText: v }))}
                placeholder="S3 Juin 2025…" />
              <EditDate label="Date réalisée" value={edit.correctionDeadlineActual}
                onChange={(v) => setEdit((f) => ({ ...f, correctionDeadlineActual: v }))} />
              <EditText label="…ou réalisation en clair" value={edit.correctionDeadlineActualText}
                disabled={!!edit.correctionDeadlineActual}
                onChange={(v) => setEdit((f) => ({ ...f, correctionDeadlineActualText: v }))} />
              <EditText label="État d&apos;avancement (%)" value={edit.correctionProgress}
                onChange={(v) => setEdit((f) => ({ ...f, correctionProgress: v }))} placeholder="0 – 100" />
            </div>

            <SectionRule label="Évaluation de l&apos;efficacité" />
            <div className="grid grid-cols-2 gap-3">
              <EditDate label="Date d&apos;évaluation prévue" value={edit.evalDatePlanned}
                onChange={(v) => setEdit((f) => ({ ...f, evalDatePlanned: v }))} />
              <EditDate label="Date d&apos;évaluation réalisée" value={edit.evalDateActual}
                onChange={(v) => setEdit((f) => ({ ...f, evalDateActual: v }))} />
            </div>

            <SectionRule label="Réponse Client / PI" />
            <div className="grid grid-cols-2 gap-3">
              <EditText label="Date(s)" value={edit.clientResponse}
                onChange={(v) => setEdit((f) => ({ ...f, clientResponse: v }))} />
              <EditText label="Référence" value={edit.clientResponseRef}
                onChange={(v) => setEdit((f) => ({ ...f, clientResponseRef: v }))} />
            </div>

            <SectionRule label="Désignation de R / O" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--admin-text)' }}>
                  <input type="checkbox" checked={edit.isRisk}
                    onChange={(e) => setEdit((f) => ({ ...f, isRisk: e.target.checked }))} />
                  Risque
                </label>
                <EditText label="Désignation du risque" value={edit.riskDesignation}
                  disabled={!edit.isRisk}
                  onChange={(v) => setEdit((f) => ({ ...f, riskDesignation: v }))}
                  placeholder="qualité du service, stratégique RH…" />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--admin-text)' }}>
                  <input type="checkbox" checked={edit.isOpportunity}
                    onChange={(e) => setEdit((f) => ({ ...f, isOpportunity: e.target.checked }))} />
                  Opportunité
                </label>
                <EditText label="Désignation de l&apos;opportunité" value={edit.opportunityDesignation}
                  disabled={!edit.isOpportunity}
                  onChange={(v) => setEdit((f) => ({ ...f, opportunityDesignation: v }))}
                  placeholder="A améliorer, performance sociale…" />
              </div>
            </div>

            <SectionRule label="Motif de la modification" />
            <div className="space-y-1.5">
              <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                {isEngaged
                  ? 'Cette fiche est engagée. Modifier une échéance, un responsable, le type '
                    + 'ou l\'impact exige un motif : il est conservé au journal et la fiche passe '
                    + `en révision ${(nc.revisionNumber ?? 1) + 1}.`
                  : 'Facultatif tant que la fiche est ouverte — il devient obligatoire dès qu\'elle '
                    + 'est instruite.'}
              </p>
              <textarea
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                rows={2}
                placeholder="Report demandé par le client, validé en revue du 12/03…"
                className="w-full text-sm rounded-lg border px-3 py-2"
                style={{
                  borderColor: 'var(--admin-border)',
                  background: 'var(--admin-bg)',
                  color: 'var(--admin-text)',
                }}
              />
            </div>

            {editError && (
              <p className="text-xs" style={{ color: 'var(--admin-red)' }}>{editError}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => void saveEdit()}
                disabled={editSaving}
                className="text-sm px-4 py-2 rounded-lg font-medium text-white disabled:opacity-60"
                style={{ background: 'var(--admin-accent)' }}
              >
                {editSaving
                  ? 'Enregistrement…'
                  : isEngaged
                    ? `Enregistrer en révision ${(nc.revisionNumber ?? 1) + 1}`
                    : 'Enregistrer'}
              </button>
              <button
                onClick={() => { setEditing(false); setEditError('') }}
                disabled={editSaving}
                className="text-sm px-4 py-2 rounded-lg border font-medium disabled:opacity-60"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
              >
                Annuler
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Identification */}
      <Card title="Identification de la NC">
        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{nc.description}</p>
        {nc.impact && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--admin-border)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>Impact de la non-conformité</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{nc.impact}</p>
          </div>
        )}
      </Card>

      {/* Immediate correction */}
      {(nc.immediateCorrection || nc.derogationAuth || nc.rebut || nc.correctionResponsible) && (
        <Card title="Correction immédiate">
          <div className="space-y-3">
            {nc.immediateCorrection && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{nc.immediateCorrection}</p>
            )}
            <div className="flex gap-4 text-sm flex-wrap">
              {nc.derogationAuth && (
                <span className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{ background: 'var(--admin-amber-dim)', color: 'var(--admin-amber)' }}>
                  Autorisation de dérogation
                </span>
              )}
              {nc.rebut && (
                <span className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
                  Rebut
                </span>
              )}
            </div>
            {nc.correctionResponsible && (
              <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                Responsable(s) : <span style={{ color: 'var(--admin-text)' }}>{nc.correctionResponsible}</span>
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <InfoCell label="Date prévue"  value={fmtOr(nc.correctionDeadlinePlanned, nc.correctionDeadlinePlannedText)} />
              <InfoCell label="Date réalisée" value={fmtOr(nc.correctionDeadlineActual, nc.correctionDeadlineActualText)} />
            </div>
            {nc.correctionProgress !== null && nc.correctionProgress !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  <span>État d&apos;avancement correction</span>
                  <span style={{ color: 'var(--admin-text)', fontWeight: 600 }}>{Math.round(nc.correctionProgress * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--admin-border)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(nc.correctionProgress * 100)}%`, background: nc.correctionProgress >= 1 ? 'var(--admin-emerald)' : 'var(--admin-accent)' }} />
                </div>
              </div>
            )}
            {nc.correctionStatus && (
              <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                État d&apos;avancement : <span style={{ color: 'var(--admin-text)' }}>{nc.correctionStatus}</span>
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Root cause */}
      <Card title="Analyse des causes racines">
        <textarea
          value={rootCause}
          onChange={(e) => setRootCause(e.target.value)}
          rows={3}
          placeholder="Causes racines identifiées par analyse (5 pourquoi, Ishikawa…)"
          disabled={nc.status === 'closed' || nc.status === 'verified'}
          className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
        />
      </Card>

      {/* Client response (for complaints) */}
      {(nc.ncSource === 'reclamation_client' || nc.ncSource === 'reclamation_pi' || nc.clientResponse || nc.clientResponseRef) && (
        <Card title="Réponse Client / PI">
          <div className="space-y-3">
            {nc.clientResponseRef && (
              <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                Référence : <span style={{ color: 'var(--admin-text)', fontWeight: 500 }}>{nc.clientResponseRef}</span>
              </p>
            )}
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: nc.clientResponse ? 'var(--admin-text)' : 'var(--admin-text-muted)' }}>
              {nc.clientResponse ?? 'Aucune réponse enregistrée.'}
            </p>
          </div>
        </Card>
      )}

      {/* ISO 9001 traceability */}
      <Card title="Traçabilité (ISO 9001)">
        {auditTrail.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Aucune trace enregistrée. Les fiches importées du registre Excel n&apos;ont pas
            d&apos;historique antérieur à leur reprise dans la plateforme.
          </p>
        ) : (
          <ol className="space-y-3">
            {auditTrail.map((e) => (
              <li key={e.id} className="text-xs flex gap-3">
                <span className="shrink-0 tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>
                  {new Date(e.occurredAt).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                <div className="min-w-0 flex-1">
                  <p style={{ color: 'var(--admin-text)' }}>
                    <span className="font-medium">
                      {AUDIT_ACTION_LABELS[e.action] ?? e.action}
                    </span>
                    {' · '}
                    <span style={{ color: 'var(--admin-text-muted)' }}>
                      {AUDIT_ENTITY_LABELS[e.entityType] ?? e.entityType}
                    </span>
                    {' · '}
                    {e.actorName}
                    <span style={{ color: 'var(--admin-text-muted)' }}> ({e.actorRole})</span>
                  </p>
                  <AuditReason metadata={e.metadata} />
                  <AuditDiff previous={e.previousState} next={e.newState} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* Photos avant/après */}
      <Card title="Photos (avant / après)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--admin-text-muted)' }}>Photo avant</p>
            {nc.beforePhotoUrl ? (
              <img src={nc.beforePhotoUrl} alt="Avant" className="w-full rounded-lg object-cover max-h-48" />
            ) : (
              <CloudinaryUploader
                projectId={nc.id}
                assetType="other"
                accept="image/*"
                label="Téléverser photo avant"
                maxFiles={1}
                onUploaded={(asset) => {
                  void fetch(`/api/nc/${nc.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ beforePhotoAssetId: asset.id }),
                  }).then(() => window.location.reload())
                }}
              />
            )}
          </div>
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--admin-text-muted)' }}>Photo après</p>
            {nc.afterPhotoUrl ? (
              <img src={nc.afterPhotoUrl} alt="Après" className="w-full rounded-lg object-cover max-h-48" />
            ) : (
              <CloudinaryUploader
                projectId={nc.id}
                assetType="other"
                accept="image/*"
                label="Téléverser photo après"
                maxFiles={1}
                onUploaded={(asset) => {
                  void fetch(`/api/nc/${nc.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ afterPhotoAssetId: asset.id }),
                  }).then(() => window.location.reload())
                }}
              />
            )}
          </div>
        </div>
      </Card>

      {/* Status change */}
      {nc.status !== 'verified' && (
        <Card title="Changer le statut">
          <div className="flex gap-3 flex-wrap">
            <Select
              value={status === '' ? '__none__' : status}
              onValueChange={(v) => setStatus(v === '__none__' ? '' : v)}
            >
              <SelectTrigger className="text-sm bg-[#F4F8F5] flex-1" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                <SelectValue placeholder="— Sélectionner un statut —" />
              </SelectTrigger>
              <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                <SelectItem value="__none__">— Sélectionner un statut —</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="closed">Clôturer</SelectItem>
                <SelectItem value="verified">Vérifier (indépendant)</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={() => void updateStatus()}
              disabled={!status || statusLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--admin-emerald)' }}
            >
              {statusLoading ? 'Mise à jour…' : 'Appliquer'}
            </button>
          </div>
          {statusError && <p className="text-sm mt-2" style={{ color: 'var(--admin-red)' }}>{statusError}</p>}
          <p className="text-xs mt-2" style={{ color: 'var(--admin-text-muted)' }}>
            La clôture requiert : action corrective créée ✓, preuve téléchargée ✓, vérification par un utilisateur différent du détecteur ✓
          </p>
        </Card>
      )}

      {/* CAPA section */}
      <Card
        title={`Actions Correctives (CAPA) — ${nc.capa.length} action${nc.capa.length !== 1 ? 's' : ''}`}
        action={
          nc.status !== 'closed' && nc.status !== 'verified' && (
            <button
              onClick={() => setShowCapaForm(true)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium text-white"
              style={{ background: 'var(--admin-emerald)' }}
            >
              + Ajouter CAPA
            </button>
          )
        }
      >
        {nc.capa.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--admin-text-muted)' }}>
            Aucune action corrective enregistrée.
          </p>
        ) : (
          <div className="space-y-4">
            {nc.capa.map((capa) => (
              <CapaCard
                key={capa.id}
                capa={capa}
                ncId={nc.id}
                currentUserId={currentUserId}
                ncDetectedById={nc.detectedById}
                onUpdate={updateCapa}
                isNcClosed={nc.status === 'closed' || nc.status === 'verified'}
              />
            ))}
          </div>
        )}

        {/* CAPA create form */}
        {showCapaForm && (
          <div className="mt-4 p-4 rounded-xl border space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
            <h4 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Nouvelle action corrective</h4>
            <div className="space-y-3">
              <FormField label="Description de l'action *">
                <textarea
                  value={capaForm.actionDescription}
                  onChange={(e) => setCapaForm((f) => ({ ...f, actionDescription: e.target.value }))}
                  rows={3}
                  placeholder="Décrivez précisément l'action corrective à mener…"
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Responsable (compte)">
                  <Select
                    value={capaForm.responsibleId === '' ? '__none__' : capaForm.responsibleId}
                    onValueChange={(v) => setCapaForm((f) => ({ ...f, responsibleId: v === '__none__' ? '' : v }))}
                  >
                    <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                      <SelectValue placeholder="— Sélectionner —" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                      <SelectItem value="__none__">— Sélectionner —</SelectItem>
                      {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="…ou responsable (nom / rôle)">
                  <input
                    value={capaForm.responsibleName}
                    onChange={(e) => setCapaForm((f) => ({ ...f, responsibleName: e.target.value }))}
                    placeholder="RMI, DG, Equipe réalisation…"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                  />
                </FormField>
                <FormField label="Délai prévu">
                  <input
                    type="date"
                    value={capaForm.deadline}
                    onChange={(e) => setCapaForm((f) => ({ ...f, deadline: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                  />
                </FormField>
                <FormField label="…ou échéance en clair">
                  <input
                    value={capaForm.deadlinePlannedText}
                    onChange={(e) => setCapaForm((f) => ({ ...f, deadlinePlannedText: e.target.value }))}
                    disabled={!!capaForm.deadline}
                    placeholder="S3 Juin 2025, Réunion du groupe…"
                    className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                  />
                </FormField>
                <FormField label="État d&apos;avancement">
                  <input
                    value={capaForm.progressStatus}
                    onChange={(e) => setCapaForm((f) => ({ ...f, progressStatus: e.target.value }))}
                    placeholder="100%, en cours…"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                  />
                </FormField>
              </div>
              <FormField label="Notes">
                <input
                  value={capaForm.notes}
                  onChange={(e) => setCapaForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Notes complémentaires…"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                />
              </FormField>
            </div>
            {capaError && <p className="text-sm" style={{ color: 'var(--admin-red)' }}>{capaError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowCapaForm(false)} className="px-3 py-1.5 rounded-lg border text-sm" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                Annuler
              </button>
              <button onClick={() => void submitCapa()} disabled={capaSubmitting} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: 'var(--admin-emerald)' }}>
                {capaSubmitting ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CapaCard({
  capa,
  ncId,
  currentUserId,
  ncDetectedById,
  onUpdate,
  isNcClosed,
}: {
  capa: CapaDetail
  ncId: string
  currentUserId: string
  ncDetectedById: string
  onUpdate: (capaId: string, patch: Record<string, unknown>) => Promise<void>
  isNcClosed: boolean
}) {
  const [uploading, setUploading] = useState(false)
  const isVerifier = currentUserId !== ncDetectedById

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-sm font-medium flex-1" style={{ color: 'var(--admin-text)' }}>
          {capa.actionDescription}
        </p>
        <span className={cn('text-xs px-2 py-0.5 rounded font-medium shrink-0', {
          'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]': capa.status === 'open',
          'bg-[var(--admin-blue-dim)] text-[var(--admin-blue)]':  capa.status === 'in_progress',
          'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]': capa.status === 'closed',
        })}>
          {CAPA_STATUS_LABELS[capa.status] ?? capa.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
        <span>Responsable : <span style={{ color: 'var(--admin-text)' }}>{capa.responsibleName ?? '—'}</span></span>
        <span>Délai prévu : <span style={{ color: 'var(--admin-text)' }}>{
          capa.deadlinePlanned ? new Date(capa.deadlinePlanned).toLocaleDateString('fr-FR')
            : capa.deadlinePlannedText ? capa.deadlinePlannedText
            : capa.deadline ? new Date(capa.deadline).toLocaleDateString('fr-FR')
            : '—'
        }</span></span>
        {(capa.deadlineActual || capa.deadlineActualText) && (
          <span>Réalisé le : <span style={{ color: 'var(--admin-emerald)' }}>{
            capa.deadlineActual ? new Date(capa.deadlineActual).toLocaleDateString('fr-FR') : capa.deadlineActualText
          }</span></span>
        )}
        {capa.progressStatus && (
          <span>Avancement : <span style={{ color: 'var(--admin-text)' }}>{capa.progressStatus}</span></span>
        )}
        {(capa.evalDatePlanned || capa.evalDatePlannedText) && (
          <span>Éval. prévue : <span style={{ color: 'var(--admin-text)' }}>{
            capa.evalDatePlanned ? new Date(capa.evalDatePlanned).toLocaleDateString('fr-FR') : capa.evalDatePlannedText
          }</span></span>
        )}
        {(capa.evalDateActual || capa.evalDateActualText) && (
          <span>Éval. réalisée : <span style={{ color: 'var(--admin-emerald)' }}>{
            capa.evalDateActual ? new Date(capa.evalDateActual).toLocaleDateString('fr-FR') : capa.evalDateActualText
          }</span></span>
        )}
        {capa.effectivenessVerified && (
          <span className="col-span-2" style={{ color: 'var(--admin-emerald)' }}>
            ✓ Efficacité vérifiée par {capa.verifiedByName} le {new Date(capa.verifiedAt!).toLocaleDateString('fr-FR')}
          </span>
        )}
      </div>

      {!isNcClosed && (
        <div className="flex flex-wrap gap-2 pt-1">
          {/* Status toggle */}
          {capa.status !== 'closed' && (
            <button
              onClick={() => void onUpdate(capa.id, { status: capa.status === 'open' ? 'in_progress' : 'closed' })}
              className="text-xs px-3 py-1 rounded-lg border"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
            >
              {capa.status === 'open' ? 'Marquer en cours' : 'Clôturer'}
            </button>
          )}

          {/* Evidence upload */}
          {!capa.evidenceAssetId && (
            <div>
              <CloudinaryUploader
                projectId={ncId}
                assetType="other"
                accept=".pdf,image/*"
                label="Joindre une preuve"
                maxFiles={1}
                onUploaded={(asset) => void onUpdate(capa.id, { evidenceAssetId: asset.id, status: 'closed' })}
              />
            </div>
          )}
          {capa.evidenceUrl && (
            <a href={capa.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: 'var(--admin-blue)' }}>
              Voir la preuve
            </a>
          )}

          {/* Verify effectiveness — ISO: must be different from detector */}
          {!capa.effectivenessVerified && capa.evidenceAssetId && isVerifier && (
            <button
              onClick={() => void onUpdate(capa.id, { effectivenessVerified: true })}
              className="text-xs px-3 py-1 rounded-lg text-white"
              style={{ background: 'var(--admin-emerald)' }}
            >
              ✓ Vérifier l&apos;efficacité
            </button>
          )}
          {!capa.effectivenessVerified && capa.evidenceAssetId && !isVerifier && (
            <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              La vérification doit être effectuée par un autre utilisateur (ISO 9001)
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Le motif et le résumé en clair des engagements déplacés. Lire un diff JSON est
 * précisément la friction qui laisse passer une échéance repoussée en silence.
 */
function AuditReason({ metadata }: { metadata: unknown }) {
  const meta = (metadata ?? {}) as Record<string, unknown>
  const reason = typeof meta.changeReason === 'string' ? meta.changeReason : null
  const critical = typeof meta.criticalChange === 'string' ? meta.criticalChange : null
  const revision = typeof meta.revisionNumber === 'number' ? meta.revisionNumber : null
  if (!reason && !critical) return null

  return (
    <div className="mt-1.5 pl-2 border-l-2 space-y-0.5" style={{ borderColor: 'var(--admin-amber)' }}>
      {critical && (
        <p className="text-[11px]" style={{ color: 'var(--admin-text)' }}>
          {critical}
        </p>
      )}
      {reason && (
        <p className="text-[11px] italic" style={{ color: 'var(--admin-text-muted)' }}>
          Motif : {reason}
          {revision != null ? ` (rév. ${revision})` : ''}
        </p>
      )}
    </div>
  )
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function InfoCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
      <p className="text-sm font-medium mt-0.5" style={{ color: highlight ? 'var(--admin-red)' : 'var(--admin-text)' }}>{value}</p>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

// ─── Edit-form controls ───────────────────────────────────────────────────────

const editInputClass = 'w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-50'
const editInputStyle = {
  borderColor: 'var(--admin-border)',
  background: 'var(--admin-bg)',
  color: 'var(--admin-text)',
}

function EditText({ label, value, onChange, placeholder, disabled }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; disabled?: boolean
}) {
  return (
    <FormField label={label}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={editInputClass}
        style={editInputStyle}
      />
    </FormField>
  )
}

function EditDate({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <FormField label={label}>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={editInputClass}
        style={editInputStyle}
      />
    </FormField>
  )
}

function EditSelect({ label, value, options, onChange }: {
  label: string; value: string; options: Record<string, string>; onChange: (v: string) => void
}) {
  return (
    <FormField label={label}>
      <Select
        value={value === '' ? '__none__' : value}
        onValueChange={(v) => onChange(v === '__none__' ? '' : v)}
      >
        <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
          <SelectValue placeholder="— Non défini —" />
        </SelectTrigger>
        <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
          <SelectItem value="__none__">— Non défini —</SelectItem>
          {Object.entries(options).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
        </SelectContent>
      </Select>
    </FormField>
  )
}

/** Previous -> new value per changed field, as ISO 9001 requires. */
function AuditDiff({ previous, next }: { previous: unknown; next: unknown }) {
  const prev = (previous ?? {}) as Record<string, unknown>
  const nxt  = (next ?? {}) as Record<string, unknown>
  const keys = Object.keys(nxt)
  if (keys.length === 0) return null

  const show = (v: unknown) => {
    if (v === null || v === undefined || v === '') return '—'
    if (typeof v === 'boolean') return v ? 'Oui' : 'Non'
    const str = String(v)
    return str.length > 60 ? str.slice(0, 60) + '…' : str
  }

  return (
    <ul className="mt-0.5 space-y-0.5">
      {keys.map((k) => (
        <li key={k} style={{ color: 'var(--admin-text-muted)' }}>
          {k} : <span className="line-through">{show(prev[k])}</span>
          {' → '}
          <span style={{ color: 'var(--admin-text)' }}>{show(nxt[k])}</span>
        </li>
      ))}
    </ul>
  )
}

function SectionRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-xs font-semibold uppercase tracking-wide shrink-0" style={{ color: 'var(--admin-text-muted)' }}>
        {label}
      </span>
      <span className="h-px flex-1" style={{ background: 'var(--admin-border)' }} />
    </div>
  )
}
