'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ─── Types ────────────────────────────────────────────────────────────────────

type EquipmentType = {
  id:            string
  name:          string
  displayNameFr: string
  iconName:      string | null
}

type PlantItem = {
  id:           string
  botanicalName: string
  commonName:   string | null
  category:     string
}

type UploadedAsset = {
  id:        string
  secureUrl: string
  format:    string | null
}

type Props = {
  projectId:  string
  plantItems: PlantItem[]
  open:       boolean
  onClose:    () => void
  onCreated:  () => void
}

const CURRENCIES = ['TND', 'EUR', 'OMR', 'XOF', 'QAR', 'LYD', 'USD'] as const

const ICON_MAP: Record<string, string> = {
  grue:              '🏗',
  jcb_telescopique:  '🚜',
  tracteur:          '🚛',
  camion_plateau:    '🚚',
  nacelle:           '🦺',
  mini_pelle:        '⛏',
  compresseur:       '💨',
  autre:             '🔧',
}

function getIcon(iconName: string | null, typeName: string): string {
  if (iconName && ICON_MAP[iconName]) return ICON_MAP[iconName]
  return ICON_MAP[typeName] ?? '🔧'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EquipmentDrawer({ projectId, plantItems, open, onClose, onCreated }: Props) {
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [invoiceAsset, setInvoiceAsset] = useState<UploadedAsset | null>(null)
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [equipmentTypeId, setEquipmentTypeId]         = useState('')
  const [equipmentDescription, setEquipmentDescription] = useState('')
  const [rentalCompany, setRentalCompany]             = useState('')
  const [rentalCompanyContact, setRentalCompanyContact] = useState('')
  const [startDate, setStartDate]                     = useState('')
  const [endDate, setEndDate]                         = useState('')
  const [rentalDays, setRentalDays]                   = useState('')
  const [dailyRate, setDailyRate]                     = useState('')
  const [currency, setCurrency]                       = useState<typeof CURRENCIES[number]>('TND')
  const [invoiceNumber, setInvoiceNumber]             = useState('')
  const [operatorName, setOperatorName]               = useState('')
  const [purposeDescription, setPurposeDescription]   = useState('')
  const [selectedPlantIds, setSelectedPlantIds]       = useState<Set<string>>(new Set())

  const days = parseInt(rentalDays, 10)
  const rate = parseFloat(dailyRate)
  const totalCalc = !isNaN(days) && !isNaN(rate) && days > 0 && rate >= 0 ? days * rate : null

  useEffect(() => {
    if (!open) return
    fetch('/api/equipment-types')
      .then((r) => r.json())
      .then((data) => setEquipmentTypes(data as EquipmentType[]))
      .catch(() => { /* ignore */ })
  }, [open])

  function resetForm() {
    setEquipmentTypeId('')
    setEquipmentDescription('')
    setRentalCompany('')
    setRentalCompanyContact('')
    setStartDate('')
    setEndDate('')
    setRentalDays('')
    setDailyRate('')
    setCurrency('TND')
    setInvoiceNumber('')
    setOperatorName('')
    setPurposeDescription('')
    setSelectedPlantIds(new Set())
    setInvoiceAsset(null)
    setUploadState('idle')
    setUploadError('')
    setError('')
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  function togglePlant(id: string) {
    setSelectedPlantIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleInvoiceUpload(file: File) {
    setUploadState('uploading')
    setUploadError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      formData.append('assetType', 'invoice')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) { setUploadState('error'); setUploadError('Échec du téléchargement'); return }
      const asset = await res.json() as UploadedAsset
      setInvoiceAsset(asset)
      setUploadState('done')
    } catch {
      setUploadState('error')
      setUploadError('Erreur réseau')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!equipmentTypeId) { setError("Le type d'engin est obligatoire"); return }
    if (!startDate || !endDate) { setError('Les dates de location sont obligatoires'); return }
    if (!rentalDays || isNaN(parseInt(rentalDays, 10)) || parseInt(rentalDays, 10) <= 0) {
      setError('Le nombre de jours doit être supérieur à 0')
      return
    }
    if (!dailyRate || isNaN(parseFloat(dailyRate)) || parseFloat(dailyRate) < 0) {
      setError('Le tarif journalier est invalide')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/equipment-rentals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentTypeId,
          equipmentDescription:  equipmentDescription || undefined,
          rentalCompany:         rentalCompany || undefined,
          rentalCompanyContact:  rentalCompanyContact || undefined,
          startDate,
          endDate,
          rentalDays:            parseInt(rentalDays, 10),
          dailyRate,
          totalCost:             totalCalc !== null ? totalCalc.toFixed(3) : (parseFloat(dailyRate) * parseInt(rentalDays, 10)).toFixed(3),
          currency,
          invoiceNumber:         invoiceNumber || undefined,
          invoiceAssetId:        invoiceAsset?.id || undefined,
          operatorName:          operatorName || undefined,
          purposeDescription:    purposeDescription || undefined,
          linkedPlantItemIds:    Array.from(selectedPlantIds),
        }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Erreur serveur'); return }
      resetForm()
      onCreated()
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
        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto"
        style={{ background: 'var(--admin-surface)', borderLeft: '1px solid var(--admin-border)' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between px-5 py-4 border-b z-10"
          style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Ajouter un engin / matériel
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded hover:bg-[var(--admin-bg)]"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-5">
          {/* Equipment type */}
          <Field label="Type d'engin *">
            <Select
              value={equipmentTypeId === '' ? '__none__' : equipmentTypeId}
              onValueChange={(v) => setEquipmentTypeId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                <SelectValue placeholder="— Sélectionner —" />
              </SelectTrigger>
              <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                <SelectItem value="__none__">— Sélectionner —</SelectItem>
                {equipmentTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{getIcon(t.iconName, t.name)} {t.displayNameFr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Description */}
          <Field label="Description (modèle / taille)">
            <input
              type="text"
              value={equipmentDescription}
              onChange={(e) => setEquipmentDescription(e.target.value)}
              placeholder="ex. Grue 50T Liebherr, JCB 535-140"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
            />
          </Field>

          {/* Rental company */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Société de location">
              <input
                type="text"
                value={rentalCompany}
                onChange={(e) => setRentalCompany(e.target.value)}
                placeholder="Nom de la société"
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
              />
            </Field>
            <Field label="Contact">
              <input
                type="text"
                value={rentalCompanyContact}
                onChange={(e) => setRentalCompanyContact(e.target.value)}
                placeholder="Téléphone / email"
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
              />
            </Field>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date de début *">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
              />
            </Field>
            <Field label="Date de fin *">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
              />
            </Field>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Jours facturés *">
              <input
                type="number"
                min="1"
                value={rentalDays}
                onChange={(e) => setRentalDays(e.target.value)}
                placeholder="ex. 3"
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
              />
            </Field>
            <Field label="Tarif / jour *">
              <input
                type="number"
                min="0"
                step="0.001"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
                placeholder="0.000"
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
              />
            </Field>
            <Field label="Devise">
              <Select value={currency} onValueChange={(v) => setCurrency(v as typeof CURRENCIES[number])}>
                <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Total preview */}
          {totalCalc !== null && (
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-lg"
              style={{ background: 'var(--admin-emerald-dim)', border: '1px solid var(--admin-emerald)' }}
            >
              <span className="text-xs font-medium" style={{ color: 'var(--admin-emerald)' }}>
                Coût total calculé
              </span>
              <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-emerald)' }}>
                {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 3 }).format(totalCalc)} {currency}
              </span>
            </div>
          )}

          {/* Invoice */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="N° de facture">
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="ex. FAC-2026-0042"
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
              />
            </Field>
            <Field label="Facture PDF">
              {uploadState === 'done' && invoiceAsset ? (
                <div className="flex items-center gap-2">
                  <a
                    href={invoiceAsset.secureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline truncate"
                    style={{ color: 'var(--admin-blue)' }}
                  >
                    Facture téléchargée
                  </a>
                  <button
                    type="button"
                    onClick={() => { setInvoiceAsset(null); setUploadState('idle') }}
                    className="text-xs"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >✕</button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadState === 'uploading'}
                    className="w-full px-3 py-2 rounded-lg border text-xs text-left disabled:opacity-50"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text-muted)' }}
                  >
                    {uploadState === 'uploading' ? 'Téléchargement…' : 'Choisir un fichier PDF'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleInvoiceUpload(file)
                    }}
                  />
                  {uploadError && <p className="text-xs mt-1" style={{ color: 'var(--admin-red)' }}>{uploadError}</p>}
                </>
              )}
            </Field>
          </div>

          {/* Operator + purpose */}
          <Field label="Nom du chauffeur / opérateur">
            <input
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="Prénom Nom"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
            />
          </Field>

          <Field label="Objet / raison d'utilisation">
            <textarea
              value={purposeDescription}
              onChange={(e) => setPurposeDescription(e.target.value)}
              rows={2}
              placeholder="ex. Plantation Phoenix dactylifera 6m TH, zone piscine"
              className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
            />
          </Field>

          {/* Plant multi-select */}
          {plantItems.length > 0 && (
            <Field label="Végétaux concernés (sélection multiple)">
              <div
                className="rounded-lg border overflow-hidden"
                style={{ borderColor: 'var(--admin-border)' }}
              >
                <div
                  className="max-h-48 overflow-y-auto divide-y"
                  style={{ borderColor: 'var(--admin-border)' }}
                >
                  {plantItems.map((item) => (
                    <label
                      key={item.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors',
                        selectedPlantIds.has(item.id) ? 'bg-[var(--admin-emerald-dim)]' : 'hover:bg-[var(--admin-bg)]'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlantIds.has(item.id)}
                        onChange={() => togglePlant(item.id)}
                        className="rounded"
                        style={{ accentColor: 'var(--admin-emerald)' }}
                      />
                      <span className="text-xs" style={{ color: 'var(--admin-text)' }}>
                        <span className="font-medium italic">{item.botanicalName}</span>
                        {item.commonName && (
                          <span style={{ color: 'var(--admin-text-muted)' }}> · {item.commonName}</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
                {selectedPlantIds.size > 0 && (
                  <div
                    className="px-3 py-2 border-t flex flex-wrap gap-1.5"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}
                  >
                    {Array.from(selectedPlantIds).map((id) => {
                      const item = plantItems.find((p) => p.id === id)
                      if (!item) return null
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                          style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}
                        >
                          {item.botanicalName}
                          <button
                            type="button"
                            onClick={() => togglePlant(id)}
                            className="leading-none"
                          >✕</button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </Field>
          )}

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
              className="flex-1 px-4 py-2.5 rounded-lg text-sm border"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--admin-emerald)' }}
            >
              {submitting ? 'Enregistrement…' : 'Enregistrer la location'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
