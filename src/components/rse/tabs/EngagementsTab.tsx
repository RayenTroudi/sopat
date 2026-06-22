'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { RseCommitmentBadge } from '../RsePartnershipsBadge'
import type { RseCommitment } from '@/lib/db/rse'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const FREQUENCY_LABELS: Record<string, string> = {
  unique: 'Unique',
  annuel: 'Annuel',
  semestriel: 'Semestriel',
  trimestriel: 'Trimestriel',
  mensuel: 'Mensuel',
}

const RESPONSIBLE_LABELS: Record<string, string> = {
  sopat: 'SOPAT',
  partenaire: 'Partenaire',
  conjoint: 'Conjoint',
}

const COMMITMENT_TYPE_LABELS: Record<string, string> = {
  action_annuelle: 'Action annuelle',
  sensibilisation: 'Sensibilisation',
  communication: 'Communication',
  projet_paysager: 'Projet paysager',
  autre: 'Autre',
}

function fmt(date: Date | string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const addSchema = z.object({
  articleNumber: z.string().optional(),
  commitmentDescription: z.string().min(1, 'Description requise'),
  commitmentType: z.enum(['action_annuelle', 'sensibilisation', 'communication', 'projet_paysager', 'autre'] as const).optional(),
  frequency: z.enum(['unique', 'annuel', 'semestriel', 'trimestriel', 'mensuel'] as const).optional(),
  responsibleParty: z.enum(['sopat', 'partenaire', 'conjoint'] as const).optional(),
  nextDueDate: z.string().optional(),
  notes: z.string().optional(),
})

type AddValues = z.infer<typeof addSchema>

const inputClass = 'w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green/20 transition'
const inputStyle = { background: 'var(--admin-surface)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }

export function EngagementsTab({
  partnershipId,
  commitments,
  isAdminOrDirection,
  currentUserId,
  currentUserName,
}: {
  partnershipId: string
  commitments: RseCommitment[]
  isAdminOrDirection: boolean
  currentUserId: string
  currentUserName: string
}) {
  const router = useRouter()
  const [showAddForm, setShowAddForm] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)

  const overdueCommitments = commitments.filter((c) => c.status === 'en_retard' || (c.nextDueDate && new Date(c.nextDueDate) < new Date()))
  const upcomingCommitments = commitments.filter((c) => !overdueCommitments.includes(c))

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<AddValues>({ resolver: zodResolver(addSchema) })

  async function onAddCommitment(values: AddValues) {
    const body: Record<string, unknown> = { ...values }
    if (values.nextDueDate) body.nextDueDate = new Date(values.nextDueDate).toISOString()

    const res = await fetch(`/api/rse/partnerships/${partnershipId}/commitments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json()
      setError('root', { message: data.error ?? 'Erreur serveur' })
      return
    }

    reset()
    setShowAddForm(false)
    router.refresh()
  }

  async function handleComplete(commitmentId: string) {
    setCompleting(commitmentId)
    await fetch(`/api/rse/partnerships/${partnershipId}/commitments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', commitmentId }),
    })
    setCompleting(null)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          {commitments.length} engagement{commitments.length !== 1 ? 's' : ''} enregistré{commitments.length !== 1 ? 's' : ''}
        </p>
        {isAdminOrDirection && (
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
          >
            + Ajouter un engagement
          </button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit(onAddCommitment)}
          className="rounded-xl border p-5 space-y-4"
          style={{ borderColor: 'var(--admin-emerald)', background: 'var(--admin-surface)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Nouvel engagement</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Article</label>
              <input {...register('articleNumber')} placeholder="Art. 3.1" className={inputClass} style={inputStyle} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Type</label>
              <Select value={watch('commitmentType') ?? 'autre'} onValueChange={(v) => setValue('commitmentType', v as AddValues['commitmentType'])}>
                <SelectTrigger className="bg-white" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectItem value="autre">Autre</SelectItem>
                  <SelectItem value="action_annuelle">Action annuelle</SelectItem>
                  <SelectItem value="sensibilisation">Sensibilisation</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="projet_paysager">Projet paysager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Description <span className="text-red-500">*</span></label>
              <textarea {...register('commitmentDescription')} rows={2} className={inputClass} style={inputStyle} />
              {errors.commitmentDescription && <p className="text-xs text-red-500">{errors.commitmentDescription.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Fréquence</label>
              <Select value={watch('frequency') ?? 'annuel'} onValueChange={(v) => setValue('frequency', v as AddValues['frequency'])}>
                <SelectTrigger className="bg-white" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectItem value="annuel">Annuel</SelectItem>
                  <SelectItem value="unique">Unique</SelectItem>
                  <SelectItem value="semestriel">Semestriel</SelectItem>
                  <SelectItem value="trimestriel">Trimestriel</SelectItem>
                  <SelectItem value="mensuel">Mensuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Responsable</label>
              <Select value={watch('responsibleParty') ?? 'sopat'} onValueChange={(v) => setValue('responsibleParty', v as AddValues['responsibleParty'])}>
                <SelectTrigger className="bg-white" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectItem value="sopat">SOPAT</SelectItem>
                  <SelectItem value="partenaire">Partenaire</SelectItem>
                  <SelectItem value="conjoint">Conjoint</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Prochaine échéance</label>
              <input {...register('nextDueDate')} type="date" className={inputClass} style={inputStyle} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Notes</label>
              <input {...register('notes')} className={inputClass} style={inputStyle} />
            </div>
          </div>
          {errors.root && <p className="text-xs text-red-500">{errors.root.message}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting} className="px-3 py-2 text-sm font-medium rounded-lg disabled:opacity-50" style={{ background: 'var(--admin-emerald)', color: '#fff' }}>
              {isSubmitting ? 'Ajout...' : 'Ajouter'}
            </button>
            <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-2 text-sm rounded-lg border" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Overdue first */}
      {overdueCommitments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-red)' }}>
            ⚠ En retard ({overdueCommitments.length})
          </h3>
          {overdueCommitments.map((c) => (
            <CommitmentRow
              key={c.id}
              commitment={c}
              isAdminOrDirection={isAdminOrDirection}
              completing={completing === c.id}
              onComplete={() => handleComplete(c.id)}
            />
          ))}
        </div>
      )}

      {/* Upcoming */}
      {upcomingCommitments.length > 0 && (
        <div className="space-y-3">
          {overdueCommitments.length > 0 && (
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
              À venir / Respectés ({upcomingCommitments.length})
            </h3>
          )}
          {upcomingCommitments.map((c) => (
            <CommitmentRow
              key={c.id}
              commitment={c}
              isAdminOrDirection={isAdminOrDirection}
              completing={completing === c.id}
              onComplete={() => handleComplete(c.id)}
            />
          ))}
        </div>
      )}

      {commitments.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: 'var(--admin-text-muted)' }}>
          Aucun engagement enregistré. Ajoutez les articles de la convention.
        </p>
      )}
    </div>
  )
}

function CommitmentRow({
  commitment: c,
  isAdminOrDirection,
  completing,
  onComplete,
}: {
  commitment: RseCommitment
  isAdminOrDirection: boolean
  completing: boolean
  onComplete: () => void
}) {
  const isOverdue = c.status === 'en_retard' || (c.nextDueDate && new Date(c.nextDueDate) < new Date())

  return (
    <div
      className="rounded-xl border p-4 flex items-start justify-between gap-4"
      style={{
        borderColor: isOverdue ? 'var(--admin-red)' : 'var(--admin-border)',
        background: isOverdue ? 'var(--admin-red-dim)' : 'var(--admin-surface)',
      }}
    >
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {c.articleNumber && (
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--admin-text-muted)' }}>
              {c.articleNumber}
            </span>
          )}
          <RseCommitmentBadge status={isOverdue ? 'en_retard' : c.status} />
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-muted)' }}>
            {FREQUENCY_LABELS[c.frequency] ?? c.frequency}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-muted)' }}>
            {RESPONSIBLE_LABELS[c.responsibleParty] ?? c.responsibleParty}
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{c.commitmentDescription}</p>
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {c.lastCompletedDate && <span>Dernière réalisation : {fmt(c.lastCompletedDate)}</span>}
          {c.nextDueDate && (
            <span style={{ color: isOverdue ? 'var(--admin-red)' : 'inherit' }}>
              Prochaine : {fmt(c.nextDueDate)}
            </span>
          )}
        </div>
        {c.notes && <p className="text-xs italic" style={{ color: 'var(--admin-text-muted)' }}>{c.notes}</p>}
      </div>

      {isAdminOrDirection && (
        <button
          onClick={onComplete}
          disabled={completing}
          className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 transition-opacity"
          style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}
        >
          {completing ? '...' : '✓ Marquer complété'}
        </button>
      )}
    </div>
  )
}
