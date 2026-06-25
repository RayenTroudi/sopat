'use client'

import { useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import type { WizardFormValues } from '../NewProjectForm'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const inputClass = 'w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green/20 transition'
const inputStyle = { background: 'var(--admin-surface)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
        {label}{required && <span className="text-[#2F6F4F] ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-[#2F6F4F]">{error}</p>}
    </div>
  )
}

const PROJECT_TYPE_OPTIONS = [
  { value: 'ingenierie_territoriale', label: 'Ingénierie territoriale', icon: '🗺️' },
  { value: 'espace_public', label: 'Espace public', icon: '🌳' },
  { value: 'siege_social', label: 'Siège social', icon: '🏢' },
  { value: 'hotelier_touristique', label: 'Hôtelier & touristique', icon: '🏨' },
  { value: 'residentiel', label: 'Résidentiel', icon: '🏡' },
  { value: 'interieur', label: 'Intérieur', icon: '🪴' },
]

const SECTOR_OPTIONS = [
  { value: 'banque', label: 'Banque' },
  { value: 'hotellerie', label: 'Hôtellerie' },
  { value: 'automobile', label: 'Automobile' },
  { value: 'institutionnel_public', label: 'Institutionnel public' },
  { value: 'institutionnel_prive', label: 'Institutionnel privé' },
  { value: 'residentiel_prive', label: 'Résidentiel privé' },
  { value: 'diplomatique', label: 'Diplomatique' },
  { value: 'autre', label: 'Autre' },
]

const CURRENCY_OPTIONS = [
  { value: 'TND', label: 'TND — Dinar tunisien' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'OMR', label: 'OMR — Rial omanais' },
  { value: 'XOF', label: 'XOF — Franc CFA' },
  { value: 'QAR', label: 'QAR — Riyal qatari' },
  { value: 'LYD', label: 'LYD — Dinar libyen' },
  { value: 'USD', label: 'USD — Dollar américain' },
]

const TYPE_LABELS: Record<string, string> = {
  banque: 'Banque', hotellerie: 'Hôtellerie', automobile: 'Automobile',
  institutionnel_public: 'Institutionnel public', institutionnel_prive: 'Institutionnel privé',
  residentiel_prive: 'Résidentiel privé', diplomatique: 'Diplomatique', autre: 'Autre',
}

type ClientOption = { id: string; displayName: string; clientType: string; country: string }

export function Step1Basic({
  form,
  clientOptions = [],
}: {
  form: UseFormReturn<WizardFormValues>
  clientOptions?: ClientOption[]
}) {
  const { register, setValue, watch, formState: { errors } } = form
  const [clientSearch, setClientSearch] = useState('')
  const [showFreeText, setShowFreeText] = useState(clientOptions.length === 0)
  const selectedClientId = watch('clientId')

  const filtered = clientOptions.filter((c) =>
    c.displayName.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (TYPE_LABELS[c.clientType] ?? c.clientType).toLowerCase().includes(clientSearch.toLowerCase())
  )

  const selectedClient = clientOptions.find((c) => c.id === selectedClientId)

  function selectClient(c: ClientOption | null) {
    if (c) {
      setValue('clientId', c.id)
      setValue('clientName', c.displayName)
      setClientSearch(c.displayName)
    } else {
      setValue('clientId', undefined)
      setClientSearch('')
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Field label="Nom du projet" error={errors.name?.message} required>
            <input {...register('name')} className={inputClass} style={inputStyle} placeholder="Villa Méditerranée — La Marsa" />
          </Field>
        </div>

        <Field label="Type de projet" error={errors.projectType?.message} required>
          <Select
            value={watch('projectType') ? (watch('projectType') as string) : '__none__'}
            onValueChange={(v) => setValue('projectType', (v === '__none__' ? undefined : v) as WizardFormValues['projectType'])}
          >
            <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
              <SelectValue placeholder="— Sélectionner —" />
            </SelectTrigger>
            <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
              <SelectItem value="__none__">— Sélectionner —</SelectItem>
              {PROJECT_TYPE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Pays" error={errors.country?.message} required>
          <input {...register('country')} className={inputClass} style={inputStyle} placeholder="TN" maxLength={2} />
        </Field>

        <Field label="Devise" error={errors.currency?.message}>
          <Select
            value={watch('currency') ?? 'TND'}
            onValueChange={(v) => setValue('currency', v as WizardFormValues['currency'])}
          >
            <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
              {CURRENCY_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Secteur client" error={errors.clientSector?.message}>
          <Select
            value={watch('clientSector') ? (watch('clientSector') as string) : '__none__'}
            onValueChange={(v) => setValue('clientSector', (v === '__none__' ? undefined : v) as WizardFormValues['clientSector'])}
          >
            <SelectTrigger className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
              <SelectValue placeholder="— Sélectionner —" />
            </SelectTrigger>
            <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
              <SelectItem value="__none__">— Sélectionner —</SelectItem>
              {SECTOR_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* CRM client selector */}
        <div className="sm:col-span-2 space-y-2">
          <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
            Client <span className="text-[#2F6F4F]">*</span>
          </label>

          {clientOptions.length > 0 && !showFreeText && (
            <div className="space-y-2">
              <input
                value={selectedClient ? selectedClient.displayName : clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value)
                  if (selectedClientId) selectClient(null)
                }}
                placeholder="Rechercher un client CRM…"
                className={inputClass}
                style={inputStyle}
              />

              {clientSearch && !selectedClientId && filtered.length > 0 && (
                <div
                  className="rounded-lg border divide-y text-sm max-h-48 overflow-y-auto"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
                >
                  {filtered.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectClient(c)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--admin-bg)] transition-colors text-left"
                    >
                      <span style={{ color: 'var(--admin-text)' }}>{c.displayName}</span>
                      <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        {TYPE_LABELS[c.clientType] ?? c.clientType} · {c.country}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {selectedClient && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}
                >
                  <span>✓ {selectedClient.displayName}</span>
                  <button
                    type="button"
                    onClick={() => selectClient(null)}
                    className="ml-auto text-xs opacity-70 hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                <button
                  type="button"
                  onClick={() => setShowFreeText(true)}
                  className="hover:underline"
                >
                  Ou saisir un nom libre
                </button>
                <a
                  href="/admin/clients/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  Créer un nouveau client →
                </a>
              </div>
            </div>
          )}

          {(showFreeText || clientOptions.length === 0) && (
            <div className="space-y-2">
              <input
                {...register('clientName')}
                className={inputClass}
                style={inputStyle}
                placeholder="M. Ahmed Ben Salah"
              />
              {errors.clientName && <p className="text-xs text-[#2F6F4F]">{errors.clientName.message}</p>}
              {clientOptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowFreeText(false)}
                  className="text-xs hover:underline"
                  style={{ color: 'var(--admin-text-muted)' }}
                >
                  ← Utiliser le CRM
                </button>
              )}
            </div>
          )}
        </div>

        <Field label="Email du client" error={errors.clientEmail?.message}>
          <input {...register('clientEmail')} type="email" className={inputClass} style={inputStyle} />
        </Field>

        <Field label="Téléphone" error={errors.clientPhone?.message}>
          <input {...register('clientPhone')} className={inputClass} style={inputStyle} placeholder="+216 XX XXX XXX" />
        </Field>

        <div className="sm:col-span-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register('clientAnonymized')}
              className="mt-0.5 rounded"
            />
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>Anonymiser le nom du client</span>
              <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                Le nom du client sera remplacé par des initiales dans tous les exports et vues liste.
              </p>
            </div>
          </label>
        </div>

        <div className="sm:col-span-2">
          <Field label="Adresse du site" error={errors.siteAddress?.message} required>
            <input {...register('siteAddress')} className={inputClass} style={inputStyle} placeholder="12 rue des Jasmins, La Marsa, Tunis" />
          </Field>
        </div>
      </div>
    </div>
  )
}
