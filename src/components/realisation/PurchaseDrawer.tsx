'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type PlantItem = {
  id: string
  botanicalName: string
  commonName: string | null
  category: string
}

type Supplier = {
  id: string
  name: string
}

type UploadedAsset = {
  id: string
  secureUrl: string
  format: string | null
}

type Props = {
  projectId:   string
  plantItems:  PlantItem[]
  suppliers:   Supplier[]
  open:        boolean
  onClose:     () => void
  onCreated:   () => void
}

// ─── Form schema ──────────────────────────────────────────────────────────────

const schema = z.object({
  plantListItemId:       z.string().optional(),
  itemDescription:       z.string().min(1, 'La description est obligatoire'),
  quantityPurchased:     z.string().regex(/^\d+(\.\d+)?$/, 'Quantité invalide (ex: 12 ou 12.5)'),
  unitPricePaid:         z.string().regex(/^\d+(\.\d+)?$/, 'Prix invalide (ex: 45 ou 45.500)'),
  supplierId:            z.string().optional(),
  supplierInvoiceNumber: z.string().max(100).optional(),
  purchaseDate:          z.string().min(1, 'La date est obligatoire'),
  notes:                 z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ─── Component ────────────────────────────────────────────────────────────────

export function PurchaseDrawer({ projectId, plantItems, suppliers, open, onClose, onCreated }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [invoiceAsset, setInvoiceAsset] = useState<UploadedAsset | null>(null)
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      purchaseDate: new Date().toISOString().slice(0, 10),
    },
  })

  const qty = parseFloat(watch('quantityPurchased') || '0')
  const price = parseFloat(watch('unitPricePaid') || '0')
  const totalCalc = isNaN(qty) || isNaN(price) ? null : qty * price

  // When a plant list item is selected, auto-fill description
  const selectedPlantId = watch('plantListItemId')
  useEffect(() => {
    if (selectedPlantId) {
      const plant = plantItems.find((p) => p.id === selectedPlantId)
      if (plant) {
        setValue('itemDescription', plant.botanicalName + (plant.commonName ? ` (${plant.commonName})` : ''))
      }
    }
  }, [selectedPlantId, plantItems, setValue])

  function handleClose() {
    reset()
    setInvoiceAsset(null)
    setUploadState('idle')
    setUploadError('')
    setError('')
    onClose()
  }

  async function uploadInvoice(file: File) {
    setUploadState('uploading')
    setUploadError('')
    try {
      const sigRes = await fetch(`/api/upload?projectId=${encodeURIComponent(projectId)}`)
      if (!sigRes.ok) throw new Error('Impossible de signer le téléchargement')
      const { signature, timestamp, cloudName, apiKey, folder } = await sigRes.json() as {
        signature: string; timestamp: number; cloudName: string; apiKey: string; folder: string
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('signature', signature)
      formData.append('timestamp', String(timestamp))
      formData.append('api_key', apiKey)
      formData.append('folder', folder)

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        { method: 'POST', body: formData }
      )
      if (!uploadRes.ok) throw new Error('Échec du téléchargement Cloudinary')
      const result = await uploadRes.json() as {
        public_id: string; url: string; secure_url: string; format: string; bytes: number
      }

      const recordRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicId:  result.public_id,
          url:       result.url,
          secureUrl: result.secure_url,
          assetType: 'invoice',
          format:    result.format,
          bytes:     result.bytes,
          projectId,
        }),
      })
      if (!recordRes.ok) throw new Error('Échec de l\'enregistrement')
      const asset = await recordRes.json() as UploadedAsset

      setInvoiceAsset(asset)
      setUploadState('done')
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Erreur d\'upload')
      setUploadState('error')
    }
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/projects/${projectId}/purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          purchaseDate:  new Date(values.purchaseDate).toISOString(),
          invoiceAssetId: invoiceAsset?.id,
        }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Erreur serveur')
      }
      onCreated()
      handleClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 w-full max-w-lg flex flex-col shadow-xl overflow-y-auto"
        style={{ background: 'var(--admin-surface)', borderLeft: '1px solid var(--admin-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--admin-border)' }}
        >
          <h2 className="text-base font-semibold" style={{ color: 'var(--admin-text)' }}>
            Ajouter un achat
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-[var(--admin-border)]"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 px-6 py-5 space-y-5">
          {/* Plant list link (optional) */}
          {plantItems.length > 0 && (
            <Field label="Article de la liste végétale (optionnel)">
              <select
                {...register('plantListItemId')}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
              >
                <option value="">— Aucun lien / Article libre —</option>
                {plantItems.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.botanicalName}{p.commonName ? ` (${p.commonName})` : ''}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {/* Description */}
          <Field label="Description de l'article *" error={errors.itemDescription?.message}>
            <input
              {...register('itemDescription')}
              type="text"
              placeholder="ex: Phoenix dactylifera – palmier dattier"
              className={cn('w-full px-3 py-2 rounded-lg border text-sm', errors.itemDescription && 'border-[var(--admin-red)]')}
              style={{ borderColor: errors.itemDescription ? undefined : 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
            />
          </Field>

          {/* Quantity + price */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Quantité *" error={errors.quantityPurchased?.message}>
              <input
                {...register('quantityPurchased')}
                type="number"
                step="any"
                min="0"
                placeholder="0"
                className={cn('w-full px-3 py-2 rounded-lg border text-sm', errors.quantityPurchased && 'border-[var(--admin-red)]')}
                style={{ borderColor: errors.quantityPurchased ? undefined : 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
              />
            </Field>
            <Field label="Prix unitaire TND *" error={errors.unitPricePaid?.message}>
              <input
                {...register('unitPricePaid')}
                type="number"
                step="any"
                min="0"
                placeholder="0.000"
                className={cn('w-full px-3 py-2 rounded-lg border text-sm', errors.unitPricePaid && 'border-[var(--admin-red)]')}
                style={{ borderColor: errors.unitPricePaid ? undefined : 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
              />
            </Field>
          </div>

          {/* Live total */}
          {totalCalc !== null && !isNaN(totalCalc) && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--admin-emerald-dim)' }}>
              <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Total calculé :</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--admin-emerald)' }}>
                {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(totalCalc)} TND
              </span>
            </div>
          )}

          {/* Supplier */}
          <Field label="Fournisseur">
            <select
              {...register('supplierId')}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
            >
              <option value="">— Sélectionner un fournisseur —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>

          {/* Invoice number */}
          <Field label="N° de facture fournisseur">
            <input
              {...register('supplierInvoiceNumber')}
              type="text"
              placeholder="ex: FAC-2026-001"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
            />
          </Field>

          {/* Invoice PDF upload */}
          <Field label="Facture (PDF)">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void uploadInvoice(file)
              }}
            />
            {invoiceAsset ? (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--admin-emerald)', background: 'var(--admin-emerald-dim)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--admin-emerald)' }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-sm flex-1 truncate" style={{ color: 'var(--admin-emerald)' }}>
                  Facture téléchargée (PDF)
                </span>
                <button
                  type="button"
                  onClick={() => { setInvoiceAsset(null); setUploadState('idle') }}
                  className="text-xs underline"
                  style={{ color: 'var(--admin-text-muted)' }}
                >
                  Supprimer
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadState === 'uploading'}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed text-sm transition-colors hover:border-[var(--admin-emerald)]"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
              >
                {uploadState === 'uploading' ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 rounded-full" style={{ borderColor: 'var(--admin-text-muted)', borderTopColor: 'transparent' }} />
                    Téléchargement…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Joindre la facture PDF
                  </>
                )}
              </button>
            )}
            {uploadError && <p className="text-xs mt-1" style={{ color: 'var(--admin-red)' }}>{uploadError}</p>}
          </Field>

          {/* Date */}
          <Field label="Date d'achat *" error={errors.purchaseDate?.message}>
            <input
              {...register('purchaseDate')}
              type="date"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
            />
          </Field>

          {/* Notes */}
          <Field label="Notes">
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Informations complémentaires..."
              className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
            />
          </Field>

          {error && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60"
              style={{ background: 'var(--admin-emerald)' }}
            >
              {submitting ? 'Enregistrement…' : 'Enregistrer l\'achat'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>
        {label}
      </label>
      {children}
      {error && <p className="text-xs" style={{ color: 'var(--admin-red)' }}>{error}</p>}
    </div>
  )
}
