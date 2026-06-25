'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { RseCommunicationBadge } from '../RsePartnershipsBadge'
import type { RseCommunication } from '@/lib/db/rse'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const COMM_TYPE_LABELS: Record<string, string> = {
  logo_sopat: 'Logo SOPAT',
  logo_partenaire: 'Logo partenaire',
  publication_commune: 'Publication commune',
}

function fmt(date: Date | string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function daysUntil(date: Date | string | null): number | null {
  if (!date) return null
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

const submitSchema = z.object({
  communicationType: z.enum(['logo_sopat', 'logo_partenaire', 'publication_commune'] as const),
  description: z.string().min(1, 'Description requise'),
  requiredByDate: z.string().optional(),
  notes: z.string().optional(),
})

type SubmitValues = z.infer<typeof submitSchema>

const inputClass = 'w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green/20 transition'
const inputStyle = { background: 'var(--admin-surface)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }

export function CommunicationTab({
  partnershipId,
  communications,
  isAdminOrDirection,
  currentUserId,
  sopatReferentId,
}: {
  partnershipId: string
  communications: RseCommunication[]
  isAdminOrDirection: boolean
  currentUserId: string
  sopatReferentId: string
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [uploadingAsset, setUploadingAsset] = useState(false)
  const [assetFile, setAssetFile] = useState<File | null>(null)
  const [validating, setValidating] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<SubmitValues>({ resolver: zodResolver(submitSchema) })

  async function onSubmit(values: SubmitValues) {
    let assetId: string | undefined

    if (assetFile) {
      setUploadingAsset(true)
      try {
        const signRes = await fetch(`/api/upload/rse-sign?partnershipId=${partnershipId}&assetType=rse_communication`)
        if (!signRes.ok) throw new Error('Signature échouée')
        const { signature, timestamp, cloudName, apiKey, folder } = await signRes.json()

        const formData = new FormData()
        formData.append('file', assetFile)
        formData.append('api_key', apiKey)
        formData.append('timestamp', timestamp)
        formData.append('signature', signature)
        formData.append('folder', folder)

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
          method: 'POST',
          body: formData,
        })
        if (!uploadRes.ok) throw new Error('Téléversement échoué')
        const uploadData = await uploadRes.json()

        const recordRes = await fetch('/api/upload/rse-sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicId: uploadData.public_id,
            url: uploadData.url,
            secureUrl: uploadData.secure_url,
            assetType: 'rse_communication',
            format: uploadData.format,
            bytes: uploadData.bytes,
            partnershipId,
          }),
        })
        if (!recordRes.ok) throw new Error('Enregistrement échoué')
        const asset = await recordRes.json()
        assetId = asset.id
      } catch (err) {
        setError('root', { message: err instanceof Error ? err.message : 'Erreur téléversement' })
        setUploadingAsset(false)
        return
      }
      setUploadingAsset(false)
    }

    const body: Record<string, unknown> = { ...values }
    if (values.requiredByDate) body.requiredByDate = new Date(values.requiredByDate).toISOString()
    if (assetId) body.assetCloudinaryId = assetId

    const res = await fetch(`/api/rse/partnerships/${partnershipId}/communications`, {
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
    setAssetFile(null)
    setShowForm(false)
    router.refresh()
  }

  async function handleValidation(communicationId: string, action: 'approve' | 'refuse') {
    setValidating(communicationId)
    await fetch(`/api/rse/partnerships/${partnershipId}/communications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, communicationId }),
    })
    setValidating(null)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {/* Warning banner */}
      <div
        className="rounded-xl border px-4 py-3 text-sm flex items-center gap-2"
        style={{ borderColor: 'var(--admin-amber)', background: 'var(--admin-amber-dim)', color: 'var(--admin-amber)' }}
      >
        ⚠ Validation requise 5 jours ouvrables avant toute diffusion
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          {communications.length} demande{communications.length !== 1 ? 's' : ''} de communication
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
        >
          + Soumettre une demande
        </button>
      </div>

      {/* Submit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-xl border p-5 space-y-4"
          style={{ borderColor: 'var(--admin-emerald)', background: 'var(--admin-surface)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Nouvelle demande de communication</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Type <span className="text-red-500">*</span></label>
              <Select
                value={watch('communicationType') ? (watch('communicationType') as string) : '__none__'}
                onValueChange={(v) => setValue('communicationType', (v === '__none__' ? undefined : v) as SubmitValues['communicationType'])}
              >
                <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectItem value="__none__">Sélectionner...</SelectItem>
                  <SelectItem value="logo_sopat">Logo SOPAT</SelectItem>
                  <SelectItem value="logo_partenaire">Logo partenaire</SelectItem>
                  <SelectItem value="publication_commune">Publication commune</SelectItem>
                </SelectContent>
              </Select>
              {errors.communicationType && <p className="text-xs text-red-500">{errors.communicationType.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Date requise avant</label>
              <input {...register('requiredByDate')} type="date" className={inputClass} style={inputStyle} />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Description <span className="text-red-500">*</span></label>
              <textarea {...register('description')} rows={2} className={inputClass} style={inputStyle} placeholder="Décrivez l'usage prévu..." />
              {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Fichier (optionnel)</label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setAssetFile(e.target.files?.[0] ?? null)}
                className="text-sm"
                style={{ color: 'var(--admin-text-muted)' }}
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Notes</label>
              <input {...register('notes')} className={inputClass} style={inputStyle} />
            </div>
          </div>

          {errors.root && <p className="text-xs text-red-500">{errors.root.message}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting || uploadingAsset}
              className="px-3 py-2 text-sm font-medium rounded-lg disabled:opacity-50"
              style={{ background: 'var(--admin-emerald)', color: '#fff' }}
            >
              {isSubmitting || uploadingAsset ? 'Envoi...' : 'Soumettre'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Communication list */}
      {communications.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--admin-text-muted)' }}>
          Aucune demande de communication enregistrée.
        </p>
      ) : (
        <div className="space-y-4">
          {communications.map((comm) => {
            const days = daysUntil(comm.requiredByDate)
            const urgent = days !== null && days <= 5 && comm.validationStatus === 'en_attente'

            return (
              <div
                key={comm.id}
                className="rounded-xl border p-4 space-y-3"
                style={{
                  borderColor: urgent ? 'var(--admin-amber)' : 'var(--admin-border)',
                  background: urgent ? 'var(--admin-amber-dim)' : 'var(--admin-surface)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                        {COMM_TYPE_LABELS[comm.communicationType] ?? comm.communicationType}
                      </span>
                      <RseCommunicationBadge status={comm.validationStatus} />
                      {urgent && (
                        <span className="text-xs font-medium" style={{ color: 'var(--admin-amber)' }}>
                          ⚠ Requis dans {days} jour{days !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>{comm.description}</p>
                    <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      <span>Soumis par {comm.submittedByName ?? '—'} le {fmt(comm.submittedAt)}</span>
                      {comm.requiredByDate && <span>Requis avant : {fmt(comm.requiredByDate)}</span>}
                      {comm.validatedAt && <span>Validé le {fmt(comm.validatedAt)} par {comm.validatedByName}</span>}
                    </div>
                    {comm.notes && (
                      <p className="text-xs italic" style={{ color: 'var(--admin-text-muted)' }}>{comm.notes}</p>
                    )}
                  </div>

                  {comm.assetUrl && (
                    <a
                      href={comm.assetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium shrink-0"
                      style={{ color: 'var(--admin-emerald)' }}
                    >
                      📎 Fichier
                    </a>
                  )}
                </div>

                {/* Status timeline */}
                <div className="flex items-center gap-2 text-xs">
                  <TimelineStep label="Soumis" done={true} date={comm.submittedAt} />
                  <div className="flex-1 h-px" style={{ background: 'var(--admin-border)' }} />
                  <TimelineStep
                    label={comm.validationStatus === 'refuse' ? 'Refusé' : 'Validé'}
                    done={comm.validationStatus !== 'en_attente'}
                    failed={comm.validationStatus === 'refuse'}
                    date={comm.validatedAt}
                  />
                </div>

                {/* Validation actions (admin/direction only, pending only) */}
                {isAdminOrDirection && comm.validationStatus === 'en_attente' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleValidation(comm.id, 'approve')}
                      disabled={validating === comm.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50"
                      style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}
                    >
                      ✓ Approuver
                    </button>
                    <button
                      onClick={() => handleValidation(comm.id, 'refuse')}
                      disabled={validating === comm.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50"
                      style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}
                    >
                      ✗ Refuser
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TimelineStep({
  label,
  done,
  failed,
  date,
}: {
  label: string
  done: boolean
  failed?: boolean
  date: Date | string | null
}) {
  const color = !done
    ? 'var(--admin-text-dim)'
    : failed
    ? 'var(--admin-red)'
    : 'var(--admin-emerald)'

  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <div
        className="w-4 h-4 rounded-full flex items-center justify-center text-xs"
        style={{ background: done ? color : 'var(--admin-border)', color: done ? '#fff' : 'var(--admin-text-dim)' }}
      >
        {done ? (failed ? '✗' : '✓') : '○'}
      </div>
      <span style={{ color }}>{label}</span>
      {date && <span style={{ color: 'var(--admin-text-dim)' }}>{fmt(date)}</span>}
    </div>
  )
}
